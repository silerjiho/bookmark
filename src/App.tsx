import { useEffect, useState } from "react";
import {
  readBox,
  catchPokemon,
  feedBerry,
  playWith,
  buyItem,
  unequipItem,
  evolvePokemon,
  releasePokemon,
  type MyPokemon,
  type Berry,
  type ShopItem,
} from "./api/box";
import type { NextEvolution } from "./api/pokemon";
import PokemonCard from "./components/PokemonCard";
import PokemonDetail from "./components/PokemonDetail";
import TransferOverlay from "./components/TransferOverlay";

export default function App() {
  const [myPokemon, setMyPokemon] = useState<MyPokemon[]>([]);
  const [selected, setSelected] = useState<MyPokemon | null>(null);
  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    readBox().then(setMyPokemon).finally(() => setLoading(false));
  }, []);

  const replace = (updated: MyPokemon) => {
    setMyPokemon((prev) =>
      prev.map((p) => (p.issueNumber === updated.issueNumber ? updated : p)),
    );
    setSelected(updated);
  };

  const withTransfer = async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (transferring) return;
    setTransferring(true);
    try {
      return await fn();
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "오류가 발생했습니다";
      alert(msg);
      return undefined;
    } finally {
      setTransferring(false);
    }
  };

  const handleCatch = () =>
    withTransfer(async () => {
      const newPokemon = await catchPokemon();
      setMyPokemon((prev) => [...prev, newPokemon]);
    });

  const handleFeed = (berry: Berry) =>
    withTransfer(async () => {
      if (!selected) return;
      replace(await feedBerry(selected, berry));
    });

  const handlePlay = () =>
    withTransfer(async () => {
      if (!selected) return;
      replace(await playWith(selected));
    });

  const handleBuyItem = (item: ShopItem) =>
    withTransfer(async () => {
      if (!selected) return;
      replace(await buyItem(selected, item));
    });

  const handleUnequip = () =>
    withTransfer(async () => {
      if (!selected) return;
      replace(await unequipItem(selected));
    });

  const handleEvolve = (next: NextEvolution) =>
    withTransfer(async () => {
      if (!selected) return;
      replace(await evolvePokemon(selected, next));
    });

  const handleRelease = () =>
    withTransfer(async () => {
      if (!selected) return;
      await releasePokemon(selected.issueNumber);
      setMyPokemon((prev) =>
        prev.filter((p) => p.issueNumber !== selected.issueNumber),
      );
      setSelected(null);
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-400 font-medium">
        박스 불러오는 중...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 font-sans">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">포켓몬 박스</h1>
        <button
          onClick={handleCatch}
          disabled={transferring}
          className="bg-red-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-red-600 disabled:opacity-60 transition-colors shadow-sm"
        >
          랜덤 포획!
        </button>
      </div>

      {myPokemon.length === 0 ? (
        <div className="text-center py-32 text-slate-400">
          <p className="text-lg font-medium mb-1">박스가 비어있습니다!</p>
          <p className="text-sm">랜덤 포획 버튼을 눌러 포켓몬을 잡아보세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {myPokemon.map((p) => (
            <PokemonCard key={p.uniqueId} pokemon={p} onClick={setSelected} />
          ))}
        </div>
      )}

      {selected && (
        <PokemonDetail
          pokemon={selected}
          transferring={transferring}
          onClose={() => setSelected(null)}
          onFeed={handleFeed}
          onPlay={handlePlay}
          onBuyItem={handleBuyItem}
          onUnequip={handleUnequip}
          onEvolve={handleEvolve}
          onRelease={handleRelease}
        />
      )}

      {transferring && <TransferOverlay />}
    </div>
  );
}
