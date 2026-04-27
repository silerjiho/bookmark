import { useEffect, useMemo } from "react";
import { useBoxStore, buildDisplayItems } from "../store/boxStore";

/**
 * 박스 전체 상태 및 공통 동작(로딩, 에러, 포획)을 관리하는 훅
 */
export function useBoxManager() {
  const loading = useBoxStore((s) => s.loading);
  const error = useBoxStore((s) => s.error);
  const serverList = useBoxStore((s) => s.serverList);
  const pending = useBoxStore((s) => s.pending);
  const loadInitial = useBoxStore((s) => s.loadInitial);
  const catchPokemon = useBoxStore((s) => s.catchPokemon);

  const items = useMemo(
    () => buildDisplayItems(serverList, pending),
    [serverList, pending],
  );

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const transferringCount = pending.filter((p) => p.kind === "creating").length;

  const handleCatch = async () => {
    try {
      await catchPokemon();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "전송 실패");
    }
  };

  return {
    loading,
    error,
    serverList,
    pending,
    items,
    transferringCount,
    handleCatch,
    loadInitial,
  };
}
