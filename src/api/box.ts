import { readIssues, parseBody, createIssue, updateIssue, closeIssue } from "./github";
import { getPokemonInfo, type NextEvolution } from "./pokemon";

export interface MyPokemon {
  issueNumber: number;
  uniqueId: string;
  pokemonId: number;
  name: string;
  nickname: string;
  level: number;
  exp: number;
  image: string;
  types: string[];
  growthRate: string;
  evolutionChainUrl: string;
  caughtAt: string;
}

export interface Berry {
  id: number;
  name: string;
  exp: number;
}

export const BERRIES: Berry[] = [
  { id: 1, name: "체리열매", exp: 50 },
  { id: 7, name: "오란열매", exp: 100 },
  { id: 10, name: "시트라열매", exp: 200 },
];

export function calcLevel(exp: number): number {
  return Math.max(1, Math.floor(exp / 100) + 1);
}

export function calcExpProgress(exp: number): { current: number; needed: number; percent: number } {
  const level = calcLevel(exp);
  const baseExp = (level - 1) * 100;
  const current = exp - baseExp;
  return { current, needed: 100, percent: Math.floor((current / 100) * 100) };
}

function serializeBody(data: {
  uniqueId: string;
  pokemonId: number;
  nickname: string;
  level: number;
  exp: number;
  caughtAt: string;
}): string {
  return `\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
}

export async function readBox(): Promise<MyPokemon[]> {
  const issues = await readIssues();

  const results = await Promise.all(
    issues.map(async (issue: { number: number; body: string }) => {
      try {
        const raw = parseBody(issue.body || "");
        if (!raw.pokemonId) return null;

        const info = await getPokemonInfo(raw.pokemonId);
        const exp = raw.exp ?? 0;

        return {
          issueNumber: issue.number,
          uniqueId: raw.uniqueId,
          pokemonId: raw.pokemonId,
          name: info.koreanName,
          nickname: raw.nickname || info.koreanName,
          level: calcLevel(exp),
          exp,
          image: info.image,
          types: info.types,
          growthRate: info.growthRate,
          evolutionChainUrl: info.evolutionChainUrl,
          caughtAt: raw.caughtAt,
        } satisfies MyPokemon;
      } catch (e) {
        console.error(`Failed to process issue #${issue.number}`, e);
        return null;
      }
    }),
  );

  return results.filter((p): p is MyPokemon => p !== null);
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function catchPokemon(): Promise<MyPokemon> {
  const pokemonId = Math.floor(Math.random() * 151) + 1;
  const info = await getPokemonInfo(pokemonId);
  const uniqueId = `caught-${Date.now()}`;
  const caughtAt = new Date().toISOString();

  const stored = { uniqueId, pokemonId, nickname: info.koreanName, level: 1, exp: 0, caughtAt };
  await delay(1000);
  const issue = await createIssue(`[포켓몬박스] ${info.koreanName}`, serializeBody(stored));

  return {
    issueNumber: issue.number,
    uniqueId,
    pokemonId,
    name: info.koreanName,
    nickname: info.koreanName,
    level: 1,
    exp: 0,
    image: info.image,
    types: info.types,
    growthRate: info.growthRate,
    evolutionChainUrl: info.evolutionChainUrl,
    caughtAt,
  };
}

export async function feedBerry(pokemon: MyPokemon, berry: Berry): Promise<MyPokemon> {
  const newExp = pokemon.exp + berry.exp;
  const newLevel = calcLevel(newExp);
  const stored = {
    uniqueId: pokemon.uniqueId,
    pokemonId: pokemon.pokemonId,
    nickname: pokemon.nickname,
    level: newLevel,
    exp: newExp,
    caughtAt: pokemon.caughtAt,
  };
  await updateIssue(pokemon.issueNumber, serializeBody(stored));
  return { ...pokemon, exp: newExp, level: newLevel };
}

export async function evolvePokemon(pokemon: MyPokemon, next: NextEvolution): Promise<MyPokemon> {
  const stored = {
    uniqueId: pokemon.uniqueId,
    pokemonId: next.pokemonId,
    nickname: pokemon.nickname,
    level: pokemon.level,
    exp: pokemon.exp,
    caughtAt: pokemon.caughtAt,
  };
  await updateIssue(pokemon.issueNumber, serializeBody(stored));
  return {
    ...pokemon,
    pokemonId: next.pokemonId,
    name: next.koreanName,
    image: next.image,
    types: next.types,
    growthRate: next.growthRate,
    evolutionChainUrl: next.evolutionChainUrl,
  };
}

export async function releasePokemon(issueNumber: number): Promise<void> {
  await closeIssue(issueNumber);
}
