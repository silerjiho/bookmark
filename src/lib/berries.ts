/** 먹이로 줄 수 있는 나무열매 한 종류의 정의. */
export interface Berry {
  key: "oran" | "sitrus" | "pecha";
  name: string;
  image: string;
  levelGain: number;
}

const BERRY_NAMES: Record<Berry["key"], string> = {
  oran: "오랭열매",
  sitrus: "자뭉열매",
  pecha: "복슝열매",
};

const BERRY_IMAGES: Record<Berry["key"], string> = {
  oran: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/oran-berry.png",
  sitrus:
    "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/sitrus-berry.png",
  pecha:
    "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/pecha-berry.png",
};

const BERRY_KEYS: Berry["key"][] = ["oran", "sitrus", "pecha"];

const PERMUTATIONS: number[][] = [
  [3, 5, 10],
  [3, 10, 5],
  [5, 3, 10],
  [5, 10, 3],
  [10, 3, 5],
  [10, 5, 3],
];

/** 포켓몬 종족 ID에 따라 세 열매의 레벨 상승치를 결정합니다. */
export function getBerryPlan(pokemonId: number): Berry[] {
  const perm = PERMUTATIONS[pokemonId % PERMUTATIONS.length];
  return BERRY_KEYS.map((key, i) => ({
    key,
    name: BERRY_NAMES[key],
    image: BERRY_IMAGES[key],
    levelGain: perm[i],
  }));
}
