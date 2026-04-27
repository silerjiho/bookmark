import {
  readIssues,
  createIssue,
  updateIssue,
  updateIssueTitle,
  closeIssue,
  ensureLabel,
  ensureMilestone,
  updateIssueLabels,
  createIssueComment,
} from "./github.api";
import { getPokemonInfo, pickRandomBaseFormId } from "./pokeapi.api";
import {
  MAX_LEVEL,
  MAX_FRIENDSHIP,
  POINTS_PER_LEVEL_UP,
  parseStoredBody,
  serializeBody,
  toView,
  tickPokemon,
  type MyPokemon,
  type PersistedView,
} from "../lib/box";
import type { NextEvolution } from "../lib/pokemon";
import type { Berry } from "../lib/berries";
import type { ShopItem } from "../lib/items";

/** 박스(=열린 이슈) 전체를 가져와 MyPokemon 배열로 만듭니다. */
export async function readBox(): Promise<MyPokemon[]> {
  const issues = await readIssues();

  const results = await Promise.all(
    issues.map(async (issue) => {
      try {
        const raw = parseStoredBody(issue.body || "");
        if (!raw || !raw.pokemonId) return null;

        const info = await getPokemonInfo(raw.pokemonId);
        const caughtAt: string = raw.caughtAt ?? new Date().toISOString();

        const base: MyPokemon = {
          issueNumber: issue.number,
          uniqueId: raw.uniqueId,
          pokemonId: raw.pokemonId,
          name: info.koreanName,
          nickname: raw.nickname || info.koreanName,
          level: Math.min(MAX_LEVEL, raw.level ?? 1),
          friendship: raw.friendship ?? 0,
          points: raw.points ?? 0,
          heldItem: raw.heldItem ?? null,
          image: info.image,
          types: info.types,
          evolutionChainUrl: info.evolutionChainUrl,
          caughtAt,
          lastTickAt: raw.lastTickAt ?? caughtAt,
        };

        return tickPokemon(base);
      } catch (e) {
        console.error(`Failed to process issue #${issue.number}`, e);
        return null;
      }
    }),
  );

  return results.filter((p: MyPokemon | null): p is MyPokemon => p !== null);
}

/** 새 포켓몬을 받아 이슈로 등록합니다.
 *  타입은 라벨로(복수 가능), 세대는 마일스톤으로(단수) 매핑됩니다. */
export async function catchPokemon(): Promise<MyPokemon> {
  const pokemonId = await pickRandomBaseFormId();
  const info = await getPokemonInfo(pokemonId);
  const uniqueId = `caught-${Date.now()}`;
  const nowIso = new Date().toISOString();

  const [, milestoneNumber] = await Promise.all([
    Promise.all(info.types.map((t: string) => ensureLabel(t))),
    info.generationLabel
      ? ensureMilestone(info.generationLabel)
      : Promise.resolve(undefined),
  ]);

  const view: PersistedView = {
    uniqueId,
    pokemonId,
    nickname: info.koreanName,
    level: 1,
    friendship: 0,
    points: 0,
    heldItem: null,
    caughtAt: nowIso,
    lastTickAt: nowIso,
    speciesName: info.koreanName,
    image: info.image,
  };

  const issue = await createIssue({
    title: info.koreanName,
    body: serializeBody(view),
    labels: info.types.length > 0 ? info.types : undefined,
    milestone: milestoneNumber ?? undefined,
  });

  return {
    issueNumber: issue.number,
    uniqueId,
    pokemonId,
    name: info.koreanName,
    nickname: info.koreanName,
    level: 1,
    friendship: 0,
    points: 0,
    heldItem: null,
    image: info.image,
    types: info.types,
    evolutionChainUrl: info.evolutionChainUrl,
    caughtAt: nowIso,
    lastTickAt: nowIso,
  };
}

/** 변경된 MyPokemon을 이슈 본문에 다시 써 넣습니다. */
async function persist(p: MyPokemon): Promise<MyPokemon> {
  await updateIssue(p.issueNumber, serializeBody(toView(p)));
  return p;
}

/** 닉네임을 변경합니다. 본문과 이슈 제목을 함께 갱신합니다. */
export async function renameNickname(
  pokemon: MyPokemon,
  rawNickname: string,
): Promise<MyPokemon> {
  const nickname = rawNickname.trim();
  if (!nickname) throw new Error("닉네임을 입력해주세요");
  if (nickname === pokemon.nickname) return pokemon;
  const ticked = tickPokemon(pokemon);
  const updated: MyPokemon = { ...ticked, nickname };
  await Promise.all([
    updateIssue(pokemon.issueNumber, serializeBody(toView(updated))),
    updateIssueTitle(pokemon.issueNumber, nickname),
  ]);
  return updated;
}

/** 나무열매를 먹여 레벨을 올립니다. 오른 레벨만큼 포인트도 함께 적립됩니다. */
export async function feedBerry(
  pokemon: MyPokemon,
  berry: Berry,
): Promise<MyPokemon> {
  const ticked = tickPokemon(pokemon);
  const newLevel = Math.min(MAX_LEVEL, ticked.level + berry.levelGain);
  const gained = newLevel - ticked.level;
  const updated: MyPokemon = {
    ...ticked,
    level: newLevel,
    points: ticked.points + gained * POINTS_PER_LEVEL_UP,
  };
  return persist(updated);
}

/** 놀아주기 — 친밀도를 1 올립니다. MAX에 처음 도달하면 코멘트로 축하합니다. */
export async function playWith(pokemon: MyPokemon): Promise<MyPokemon> {
  if (pokemon.friendship >= MAX_FRIENDSHIP) return pokemon;
  const ticked = tickPokemon(pokemon);
  const newFriendship = Math.min(MAX_FRIENDSHIP, ticked.friendship + 1);
  const updated: MyPokemon = { ...ticked, friendship: newFriendship };
  const reachedMax =
    pokemon.friendship < MAX_FRIENDSHIP && newFriendship === MAX_FRIENDSHIP;

  await Promise.all([
    persist(updated),
    reachedMax
      ? createIssueComment(
          pokemon.issueNumber,
          `${pokemon.nickname}는 트레이너와 아주 친해졌다!`,
        )
      : Promise.resolve(),
  ]);
  return updated;
}

/** 도구를 구매해 즉시 장착합니다. 포인트가 부족하면 에러를 던집니다. */
export async function buyItem(
  pokemon: MyPokemon,
  item: ShopItem,
): Promise<MyPokemon> {
  const ticked = tickPokemon(pokemon);
  if (ticked.points < item.price) {
    throw new Error("포인트가 부족합니다");
  }
  const updated: MyPokemon = {
    ...ticked,
    points: ticked.points - item.price,
    heldItem: item.key,
  };
  return persist(updated);
}

/** 장착 중인 도구를 해제합니다. */
export async function unequipItem(pokemon: MyPokemon): Promise<MyPokemon> {
  if (!pokemon.heldItem) return pokemon;
  const ticked = tickPokemon(pokemon);
  const updated: MyPokemon = { ...ticked, heldItem: null };
  return persist(updated);
}

/** 진화시킵니다. 타입이 바뀌었다면 이슈 라벨도 새 타입으로 교체합니다. */
export async function evolvePokemon(
  pokemon: MyPokemon,
  next: NextEvolution,
): Promise<MyPokemon> {
  const ticked = tickPokemon(pokemon);
  const consumeItem =
    next.requirement.kind === "item" &&
    pokemon.heldItem === next.requirement.itemKey;

  const newInfo = {
    pokemonId: next.pokemonId,
    name: next.koreanName,
    image: next.image,
    types: next.types,
    evolutionChainUrl: next.evolutionChainUrl,
  };

  const updated: MyPokemon = {
    ...ticked,
    ...newInfo,
    heldItem: consumeItem ? null : ticked.heldItem,
  };

  const typesChanged =
    pokemon.types.length !== next.types.length ||
    pokemon.types.some((t: string, i: number) => t !== next.types[i]);

  await Promise.all([
    persist(updated),
    typesChanged
      ? Promise.all(next.types.map((t) => ensureLabel(t))).then(() =>
          updateIssueLabels(pokemon.issueNumber, next.types),
        )
      : Promise.resolve(),
    createIssueComment(
      pokemon.issueNumber,
      `${pokemon.nickname}는 ${next.koreanName}로 진화했다!`,
    ),
  ]);
  return updated;
}

/** 포켓몬을 놓아줍니다(이슈를 닫습니다). */
export async function releasePokemon(issueNumber: number): Promise<void> {
  await closeIssue(issueNumber);
}
