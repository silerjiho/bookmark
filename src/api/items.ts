export interface ShopItem {
  key: string;
  name: string;
  price: number;
}

export const ITEM_PRICE = 100;

/** All items that trigger an evolution in PokeAPI evolution chains.
 *  Keys correspond to PokeAPI item identifiers; names are Korean labels.
 *  Triggers covered: `use-item`, `trade` (with held_item), `level-up` (with held_item). */
export const ITEMS: ShopItem[] = [
  // 진화의 돌 (use-item)
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

  // 통신교환 대용 (trade trigger / linking-cord)
  { key: "linking-cord", name: "연결의끈", price: ITEM_PRICE },

  // 통신교환 + 지참물 (trade with held_item)
  { key: "metal-coat", name: "금속코트", price: ITEM_PRICE },
  { key: "dragon-scale", name: "용의비늘", price: ITEM_PRICE },
  { key: "kings-rock", name: "왕의징표석", price: ITEM_PRICE },
  { key: "up-grade", name: "업그레이드", price: ITEM_PRICE },
  { key: "dubious-disc", name: "수상한디스크", price: ITEM_PRICE },
  { key: "reaper-cloth", name: "영혼의천", price: ITEM_PRICE },
  { key: "electirizer", name: "에레키부스터", price: ITEM_PRICE },
  { key: "magmarizer", name: "마그마부스터", price: ITEM_PRICE },
  { key: "protector", name: "프로텍터", price: ITEM_PRICE },
  { key: "prism-scale", name: "예쁜비늘", price: ITEM_PRICE },
  { key: "deep-sea-tooth", name: "심해의이빨", price: ITEM_PRICE },
  { key: "deep-sea-scale", name: "심해의비늘", price: ITEM_PRICE },

  // 지참 + 레벨업 (level-up with held_item)
  { key: "oval-stone", name: "동그란돌", price: ITEM_PRICE },
  { key: "razor-claw", name: "예리한손톱", price: ITEM_PRICE },
  { key: "razor-fang", name: "예리한이빨", price: ITEM_PRICE },

  // 6세대 이상 (use-item)
  { key: "whipped-dream", name: "휘핑팝", price: ITEM_PRICE },
  { key: "sachet", name: "향기주머니", price: ITEM_PRICE },

  // 8세대 이상 (use-item)
  { key: "sweet-apple", name: "달콤한사과", price: ITEM_PRICE },
  { key: "tart-apple", name: "새콤한사과", price: ITEM_PRICE },
  { key: "cracked-pot", name: "깨진포트", price: ITEM_PRICE },
  { key: "chipped-pot", name: "이가빠진포트", price: ITEM_PRICE },
  { key: "galarica-cuff", name: "가라두구열매장식", price: ITEM_PRICE },
  { key: "galarica-wreath", name: "가라두구열매화관", price: ITEM_PRICE },
  { key: "black-augurite", name: "검은휘석", price: ITEM_PRICE },
  { key: "peat-block", name: "이탄덩어리", price: ITEM_PRICE },
  { key: "auspicious-armor", name: "행운의갑옷", price: ITEM_PRICE },
  { key: "malicious-armor", name: "재앙의갑옷", price: ITEM_PRICE },
  { key: "syrupy-apple", name: "꿀맛사과", price: ITEM_PRICE },
  { key: "unremarkable-teacup", name: "평범한찻잔", price: ITEM_PRICE },
  { key: "masterpiece-teacup", name: "걸작찻잔", price: ITEM_PRICE },
  { key: "metal-alloy", name: "복합금속", price: ITEM_PRICE },
  { key: "scroll-of-darkness", name: "어둠의족자", price: ITEM_PRICE },
  { key: "scroll-of-waters", name: "물의족자", price: ITEM_PRICE },
];

const ITEM_BY_KEY = new Map(ITEMS.map((it) => [it.key, it]));

export function getItem(key: string): ShopItem | undefined {
  return ITEM_BY_KEY.get(key);
}

export function getItemName(key: string): string {
  return ITEM_BY_KEY.get(key)?.name ?? key;
}
