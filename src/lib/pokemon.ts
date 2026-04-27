import { getItemName } from "./items";

/** 도감 외부에서 쓰이는 가벼운 포켓몬 표현. */
export interface PokemonData {
  name: string;
  image: string;
}

/** PokeAPI 영문 타입명 → 한국어 라벨. */
export const TYPE_KO: Record<string, string> = {
  normal: "노말", fire: "불꽃", water: "물", electric: "전기",
  grass: "풀", ice: "얼음", fighting: "격투", poison: "독",
  ground: "땅", flying: "비행", psychic: "에스퍼", bug: "벌레",
  rock: "바위", ghost: "고스트", dragon: "드래곤", dark: "악",
  steel: "강철", fairy: "페어리",
};

/** 한국어 타입명 → 배경 색상. */
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

/** 타입 칩 위에 얹힐 글자 색을 배경 명도에 맞춰 고릅니다. */
export function getTypeTextColor(typeKo: string): string {
  return LIGHT_TYPE_BG.has(typeKo) ? "#1d1d1f" : "#ffffff";
}

/** 종 정보 + 이미지/타입까지 합쳐진 한 마리 단위의 메타데이터. */
export interface PokemonInfo {
  id: number;
  koreanName: string;
  image: string;
  types: string[];
  evolutionChainUrl: string;
  generationLabel: string | null;
}

export const MAX_SPECIES_ID = 1025;

/** PokeAPI 세대 식별자 → 한국어 라벨. */
export const GENERATION_KO: Record<string, string> = {
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

/** 진화 트리거를 앱이 다룰 수 있는 형태로 정규화한 결과. */
export type EvolutionRequirement =
  | { kind: "level"; minLevel: number }
  | { kind: "friendship" }
  | { kind: "item"; itemKey: string; itemName: string }
  | { kind: "unsupported"; trigger: string };

/** 다음 진화 후보 한 건. */
export interface NextEvolution {
  pokemonId: number;
  koreanName: string;
  image: string;
  types: string[];
  evolutionChainUrl: string;
  requirement: EvolutionRequirement;
}

export interface EvolutionDetailRaw {
  min_level: number | null;
  min_happiness: number | null;
  trigger: { name: string };
  item: { name: string; url: string } | null;
  held_item: { name: string; url: string } | null;
}

export interface EvolutionNode {
  species: { url: string; name: string };
  evolution_details: EvolutionDetailRaw[];
  evolves_to: EvolutionNode[];
}

export interface SpeciesResponse {
  names: { language: { name: string }; name: string }[];
  evolution_chain: { url: string };
  evolves_from_species: { name: string } | null;
  generation: { name: string };
  is_legendary: boolean;
  is_mythical: boolean;
}

export interface PokemonResponse {
  sprites: {
    front_default: string | null;
    other: { "official-artwork": { front_default: string | null } };
  };
  types: { type: { name: string } }[];
}

/** PokeAPI URL 끝의 숫자 ID를 떼어옵니다. */
export function extractId(url: string): number {
  return parseInt(url.split("/").filter(Boolean).pop()!);
}

/** 진화 디테일 한 건을 앱 도메인의 EvolutionRequirement로 변환합니다. */
export function parseRequirement(
  detail: EvolutionDetailRaw,
): EvolutionRequirement {
  if (detail.trigger.name === "level-up") {
    if (detail.min_happiness != null) return { kind: "friendship" };
    if (detail.held_item != null) {
      return {
        kind: "item",
        itemKey: detail.held_item.name,
        itemName: getItemName(detail.held_item.name),
      };
    }
    if (detail.min_level != null)
      return { kind: "level", minLevel: detail.min_level };
    return { kind: "level", minLevel: 1 };
  }
  if (detail.trigger.name === "use-item" && detail.item) {
    return {
      kind: "item",
      itemKey: detail.item.name,
      itemName: getItemName(detail.item.name),
    };
  }
  // 통신교환 진화는 이 게임에 통신 시스템이 없어, 지참물을 장착하는 형태로 대체합니다.
  if (detail.trigger.name === "trade" && detail.held_item) {
    return {
      kind: "item",
      itemKey: detail.held_item.name,
      itemName: getItemName(detail.held_item.name),
    };
  }
  return { kind: "unsupported", trigger: detail.trigger.name };
}

/** 진화 체인 트리에서 현재 ID에 해당하는 노드의 자식들을 찾습니다. */
export function findChildren(
  node: EvolutionNode,
  targetId: number,
): EvolutionNode[] | null {
  if (extractId(node.species.url) === targetId) return node.evolves_to;
  for (const child of node.evolves_to) {
    const found = findChildren(child, targetId);
    if (found) return found;
  }
  return null;
}
