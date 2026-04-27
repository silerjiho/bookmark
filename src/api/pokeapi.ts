import {
  TYPE_KO,
  GENERATION_KO,
  MAX_SPECIES_ID,
  extractId,
  parseRequirement,
  findChildren,
  type PokemonInfo,
  type NextEvolution,
  type EvolutionRequirement,
  type EvolutionNode,
  type SpeciesResponse,
  type PokemonResponse,
} from "../lib/pokemon";

/** PokeAPI에서 한 마리 포켓몬의 종족·이미지·타입·세대를 가져옵니다. */
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

/** 무작위로 기본 진화형 포켓몬 한 마리의 ID를 고릅니다.
 *  전설/환상은 제외하며, 조건 충족 시까지 maxAttempts번 재시도합니다. */
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

/** 현재 포켓몬의 다음 진화 후보들을 가져옵니다. 후보가 없으면 빈 배열. */
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

// 레거시 biology.ts 와의 호환을 위해 남겨둔 한국어→영문 매핑.
const KOREAN_TO_ENGLISH: Record<string, string> = {
  야돈: "slowpoke", 셀러: "shellder", 야도란: "slowbro", 야도킹: "slowking",
  피카츄: "pikachu", 이브이: "eevee",
};

/** 한국어 이름으로 PokeAPI 공식 일러스트 URL을 가져옵니다(레거시 경로 전용). */
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
