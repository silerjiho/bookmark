import { getItemName } from "./items";

/** 박스에 보관 중인 한 마리의 포켓몬을 표현합니다. */
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

/** 이슈 본문에 직렬화되는 영속 데이터 — 표현용 필드는 빠져 있습니다. */
export interface StoredBody {
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

/** 본문 마크다운에 함께 렌더링하는 표현용 정보까지 포함한 뷰. */
export interface PersistedView extends StoredBody {
  speciesName: string;
  image: string;
}

/** 마지막 갱신 이후 흐른 시간(시간 단위)을 계산합니다. */
function elapsedHours(fromIso: string, toIso: string): number {
  return (Date.parse(toIso) - Date.parse(fromIso)) / 3_600_000;
}

/** 시간 경과만큼 포인트를 적립하고 lastTickAt을 갱신합니다. */
export function tickPokemon(
  p: MyPokemon,
  now = new Date().toISOString(),
): MyPokemon {
  const hours = Math.max(0, elapsedHours(p.lastTickAt, now));
  const gained = Math.floor(hours * POINTS_PER_HOUR);
  if (gained <= 0) return p;
  return { ...p, points: p.points + gained, lastTickAt: now };
}

/** 이슈 본문을 사람과 기계 모두 읽을 수 있는 마크다운으로 직렬화합니다. */
export function serializeBody(data: PersistedView): string {
  const heldItemLine = data.heldItem
    ? `${getItemName(data.heldItem)} (\`${data.heldItem}\`)`
    : "없음";
  return [
    `# ${data.nickname}`,
    "",
    `![${data.nickname}](${data.image})`,
    "",
    "## 정보",
    "",
    `- **종**: ${data.speciesName}`,
    `- **종족 번호**: ${data.pokemonId}`,
    `- **닉네임**: ${data.nickname}`,
    `- **레벨**: ${data.level} / ${MAX_LEVEL}`,
    `- **친밀도**: ${data.friendship} / ${MAX_FRIENDSHIP}`,
    `- **포인트**: ${data.points}`,
    `- **장착 도구**: ${heldItemLine}`,
    "",
    "## 메타데이터",
    "",
    `- uniqueId: \`${data.uniqueId}\``,
    `- caughtAt: \`${data.caughtAt}\``,
    `- lastTickAt: \`${data.lastTickAt}\``,
    "",
  ].join("\n");
}

/** MyPokemon에서 이슈 본문 직렬화에 필요한 필드만 추려냅니다. */
export function toView(p: MyPokemon): PersistedView {
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
    speciesName: p.name,
    image: p.image,
  };
}

/** 이슈 본문에서 영속 데이터를 복원합니다. 마크다운을 우선 시도하고,
 *  과거에 사용하던 JSON 코드블록은 호환을 위해 fallback으로 처리합니다. */
export function parseStoredBody(body: string): StoredBody | null {
  if (!body.trim()) return null;

  const jsonBlock = body.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonBlock) {
    try {
      const cleaned = jsonBlock[1]
        .replace(/,+/g, ",")
        .replace(/,\s*}/g, "}")
        .replace(/,\s*\]/g, "]");
      return JSON.parse(cleaned) as StoredBody;
    } catch (e) {
      console.error("Legacy JSON body parse failed:", e);
    }
  }

  const field = (label: string): string | null => {
    const re = new RegExp(`^-\\s+\\*\\*${label}\\*\\*:\\s*(.+)$`, "m");
    return body.match(re)?.[1]?.trim() ?? null;
  };
  const meta = (label: string): string | null => {
    const re = new RegExp(`^-\\s+${label}:\\s*\`?([^\`\\n]+)\`?\\s*$`, "m");
    return body.match(re)?.[1]?.trim() ?? null;
  };

  const pokemonIdRaw = field("종족 번호");
  if (!pokemonIdRaw) return null;
  const pokemonId = parseInt(pokemonIdRaw, 10);
  if (!Number.isFinite(pokemonId)) return null;

  const heldItemRaw = field("장착 도구") ?? "없음";
  const heldKeyMatch = heldItemRaw.match(/`([^`]+)`/);
  const heldItem = heldKeyMatch
    ? heldKeyMatch[1]
    : heldItemRaw === "없음"
      ? null
      : heldItemRaw;

  const caughtAt = meta("caughtAt") ?? new Date().toISOString();

  return {
    uniqueId: meta("uniqueId") ?? "",
    pokemonId,
    nickname: field("닉네임") ?? "",
    level: parseInt(field("레벨")?.split("/")[0]?.trim() ?? "1", 10),
    friendship: parseInt(field("친밀도")?.split("/")[0]?.trim() ?? "0", 10),
    points: parseInt(field("포인트") ?? "0", 10),
    heldItem,
    caughtAt,
    lastTickAt: meta("lastTickAt") ?? caughtAt,
  };
}
