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
  MAX_FRIENDSHIP,
  MAX_LEVEL,
  POINTS_PER_LEVEL_UP,
  type MyPokemon,
  type Berry,
  type ShopItem,
} from "../api/box";
import type { NextEvolution } from "../api/pokemon";

export type PendingKind = "creating" | "growing" | "parting";

export interface Pending {
  kind: PendingKind;
  /** Generated locally before the create-API returns. */
  tempId?: string;
  /** Real uniqueId once known (always set for growing/parting; set for creating after API resolves). */
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
  serverList: MyPokemon[];
  pending: Pending[];
  toasts: Toast[];
  loading: boolean;
  error: string | null;

  loadInitial: () => Promise<void>;
  catchPokemon: () => Promise<void>;
  feedBerry: (p: MyPokemon, berry: Berry) => Promise<void>;
  playWith: (p: MyPokemon) => Promise<void>;
  buyItem: (p: MyPokemon, item: ShopItem) => Promise<void>;
  unequipItem: (p: MyPokemon) => Promise<void>;
  evolvePokemon: (p: MyPokemon, next: NextEvolution) => Promise<void>;
  releasePokemon: (p: MyPokemon) => Promise<void>;
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

/** Server has converged to optimistic when mutation-relevant fields match.
 *  Points are skipped because time-tick keeps changing them on each read. */
function matches(server: MyPokemon, opt: MyPokemon): boolean {
  return (
    server.pokemonId === opt.pokemonId &&
    server.level === opt.level &&
    server.friendship === opt.friendship &&
    server.heldItem === opt.heldItem
  );
}

function reconcile(serverList: MyPokemon[], pending: Pending[]): Pending[] {
  return pending.filter((p) => {
    if (p.kind === "creating") {
      if (!p.uniqueId) return true;
      return !serverList.some((x) => x.uniqueId === p.uniqueId);
    }
    if (p.kind === "growing") {
      const found = serverList.find((x) => x.uniqueId === p.uniqueId);
      if (!found || !p.optimistic) return false; // gone from server — drop pending
      return !matches(found, p.optimistic);
    }
    if (p.kind === "parting") {
      return serverList.some((x) => x.uniqueId === p.uniqueId);
    }
    return true;
  });
}

/** Polling cadence — first few attempts are fast (typical GitHub eventual-consistency window),
 *  then back off so we don't hammer the API for genuinely stuck operations. */
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
    // Poll indefinitely — UI must keep loading state until the server actually reflects the change.
    while (useBoxStore.getState().pending.length > 0) {
      await new Promise((r) => setTimeout(r, getBackoff(attempts)));
      try {
        const list = await readBox();
        useBoxStore.setState((s) => ({
          serverList: list,
          pending: reconcile(list, s.pending),
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

async function runUpdate(
  original: MyPokemon,
  optimistic: MyPokemon,
  apiCall: () => Promise<MyPokemon>,
) {
  const startedAt = Date.now();
  useBoxStore.setState((s) => ({
    pending: [
      ...s.pending.filter((p) => p.uniqueId !== original.uniqueId),
      { kind: "growing", uniqueId: original.uniqueId, optimistic, startedAt },
    ],
  }));
  try {
    await apiCall();
    pollUntilReconciled();
  } catch (e) {
    useBoxStore.setState((s) => ({
      pending: s.pending.filter((p) => p.uniqueId !== original.uniqueId),
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
          const list = await readBox();
          set((s) => ({
            serverList: list,
            // Reconcile any persisted pending against the freshly fetched server state.
            pending: reconcile(list, s.pending),
            loading: false,
          }));
          // If anything's still pending after rehydration + reconcile, keep polling.
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
        runUpdate(p, optimisticFeed(p, berry), () => apiFeed(p, berry)),

      playWith: (p) => runUpdate(p, optimisticPlay(p), () => apiPlay(p)),

      buyItem: (p, item) => runUpdate(p, optimisticBuy(p, item), () => apiBuy(p, item)),

      unequipItem: (p) =>
        runUpdate(p, { ...p, heldItem: null }, () => apiUnequip(p)),

      evolvePokemon: (p, next) =>
        runUpdate(p, optimisticEvolve(p, next), () => apiEvolve(p, next)),

      releasePokemon: async (pokemon) => {
        const startedAt = Date.now();
        set((s) => ({
          pending: [
            ...s.pending.filter((p) => p.uniqueId !== pokemon.uniqueId),
            { kind: "parting", uniqueId: pokemon.uniqueId, optimistic: null, startedAt },
          ],
        }));
        pushToast(`잘가~ ${pokemon.name} 꼭 데리러 올게!`);
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
      // Persist only `pending` — server list is always re-fetched on load.
      // Skip creating-in-flight (no uniqueId) since we can't identify it after a refresh.
      partialize: (state) =>
        ({
          pending: state.pending.filter(
            (p) => !(p.kind === "creating" && !p.uniqueId),
          ),
        }) as Partial<BoxState>,
    },
  ),
);

export interface DisplayItem {
  key: string;
  kind: "normal" | "creating" | "growing" | "parting";
  pokemon: MyPokemon | null;
  /** Snapshot we *expect* the server to look like — used to render optimistic stats during 'growing'. */
  optimistic: MyPokemon | null;
}

/** Pure helper — merges server list + pending operations into the cards to render. */
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
      optimistic: p.optimistic,
    });
  }

  for (const pokemon of serverList) {
    const pend = pending.find((p) => p.uniqueId === pokemon.uniqueId);
    if (pend?.kind === "parting") {
      items.push({ key: pokemon.uniqueId, kind: "parting", pokemon, optimistic: null });
    } else if (pend?.kind === "growing") {
      items.push({
        key: pokemon.uniqueId,
        kind: "growing",
        pokemon,
        optimistic: pend.optimistic,
      });
    } else {
      items.push({ key: pokemon.uniqueId, kind: "normal", pokemon, optimistic: null });
    }
  }

  return items;
}
