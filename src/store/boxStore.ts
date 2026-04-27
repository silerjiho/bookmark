import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  readBox,
  catchPokemon as apiCatch,
  feedBerry as apiFeed,
  playWith as apiPlay,
  buyItem as apiBuy,
  unequipItem as apiUnequip,
  evolvePokemon as apiEvolve,
  releasePokemon as apiRelease,
  renameNickname as apiRename,
} from "../api/box.api";
import {
  MAX_FRIENDSHIP,
  MAX_LEVEL,
  POINTS_PER_LEVEL_UP,
  type MyPokemon,
} from "../lib/box";
import type { Berry } from "../lib/berries";
import type { ShopItem } from "../lib/items";
import type { NextEvolution } from "../lib/pokemon";

export type PendingKind = "creating" | "parting";

export interface Pending {
  kind: PendingKind;
  /** Generated locally before the create-API returns. */
  tempId?: string;
  /** Real uniqueId once known (always set for parting; set for creating after API resolves). */
  uniqueId?: string;
  /** Optimistic snapshot we expect the server to converge to. Null for parting / pre-create-resolution. */
  optimistic: MyPokemon | null;
  startedAt: number;
}

export interface Toast {
  id: string;
  message: string;
}

interface BoxState {
  /** 화면 표시의 기준이 되는 박스 상태. localStorage에 영속화되어 새로고침 후에도 우선 사용됩니다. */
  serverList: MyPokemon[];
  /** 진행 중인 create/parting 작업 목록. growing(일반 변경)은 포함되지 않습니다. */
  pending: Pending[];
  /** 화면 우하단에 잠시 떠 있는 토스트 메시지들. */
  toasts: Toast[];
  /** 첫 로딩 진행 여부. */
  loading: boolean;
  /** 첫 로딩 실패 메시지. */
  error: string | null;

  /** 앱 시작 시 박스를 불러옵니다. 로컬 데이터가 있으면 그쪽을 우선 보여줍니다. */
  loadInitial: () => Promise<void>;
  /** 새 포켓몬을 받아 박스에 추가합니다(create). */
  catchPokemon: () => Promise<void>;
  /** 나무열매를 먹여 레벨을 올립니다(낙관적). */
  feedBerry: (p: MyPokemon, berry: Berry) => Promise<void>;
  /** 놀아주기로 친밀도를 1 올립니다(낙관적). */
  playWith: (p: MyPokemon) => Promise<void>;
  /** 도구를 구매·장착합니다(낙관적). */
  buyItem: (p: MyPokemon, item: ShopItem) => Promise<void>;
  /** 장착 도구를 해제합니다(낙관적). */
  unequipItem: (p: MyPokemon) => Promise<void>;
  /** 진화시킵니다(낙관적). */
  evolvePokemon: (p: MyPokemon, next: NextEvolution) => Promise<void>;
  /** 닉네임을 변경합니다(낙관적). 이슈 제목도 함께 갱신됩니다. */
  renameNickname: (p: MyPokemon, nickname: string) => Promise<void>;
  /** 포켓몬을 놓아줍니다(delete). */
  releasePokemon: (p: MyPokemon) => Promise<void>;
  /** 토스트 한 개를 즉시 닫습니다. */
  dismissToast: (id: string) => void;
}

const TOAST_DURATION_MS = 4000;

function pushToast(message: string) {
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  useBoxStore.setState((s) => ({ toasts: [...s.toasts, { id, message }] }));
  setTimeout(() => {
    useBoxStore.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  }, TOAST_DURATION_MS);
}

function genTempId() {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** create/parting 진행 상태를 정리합니다. growing 종류는 더 이상 존재하지 않습니다. */
function reconcile(serverList: MyPokemon[], pending: Pending[]): Pending[] {
  return pending.filter((p) => {
    if (p.kind === "creating") {
      if (!p.uniqueId) return true;
      return !serverList.some((x) => x.uniqueId === p.uniqueId);
    }
    if (p.kind === "parting") {
      return serverList.some((x) => x.uniqueId === p.uniqueId);
    }
    return true;
  });
}

/** 새로고침 결과를 로컬 상태와 합칩니다. 기본 규칙은 "store 우선": 양쪽에 모두 있는
 *  포켓몬은 로컬 값을 유지합니다. 서버에만 있는 포켓몬은 새로 추가하고(create 확정),
 *  parting pending이 있으면서 서버에서 사라진 포켓몬은 제거(delete 확정)합니다. */
function mergeRefresh(
  server: MyPokemon[],
  local: MyPokemon[],
  pending: Pending[],
): MyPokemon[] {
  const serverIds = new Set(server.map((p) => p.uniqueId));
  const localIds = new Set(local.map((p) => p.uniqueId));
  const result: MyPokemon[] = [];

  for (const p of local) {
    const pendingFor = pending.find((pe) => pe.uniqueId === p.uniqueId);
    if (pendingFor?.kind === "parting" && !serverIds.has(p.uniqueId)) continue;
    result.push(p);
  }

  for (const sp of server) {
    if (!localIds.has(sp.uniqueId)) result.push(sp);
  }

  return result;
}

/** create/delete의 GitHub eventual-consistency 대응 — 처음에는 빠르게,
 *  이후엔 점차 간격을 늘려 폴링합니다. */
function getBackoff(attempt: number): number {
  if (attempt < 5) return 1500;
  if (attempt < 10) return 3000;
  if (attempt < 20) return 6000;
  return 15000;
}

let pollScheduled = false;

async function pollUntilReconciled() {
  if (pollScheduled) return;
  pollScheduled = true;
  try {
    let attempts = 0;
    while (useBoxStore.getState().pending.length > 0) {
      await new Promise((r) => setTimeout(r, getBackoff(attempts)));
      try {
        const fetched = await readBox();
        useBoxStore.setState((s) => ({
          serverList: mergeRefresh(fetched, s.serverList, s.pending),
          pending: reconcile(fetched, s.pending),
        }));
      } catch (e) {
        console.error("Background refresh failed:", e);
      }
      attempts++;
    }
  } finally {
    pollScheduled = false;
  }
}

function optimisticFeed(p: MyPokemon, berry: Berry): MyPokemon {
  const newLevel = Math.min(MAX_LEVEL, p.level + berry.levelGain);
  const gained = newLevel - p.level;
  return { ...p, level: newLevel, points: p.points + gained * POINTS_PER_LEVEL_UP };
}

function optimisticPlay(p: MyPokemon): MyPokemon {
  return { ...p, friendship: Math.min(MAX_FRIENDSHIP, p.friendship + 1) };
}

function optimisticBuy(p: MyPokemon, item: ShopItem): MyPokemon {
  return { ...p, points: p.points - item.price, heldItem: item.key };
}

function optimisticEvolve(p: MyPokemon, next: NextEvolution): MyPokemon {
  const consumesItem =
    next.requirement.kind === "item" && p.heldItem === next.requirement.itemKey;
  return {
    ...p,
    pokemonId: next.pokemonId,
    name: next.koreanName,
    image: next.image,
    types: next.types,
    evolutionChainUrl: next.evolutionChainUrl,
    heldItem: consumesItem ? null : p.heldItem,
  };
}

/** 일반 변경(먹이주기/놀아주기/구매/해제/진화/닉네임)에 사용하는 낙관적 업데이트.
 *  store에 즉시 반영 → API 호출 → 성공 시 서버 결과로 보정, 실패 시 원복합니다. */
async function applyMutation(
  uniqueId: string,
  mutate: (p: MyPokemon) => MyPokemon,
  apiCall: () => Promise<MyPokemon>,
): Promise<void> {
  const before = useBoxStore
    .getState()
    .serverList.find((p) => p.uniqueId === uniqueId);
  if (!before) throw new Error("박스에 없는 포켓몬입니다");
  const optimistic = mutate(before);

  useBoxStore.setState((s) => ({
    serverList: s.serverList.map((p) =>
      p.uniqueId === uniqueId ? optimistic : p,
    ),
  }));

  try {
    const apiResult = await apiCall();
    useBoxStore.setState((s) => ({
      serverList: s.serverList.map((p) =>
        p.uniqueId === uniqueId ? apiResult : p,
      ),
    }));
  } catch (e) {
    useBoxStore.setState((s) => ({
      serverList: s.serverList.map((p) =>
        p.uniqueId === uniqueId ? before : p,
      ),
    }));
    throw e;
  }
}

export const useBoxStore = create<BoxState>()(
  persist(
    (set) => ({
      serverList: [],
      pending: [],
      toasts: [],
      loading: true,
      error: null,

      dismissToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      loadInitial: async () => {
        set({ loading: true, error: null });
        try {
          const fetched = await readBox();
          set((s) => ({
            serverList:
              s.serverList.length === 0
                ? fetched
                : mergeRefresh(fetched, s.serverList, s.pending),
            pending: reconcile(fetched, s.pending),
            loading: false,
          }));
          if (useBoxStore.getState().pending.length > 0) {
            pollUntilReconciled();
          }
        } catch (e) {
          set({
            loading: false,
            error: e instanceof Error ? e.message : "박스를 불러오지 못했습니다",
          });
        }
      },

      catchPokemon: async () => {
        const tempId = genTempId();
        set((s) => ({
          pending: [
            ...s.pending,
            { kind: "creating", tempId, optimistic: null, startedAt: Date.now() },
          ],
        }));
        try {
          const newPokemon = await apiCatch();
          set((s) => ({
            pending: s.pending.map((p) =>
              p.tempId === tempId
                ? { ...p, uniqueId: newPokemon.uniqueId, optimistic: newPokemon }
                : p,
            ),
          }));
          pollUntilReconciled();
        } catch (e) {
          set((s) => ({ pending: s.pending.filter((p) => p.tempId !== tempId) }));
          throw e;
        }
      },

      feedBerry: (p, berry) =>
        applyMutation(p.uniqueId, (cur) => optimisticFeed(cur, berry), () =>
          apiFeed(p, berry),
        ),

      playWith: (p) =>
        applyMutation(p.uniqueId, optimisticPlay, () => apiPlay(p)),

      buyItem: (p, item) =>
        applyMutation(p.uniqueId, (cur) => optimisticBuy(cur, item), () =>
          apiBuy(p, item),
        ),

      unequipItem: (p) =>
        applyMutation(
          p.uniqueId,
          (cur) => ({ ...cur, heldItem: null }),
          () => apiUnequip(p),
        ),

      evolvePokemon: (p, next) =>
        applyMutation(
          p.uniqueId,
          (cur) => optimisticEvolve(cur, next),
          () => apiEvolve(p, next),
        ),

      renameNickname: (p, nickname) =>
        applyMutation(
          p.uniqueId,
          (cur) => ({ ...cur, nickname: nickname.trim() }),
          () => apiRename(p, nickname),
        ),

      releasePokemon: async (pokemon) => {
        const startedAt = Date.now();
        set((s) => ({
          pending: [
            ...s.pending.filter((p) => p.uniqueId !== pokemon.uniqueId),
            { kind: "parting", uniqueId: pokemon.uniqueId, optimistic: null, startedAt },
          ],
        }));
        pushToast(`잘가~ ${pokemon.nickname} 꼭 데리러 올게!`);
        try {
          await apiRelease(pokemon.issueNumber);
          pollUntilReconciled();
        } catch (e) {
          set((s) => ({
            pending: s.pending.filter((p) => p.uniqueId !== pokemon.uniqueId),
          }));
          throw e;
        }
      },
    }),
    {
      name: "pokemon-box-store",
      storage: createJSONStorage(() => localStorage),
      // serverList도 함께 영속화 — store 우선 정책에 따라 다음 로드에서 우선 사용됩니다.
      // 미확정 creating(uniqueId 없음)은 새로고침 후 식별이 불가능하므로 제외합니다.
      partialize: (state) =>
        ({
          serverList: state.serverList,
          pending: state.pending.filter(
            (p) => !(p.kind === "creating" && !p.uniqueId),
          ),
        }) as Partial<BoxState>,
    },
  ),
);

export interface DisplayItem {
  key: string;
  kind: "normal" | "creating" | "parting";
  pokemon: MyPokemon | null;
}

/** 화면에 표시할 카드 목록을 만듭니다. growing 상태는 store에 직접 반영되므로
 *  여기서는 별도로 다루지 않습니다. */
export function buildDisplayItems(
  serverList: MyPokemon[],
  pending: Pending[],
): DisplayItem[] {
  const items: DisplayItem[] = [];

  for (const p of pending) {
    if (p.kind !== "creating") continue;
    items.push({
      key: p.tempId ?? `creating-${p.startedAt}`,
      kind: "creating",
      pokemon: p.optimistic,
    });
  }

  for (const pokemon of serverList) {
    const pend = pending.find((p) => p.uniqueId === pokemon.uniqueId);
    if (pend?.kind === "parting") {
      items.push({ key: pokemon.uniqueId, kind: "parting", pokemon });
    } else {
      items.push({ key: pokemon.uniqueId, kind: "normal", pokemon });
    }
  }

  return items;
}
