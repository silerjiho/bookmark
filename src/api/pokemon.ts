import { getItemName } from "./items";

export interface PokemonData {
  name: string;
  image: string;
}

export const TYPE_KO: Record<string, string> = {
  normal: "노말", fire: "불꽃", water: "물", electric: "전기",
  grass: "풀", ice: "얼음", fighting: "격투", poison: "독",
  ground: "땅", flying: "비행", psychic: "에스퍼", bug: "벌레",
  rock: "바위", ghost: "고스트", dragon: "드래곤", dark: "악",
  steel: "강철", fairy: "페어리",
};

/** Background color per type, keyed by Korean label. */
export const TYPE_COLORS: Record<string, string> = {
  노말: "#9FA19F",
  불꽃: "#E62829",
  물: "#2980EF",
  전기: "#FAC000",
  풀: "#3FA129",
  얼음: "#3DCEF3",
  격투: "#FF8000",
  독: "#9141CB",
  땅: "#915121",
  비행: "#81B9EF",
  에스퍼: "#EF4179",
  벌레: "#91A119",
  바위: "#AFA981",
  고스트: "#704170",
  드래곤: "#5060E1",
  악: "#624D4E",
  강철: "#60A1B8",
  페어리: "#EF70EF",
};

const LIGHT_TYPE_BG = new Set(["전기", "얼음", "비행", "바위", "페어리"]);

/** Returns "#1d1d1f" or "#ffffff" — pick whichever reads on the given type's background. */
export function getTypeTextColor(typeKo: string): string {
  return LIGHT_TYPE_BG.has(typeKo) ? "#1d1d1f" : "#ffffff";
}

export interface PokemonInfo {
  id: number;
  koreanName: string;
  image: string;
  types: string[];
  evolutionChainUrl: string;
  generationLabel: string | null;
}

export const MAX_SPECIES_ID = 1025;

const GENERATION_KO: Record<string, string> = {
  "generation-i": "1세대",
  "generation-ii": "2세대",
  "generation-iii": "3세대",
  "generation-iv": "4세대",
  "generation-v": "5세대",
  "generation-vi": "6세대",
  "generation-vii": "7세대",
  "generation-viii": "8세대",
  "generation-ix": "9세대",
};

interface SpeciesResponse {
  names: { language: { name: string }; name: string }[];
  evolution_chain: { url: string };
  evolves_from_species: { name: string } | null;
  generation: { name: string };
  is_legendary: boolean;
  is_mythical: boolean;
}

interface PokemonResponse {
  sprites: {
    front_default: string | null;
    other: { "official-artwork": { front_default: string | null } };
  };
  types: { type: { name: string } }[];
}

export async function getPokemonInfo(pokemonId: number): Promise<PokemonInfo> {
  const [pokemonRes, speciesRes] = await Promise.all([
    fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`),
    fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemonId}`),
  ]);
  if (!pokemonRes.ok || !speciesRes.ok) {
    throw new Error(`Failed to fetch Pokemon info for ID ${pokemonId}`);
  }
  const pokemon: PokemonResponse = await pokemonRes.json();
  const species: SpeciesResponse = await speciesRes.json();

  const koreanName =
    species.names.find((n) => n.language.name === "ko")?.name ||
    String(pokemonId);
  const image =
    pokemon.sprites.other["official-artwork"].front_default ||
    pokemon.sprites.front_default ||
    "";
  const types: string[] = pokemon.types.map(
    (t) => TYPE_KO[t.type.name] || t.type.name,
  );

  return {
    id: pokemonId,
    koreanName,
    image,
    types,
    evolutionChainUrl: species.evolution_chain.url,
    generationLabel: GENERATION_KO[species.generation.name] ?? null,
  };
}

/** Pick a random base-form pokemon ID. Excludes legendary and mythical species. Retries up to maxAttempts. */
export async function pickRandomBaseFormId(maxAttempts = 20): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const id = Math.floor(Math.random() * MAX_SPECIES_ID) + 1;
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
    if (!res.ok) continue;
    const species: SpeciesResponse = await res.json();
    if (species.evolves_from_species != null) continue;
    if (species.is_legendary || species.is_mythical) continue;
    return id;
  }
  throw new Error("Failed to find a base-form pokemon after retries");
}

interface EvolutionDetailRaw {
  min_level: number | null;
  min_happiness: number | null;
  trigger: { name: string };
  item: { name: string; url: string } | null;
  held_item: { name: string; url: string } | null;
}

interface EvolutionNode {
  species: { url: string; name: string };
  evolution_details: EvolutionDetailRaw[];
  evolves_to: EvolutionNode[];
}

export type EvolutionRequirement =
  | { kind: "level"; minLevel: number }
  | { kind: "friendship" }
  | { kind: "item"; itemKey: string; itemName: string }
  | { kind: "unsupported"; trigger: string };

export interface NextEvolution {
  pokemonId: number;
  koreanName: string;
  image: string;
  types: string[];
  evolutionChainUrl: string;
  requirement: EvolutionRequirement;
}

function extractId(url: string): number {
  return parseInt(url.split("/").filter(Boolean).pop()!);
}

function parseRequirement(detail: EvolutionDetailRaw): EvolutionRequirement {
  if (detail.trigger.name === "level-up") {
    if (detail.min_happiness != null) return { kind: "friendship" };
    if (detail.held_item != null) {
      return {
        kind: "item",
        itemKey: detail.held_item.name,
        itemName: getItemName(detail.held_item.name),
      };
    }
    if (detail.min_level != null) return { kind: "level", minLevel: detail.min_level };
    return { kind: "level", minLevel: 1 };
  }
  if (detail.trigger.name === "use-item" && detail.item) {
    return {
      kind: "item",
      itemKey: detail.item.name,
      itemName: getItemName(detail.item.name),
    };
  }
  // Trade evolutions (often with a held item) are surfaced as a held-item requirement
  // since this game has no trade mechanic — the user can just equip the item.
  if (detail.trigger.name === "trade" && detail.held_item) {
    return {
      kind: "item",
      itemKey: detail.held_item.name,
      itemName: getItemName(detail.held_item.name),
    };
  }
  return { kind: "unsupported", trigger: detail.trigger.name };
}

function findChildren(node: EvolutionNode, targetId: number): EvolutionNode[] | null {
  if (extractId(node.species.url) === targetId) return node.evolves_to;
  for (const child of node.evolves_to) {
    const found = findChildren(child, targetId);
    if (found) return found;
  }
  return null;
}

export async function getNextEvolutions(
  currentPokemonId: number,
  evolutionChainUrl: string,
): Promise<NextEvolution[]> {
  try {
    const res = await fetch(evolutionChainUrl);
    if (!res.ok) return [];
    const data: { chain: EvolutionNode } = await res.json();
    const children = findChildren(data.chain, currentPokemonId);
    if (!children || children.length === 0) return [];

    return Promise.all(
      children.map(async (child) => {
        const childId = extractId(child.species.url);
        const info = await getPokemonInfo(childId);
        const detail = child.evolution_details[0];
        const requirement: EvolutionRequirement = detail
          ? parseRequirement(detail)
          : { kind: "unsupported", trigger: "unknown" };
        return {
          pokemonId: childId,
          koreanName: info.koreanName,
          image: info.image,
          types: info.types,
          evolutionChainUrl: info.evolutionChainUrl,
          requirement,
        };
      }),
    );
  } catch {
    return [];
  }
}

// kept for backward compatibility with biology.ts
const KOREAN_TO_ENGLISH: Record<string, string> = {
  야돈: "slowpoke", 셀러: "shellder", 야도란: "slowbro", 야도킹: "slowking",
  피카츄: "pikachu", 이브이: "eevee",
};

export async function getImage(name: string): Promise<string> {
  try {
    const englishName = KOREAN_TO_ENGLISH[name] || name;
    const response = await fetch(
      `https://pokeapi.co/api/v2/pokemon/${englishName.toLowerCase()}`,
    );
    if (!response.ok) return "";
    const data = await response.json();
    return (
      data.sprites.other["official-artwork"].front_default ||
      data.sprites.front_default ||
      ""
    );
  } catch {
    return "";
  }
}
