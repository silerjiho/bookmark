export interface ShopItem {
  key: string;
  name: string;
  price: number;
}

export const ITEM_PRICE = 100;

export const ITEMS: ShopItem[] = [
  { key: "fire-stone", name: "불꽃의돌", price: ITEM_PRICE },
  { key: "water-stone", name: "물의돌", price: ITEM_PRICE },
  { key: "thunder-stone", name: "천둥의돌", price: ITEM_PRICE },
  { key: "leaf-stone", name: "리프의돌", price: ITEM_PRICE },
  { key: "moon-stone", name: "달의돌", price: ITEM_PRICE },
  { key: "sun-stone", name: "태양의돌", price: ITEM_PRICE },
  { key: "shiny-stone", name: "빛의돌", price: ITEM_PRICE },
  { key: "dusk-stone", name: "어둠의돌", price: ITEM_PRICE },
  { key: "dawn-stone", name: "각성의돌", price: ITEM_PRICE },
  { key: "ice-stone", name: "얼음의돌", price: ITEM_PRICE },
];

const ITEM_BY_KEY = new Map(ITEMS.map((it) => [it.key, it]));

export function getItem(key: string): ShopItem | undefined {
  return ITEM_BY_KEY.get(key);
}

export function getItemName(key: string): string {
  return ITEM_BY_KEY.get(key)?.name ?? key;
}
