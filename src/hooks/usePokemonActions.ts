import { useState } from "react";
import { useBoxStore } from "../store/boxStore";
import { MAX_LEVEL, MAX_FRIENDSHIP, type MyPokemon } from "../lib/box";
import type { Berry } from "../lib/berries";
import type { ShopItem } from "../lib/items";
import type { NextEvolution } from "../lib/pokemon";

interface ActionOptions {
  pokemon: MyPokemon;
  acting: boolean;
  onBurstParticles: (kind: "level" | "heart") => void;
  onClose: () => void;
}

/**
 * 포켓몬과 관련된 액션(먹이주기, 놀아주기, 구매, 진화, 방생)을 관리하는 훅
 */
export function usePokemonActions({ pokemon, acting, onBurstParticles, onClose }: ActionOptions) {
  const feedBerry = useBoxStore((s) => s.feedBerry);
  const playWith = useBoxStore((s) => s.playWith);
  const buyItem = useBoxStore((s) => s.buyItem);
  const unequipItem = useBoxStore((s) => s.unequipItem);
  const evolvePokemon = useBoxStore((s) => s.evolvePokemon);
  const releasePokemon = useBoxStore((s) => s.releasePokemon);

  const [evolveFlash, setEvolveFlash] = useState(false);
  const [releaseAnim, setReleaseAnim] = useState(false);

  const handleFeed = async (berry: Berry) => {
    if (acting || pokemon.level >= MAX_LEVEL) return;
    onBurstParticles("level");
    try {
      await feedBerry(pokemon, berry);
    } catch (e) {
      alert(e instanceof Error ? e.message : "오류");
    }
  };

  const handlePlay = async () => {
    if (acting || pokemon.friendship >= MAX_FRIENDSHIP) return;
    onBurstParticles("heart");
    try {
      await playWith(pokemon);
    } catch (e) {
      alert(e instanceof Error ? e.message : "오류");
    }
  };

  const handleBuy = async (item: ShopItem) => {
    if (acting) return;
    try {
      await buyItem(pokemon, item);
      return true; // 성공 시 모달 닫기 등을 위해 true 반환
    } catch (e) {
      alert(e instanceof Error ? e.message : "오류");
      return false;
    }
  };

  const handleUnequip = async () => {
    if (acting || !pokemon.heldItem) return;
    try {
      await unequipItem(pokemon);
    } catch (e) {
      alert(e instanceof Error ? e.message : "오류");
    }
  };

  const handleEvolve = async (next: NextEvolution) => {
    if (acting) return;
    setEvolveFlash(true);
    setTimeout(() => setEvolveFlash(false), 1200);
    try {
      await evolvePokemon(pokemon, next);
    } catch (e) {
      alert(e instanceof Error ? e.message : "오류");
    }
  };

  const handleRelease = async () => {
    if (acting) return;
    if (!confirm(`${pokemon.name}을(를) 정말 놓아주시겠습니까?`)) return;
    setReleaseAnim(true);
    try {
      await releasePokemon(pokemon);
      setTimeout(onClose, 1400);
    } catch (e) {
      alert(e instanceof Error ? e.message : "오류");
      setReleaseAnim(false);
    }
  };

  return {
    handleFeed,
    handlePlay,
    handleBuy,
    handleUnequip,
    handleEvolve,
    handleRelease,
    evolveFlash,
    releaseAnim,
  };
}
