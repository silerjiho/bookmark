import { useEffect, useState } from "react";
import {
  readBox,
  catchPokemon,
  feedBerry,
  evolvePokemon,
  releasePokemon,
  type MyPokemon,
  type Berry,
} from "./api/box";
import type { NextEvolution } from "./api/pokemon";
import PokemonCard from "./components/PokemonCard";
import PokemonDetail from "./components/PokemonDetail";

export default function App() {
  const [myPokemon, setMyPokemon] = useState<MyPokemon[]>([]);
  const [selected, setSelected] = useState<MyPokemon | null>(null);
  const [loading, setLoading] = useState(true);
  const [catching, setCatching] = useState(false);

  useEffect(() => {
    readBox().then(setMyPokemon).finally(() => setLoading(false));
  }, []);

  const handleCatch = async () => {
    if (catching) return;
    setCatching(true);
    try {
      const newPokemon = await catchPokemon();
      setMyPokemon((prev) => [...prev, newPokemon]);
    } catch (e) {
      console.error("포획 실패", e);
      alert("포획에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setCatching(false);
    }
  };

  const handleFeed = async (berry: Berry) => {
    if (!selected) return;
    const updated = await feedBerry(selected, berry);
    setMyPokemon((prev) =>
      prev.map((p) => (p.issueNumber === updated.issueNumber ? updated : p)),
    );
    setSelected(updated);
  };

  const handleEvolve = async (next: NextEvolution) => {
    if (!selected) return;
    const updated = await evolvePokemon(selected, next);
    setMyPokemon((prev) =>
      prev.map((p) => (p.issueNumber === updated.issueNumber ? updated : p)),
    );
    setSelected(updated);
  };

  const handleRelease = async () => {
    if (!selected) return;
    await releasePokemon(selected.issueNumber);
    setMyPokemon((prev) =>
      prev.filter((p) => p.issueNumber !== selected.issueNumber),
    );
    setSelected(null);
  };

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
          disabled={catching}
          className="bg-red-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-red-600 disabled:opacity-60 transition-colors shadow-sm"
        >
          {catching ? "포획 중..." : "랜덤 포획!"}
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
          onClose={() => setSelected(null)}
          onFeed={handleFeed}
          onEvolve={handleEvolve}
          onRelease={handleRelease}
        />
      )}
    </div>
  );
}
