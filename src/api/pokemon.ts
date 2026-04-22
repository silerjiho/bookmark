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

export interface PokemonInfo {
  id: number;
  koreanName: string;
  image: string;
  types: string[];
  growthRate: string;
  evolutionChainUrl: string;
}

export async function getPokemonInfo(pokemonId: number): Promise<PokemonInfo> {
  const [pokemonRes, speciesRes] = await Promise.all([
    fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`),
    fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemonId}`),
  ]);
  if (!pokemonRes.ok || !speciesRes.ok) {
    throw new Error(`Failed to fetch Pokemon info for ID ${pokemonId}`);
  }
  const pokemon = await pokemonRes.json();
  const species = await speciesRes.json();

  const koreanName =
    species.names.find((n: { language: { name: string }; name: string }) => n.language.name === "ko")?.name ||
    pokemon.name;
  const image =
    pokemon.sprites.other["official-artwork"].front_default ||
    pokemon.sprites.front_default ||
    "";
  const types: string[] = pokemon.types.map(
    (t: { type: { name: string } }) => TYPE_KO[t.type.name] || t.type.name,
  );

  return {
    id: pokemonId,
    koreanName,
    image,
    types,
    growthRate: species.growth_rate.name,
    evolutionChainUrl: species.evolution_chain.url,
  };
}

interface EvolutionNode {
  species: { url: string };
  evolution_details: Array<{ min_level: number | null; trigger: { name: string } }>;
  evolves_to: EvolutionNode[];
}

function extractId(url: string): number {
  return parseInt(url.split("/").filter(Boolean).pop()!);
}

function findNext(
  node: EvolutionNode,
  targetId: number,
): { id: number; minLevel: number | null } | null {
  if (extractId(node.species.url) === targetId) {
    if (node.evolves_to.length === 0) return null;
    const next = node.evolves_to[0];
    const detail = next.evolution_details[0];
    if (!detail || detail.trigger.name !== "level-up") return null;
    return { id: extractId(next.species.url), minLevel: detail.min_level };
  }
  for (const child of node.evolves_to) {
    const result = findNext(child, targetId);
    if (result) return result;
  }
  return null;
}

export interface NextEvolution {
  pokemonId: number;
  koreanName: string;
  image: string;
  types: string[];
  growthRate: string;
  evolutionChainUrl: string;
  minLevel: number | null;
}

export async function getNextEvolution(
  currentPokemonId: number,
  evolutionChainUrl: string,
): Promise<NextEvolution | null> {
  try {
    const res = await fetch(evolutionChainUrl);
    if (!res.ok) return null;
    const data = await res.json();
    const next = findNext(data.chain, currentPokemonId);
    if (!next) return null;
    const info = await getPokemonInfo(next.id);
    return {
      pokemonId: next.id,
      koreanName: info.koreanName,
      image: info.image,
      types: info.types,
      growthRate: info.growthRate,
      evolutionChainUrl: info.evolutionChainUrl,
      minLevel: next.minLevel,
    };
  } catch {
    return null;
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
