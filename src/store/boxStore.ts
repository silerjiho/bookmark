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
import { useToastStore } from "./toastStore";

/** 처리 중인 작업의 종류 (생성 중 또는 놓아주는 중) */
export type PendingKind = "creating" | "parting";

/** 진행 중인 비동기 작업 정보 */
export interface Pending {
  /** 작업 종류 */
  kind: PendingKind;
  /** 임시 식별자 (생성 시 사용) */
  tempId?: string;
  /** 고유 식별자 (서버 확정 시 사용) */
  uniqueId?: string;
  /** 낙관적 업데이트용 포켓몬 데이터 */
  optimistic: MyPokemon | null;
  /** 작업 시작 시간 */
  startedAt: number;
}

/** 박스 스토어의 상태와 액션 정의 */
interface BoxState {
  /** 서버에서 확인된 포켓몬 목록 */
  serverList: MyPokemon[];
  /** 아직 서버에 반영되지 않은 진행 중인 작업 목록 */
  pending: Pending[];
  /** 초기 로딩 상태 */
  loading: boolean;
  /** 에러 메시지 */
  error: string | null;

  /** 앱 시작 시 초기 데이터를 불러옴 */
  loadInitial: () => Promise<void>;
  /** 새로운 포켓몬을 잡음 */
  catchPokemon: () => Promise<void>;
  /** 포켓몬에게 나무열매를 먹임 */
  feedBerry: (p: MyPokemon, berry: Berry) => Promise<void>;
  /** 포켓몬과 놀아줌 (친밀도 상승) */
  playWith: (p: MyPokemon) => Promise<void>;
  /** 상점에서 도구를 구매하여 장착 */
  buyItem: (p: MyPokemon, item: ShopItem) => Promise<void>;
  /** 장착된 도구를 해제 */
  unequipItem: (p: MyPokemon) => Promise<void>;
  /** 포켓몬을 진화시킴 */
  evolvePokemon: (p: MyPokemon, next: NextEvolution) => Promise<void>;
  /** 포켓몬의 닉네임을 변경 */
  renameNickname: (p: MyPokemon, nickname: string) => Promise<void>;
  /** 포켓몬을 야생으로 놓아줌 */
  releasePokemon: (p: MyPokemon) => Promise<void>;
}

// ── 헬퍼 함수 ──────────────────────────────────────────────────────────────

/** 임시 ID 생성 */
function genTempId() {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 서버 목록을 바탕으로 완료된 펜딩 작업을 정리 */
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

/** 서버 데이터와 로컬 데이터를 병합 (로컬의 낙관적 업데이트 상태 우선 유지) */
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

/** 재시도 횟수에 따른 폴링 간격 계산 */
function getBackoff(attempt: number): number {
  if (attempt < 5) return 1500;
  if (attempt < 10) return 3000;
  if (attempt < 20) return 6000;
  return 15000;
}

let pollScheduled = false;

/** 서버와 상태가 일치할 때까지 배경에서 데이터를 새로고침 (폴링) */
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
        console.error("배경 새로고침 실패:", e);
      }
      attempts++;
    }
  } finally {
    pollScheduled = false;
  }
}

// ── 낙관적 업데이트 공통 로직 ──────────────────────────────────────────────

/** 
 * 상태를 즉시 변경(낙관적)하고 API를 호출한 뒤, 
 * 결과에 따라 상태를 확정하거나 원복하는 공통 함수 
 */
async function applyMutation(
  uniqueId: string,
  mutate: (p: MyPokemon) => MyPokemon,
  apiCall: () => Promise<MyPokemon>,
): Promise<void> {
  const before = useBoxStore.getState().serverList.find((p) => p.uniqueId === uniqueId);
  if (!before) throw new Error("박스에 없는 포켓몬입니다");

  const optimistic = mutate(before);

  // 로컬 상태 즉시 반영
  useBoxStore.setState((s) => ({
    serverList: s.serverList.map((p) => (p.uniqueId === uniqueId ? optimistic : p)),
  }));

  try {
    const apiResult = await apiCall();
    // 성공 시 서버 데이터로 확정
    useBoxStore.setState((s) => ({
      serverList: s.serverList.map((p) => (p.uniqueId === uniqueId ? apiResult : p)),
    }));
  } catch (e) {
    // 실패 시 이전 상태로 복구
    useBoxStore.setState((s) => ({
      serverList: s.serverList.map((p) => (p.uniqueId === uniqueId ? before : p)),
    }));
    throw e;
  }
}

// ── 스토어 구현 ──────────────────────────────────────────────────────────────

/** 박스 관리 기능을 담당하는 메인 스토어 */
export const useBoxStore = create<BoxState>()(
  persist(
    (set) => ({
      serverList: [],
      pending: [],
      loading: true,
      error: null,

      loadInitial: async () => {
        set({ loading: true, error: null });
        try {
          const fetched = await readBox();
          set((s) => ({
            serverList: s.serverList.length === 0 ? fetched : mergeRefresh(fetched, s.serverList, s.pending),
            pending: reconcile(fetched, s.pending),
            loading: false,
          }));
          if (useBoxStore.getState().pending.length > 0) pollUntilReconciled();
        } catch (e) {
          set({ loading: false, error: e instanceof Error ? e.message : "박스를 불러오지 못했습니다" });
        }
      },

      catchPokemon: async () => {
        const tempId = genTempId();
        set((s) => ({
          pending: [...s.pending, { kind: "creating", tempId, optimistic: null, startedAt: Date.now() }],
        }));
        try {
          const newPokemon = await apiCatch();
          set((s) => ({
            pending: s.pending.map((p) =>
              p.tempId === tempId ? { ...p, uniqueId: newPokemon.uniqueId, optimistic: newPokemon } : p,
            ),
          }));
          pollUntilReconciled();
        } catch (e) {
          set((s) => ({ pending: s.pending.filter((p) => p.tempId !== tempId) }));
          throw e;
        }
      },

      feedBerry: (p, berry) =>
        applyMutation(
          p.uniqueId,
          (cur) => {
            const newLevel = Math.min(MAX_LEVEL, cur.level + berry.levelGain);
            return { ...cur, level: newLevel, points: cur.points + (newLevel - cur.level) * POINTS_PER_LEVEL_UP };
          },
          () => apiFeed(p, berry),
        ),

      playWith: (p) =>
        applyMutation(
          p.uniqueId,
          (cur) => ({ ...cur, friendship: Math.min(MAX_FRIENDSHIP, cur.friendship + 1) }),
          () => apiPlay(p),
        ),

      buyItem: (p, item) =>
        applyMutation(
          p.uniqueId,
          (cur) => ({ ...cur, points: cur.points - item.price, heldItem: item.key }),
          () => apiBuy(p, item),
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
          (cur) => {
            const consumesItem = next.requirement.kind === "item" && cur.heldItem === next.requirement.itemKey;
            return {
              ...cur,
              pokemonId: next.pokemonId,
              name: next.koreanName,
              image: next.image,
              types: next.types,
              evolutionChainUrl: next.evolutionChainUrl,
              heldItem: consumesItem ? null : cur.heldItem,
            };
          },
          () => apiEvolve(p, next),
        ),

      renameNickname: (p, nickname) =>
        applyMutation(
          p.uniqueId,
          (cur) => ({ ...cur, nickname: nickname.trim() }),
          () => apiRename(p, nickname),
        ),

      releasePokemon: async (pokemon) => {
        set((s) => ({
          pending: [
            ...s.pending.filter((p) => p.uniqueId !== pokemon.uniqueId),
            { kind: "parting", uniqueId: pokemon.uniqueId, optimistic: null, startedAt: Date.now() },
          ],
        }));
        useToastStore.getState().pushToast(`잘가~ ${pokemon.nickname} 꼭 데리러 올게!`);
        try {
          await apiRelease(pokemon.issueNumber);
          pollUntilReconciled();
        } catch (e) {
          set((s) => ({ pending: s.pending.filter((p) => p.uniqueId !== pokemon.uniqueId) }));
          throw e;
        }
      },
    }),
    {
      name: "pokemon-box-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        serverList: state.serverList,
        pending: state.pending.filter((p) => !(p.kind === "creating" && !p.uniqueId)),
      }),
    },
  ),
);

/** 화면 표시용 아이템 정보 */
export interface DisplayItem {
  key: string;
  kind: "normal" | "creating" | "parting";
  pokemon: MyPokemon | null;
}

/** 현재 목록과 진행 중인 작업을 합쳐 화면에 그릴 목록 생성 */
export function buildDisplayItems(serverList: MyPokemon[], pending: Pending[]): DisplayItem[] {
  const items: DisplayItem[] = [];

  // 생성 중인 포켓몬 먼저 추가
  for (const p of pending) {
    if (p.kind === "creating") {
      items.push({ key: p.tempId ?? `creating-${p.startedAt}`, kind: "creating", pokemon: p.optimistic });
    }
  }

  // 서버 목록 추가 (삭제 중인 경우 상태 표시)
  for (const pokemon of serverList) {
    const pend = pending.find((p) => p.uniqueId === pokemon.uniqueId);
    items.push({
      key: pokemon.uniqueId,
      kind: pend?.kind === "parting" ? "parting" : "normal",
      pokemon,
    });
  }

  return items;
}
