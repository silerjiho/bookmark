export interface Berry {
  key: "oran" | "sitrus" | "pecha";
  name: string;
  levelGain: number;
}

const BERRY_NAMES: Record<Berry["key"], string> = {
  oran: "오랭열매",
  sitrus: "자뭉열매",
  pecha: "유류열매",
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

export function getBerryPlan(pokemonId: number): Berry[] {
  const perm = PERMUTATIONS[pokemonId % PERMUTATIONS.length];
  return BERRY_KEYS.map((key, i) => ({
    key,
    name: BERRY_NAMES[key],
    levelGain: perm[i],
  }));
}
