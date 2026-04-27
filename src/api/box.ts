import {
  readIssues,
  parseBody,
  createIssue,
  updateIssue,
  closeIssue,
  ensureLabel,
  ensureMilestone,
  updateIssueMilestone,
  createIssueComment,
} from "./github";
import {
  getPokemonInfo,
  pickRandomBaseFormId,
  type NextEvolution,
} from "./pokemon";
import type { Berry } from "./berries";
import { type ShopItem } from "./items";

export interface MyPokemon {
  issueNumber: number;
  uniqueId: string;
  pokemonId: number;
  name: string;
  nickname: string;
  level: number;
  friendship: number;
  points: number;
  heldItem: string | null;
  image: string;
  types: string[];
  evolutionChainUrl: string;
  caughtAt: string;
  lastTickAt: string;
}

export const MAX_LEVEL = 100;
export const MAX_FRIENDSHIP = 5;
export const POINTS_PER_LEVEL_UP = 50;
export const POINTS_PER_HOUR = 10;

interface StoredBody {
  uniqueId: string;
  pokemonId: number;
  nickname: string;
  level: number;
  friendship: number;
  points: number;
  heldItem: string | null;
  caughtAt: string;
  lastTickAt: string;
}

function serializeBody(data: StoredBody): string {
  return `\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
}

function toStored(p: MyPokemon): StoredBody {
  return {
    uniqueId: p.uniqueId,
    pokemonId: p.pokemonId,
    nickname: p.nickname,
    level: p.level,
    friendship: p.friendship,
    points: p.points,
    heldItem: p.heldItem,
    caughtAt: p.caughtAt,
    lastTickAt: p.lastTickAt,
  };
}

function elapsedHours(fromIso: string, toIso: string): number {
  return (Date.parse(toIso) - Date.parse(fromIso)) / 3_600_000;
}

export function tickPokemon(
  p: MyPokemon,
  now = new Date().toISOString(),
): MyPokemon {
  const hours = Math.max(0, elapsedHours(p.lastTickAt, now));
  const gained = Math.floor(hours * POINTS_PER_HOUR);
  if (gained <= 0) return p;
  return { ...p, points: p.points + gained, lastTickAt: now };
}

export async function readBox(): Promise<MyPokemon[]> {
  const issues = await readIssues();

  const results = await Promise.all(
    issues.map(async (issue) => {
      try {
        const raw = parseBody(issue.body || "");
        if (!raw.pokemonId) return null;

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

  return results.filter((p): p is MyPokemon => p !== null);
}

export async function catchPokemon(): Promise<MyPokemon> {
  const pokemonId = await pickRandomBaseFormId();
  const info = await getPokemonInfo(pokemonId);
  const uniqueId = `caught-${Date.now()}`;
  const nowIso = new Date().toISOString();
  const primaryType = info.types[0];

  const [, milestoneNumber] = await Promise.all([
    info.generationLabel
      ? ensureLabel(info.generationLabel)
      : Promise.resolve(),
    primaryType ? ensureMilestone(primaryType) : Promise.resolve(undefined),
  ]);

  const stored: StoredBody = {
    uniqueId,
    pokemonId,
    nickname: info.koreanName,
    level: 1,
    friendship: 0,
    points: 0,
    heldItem: null,
    caughtAt: nowIso,
    lastTickAt: nowIso,
  };

  const issue = await createIssue({
    title: `[포켓몬박스] ${info.koreanName}`,
    body: serializeBody(stored),
    labels: info.generationLabel ? [info.generationLabel] : undefined,
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

async function persist(p: MyPokemon): Promise<MyPokemon> {
  await updateIssue(p.issueNumber, serializeBody(toStored(p)));
  return p;
}

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

export async function unequipItem(pokemon: MyPokemon): Promise<MyPokemon> {
  if (!pokemon.heldItem) return pokemon;
  const ticked = tickPokemon(pokemon);
  const updated: MyPokemon = { ...ticked, heldItem: null };
  return persist(updated);
}

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

  const oldPrimary = pokemon.types[0];
  const newPrimary = next.types[0];
  const typeChanged = newPrimary && newPrimary !== oldPrimary;
  const milestoneNumber = typeChanged
    ? await ensureMilestone(newPrimary)
    : null;

  await Promise.all([
    persist(updated),
    milestoneNumber != null
      ? updateIssueMilestone(pokemon.issueNumber, milestoneNumber)
      : Promise.resolve(),
    createIssueComment(
      pokemon.issueNumber,
      `${pokemon.nickname}는 ${next.koreanName}로 진화했다!`,
    ),
  ]);
  return updated;
}

export async function releasePokemon(issueNumber: number): Promise<void> {
  await closeIssue(issueNumber);
}

export { type Berry } from "./berries";
export { getBerryPlan } from "./berries";
export { ITEMS, getItem, getItemName, type ShopItem } from "./items";
