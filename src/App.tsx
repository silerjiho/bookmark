import { useState } from "react";
import type { MyPokemon } from "./lib/box";
import PokemonCard from "./components/PokemonCard";
import PokemonDetail from "./components/PokemonDetail";
import ToastContainer from "./components/Toast";
import { useBoxManager } from "./hooks/useBoxManager";

export default function App() {
  const {
    loading,
    error,
    serverList,
    pending,
    items,
    transferringCount,
    handleCatch,
    loadInitial,
  } = useBoxManager();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const selected = serverList.find((p) => p.uniqueId === selectedId) ?? null;
  const selectedPending = pending.find((p) => p.uniqueId === selectedId) ?? null;

  const handleSelect = (p: MyPokemon) => setSelectedId(p.uniqueId);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          <p className="text-white/70 text-sm tracking-tight">
            박스를 불러오는 중...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-white text-xl font-semibold tracking-tight mb-2">
            연결 실패
          </p>
          <p className="text-white/60 text-sm tracking-tight mb-6">{error}</p>
          <button
            onClick={loadInitial}
            className="bg-[#0071e3] hover:brightness-110 text-white text-[14px] font-medium rounded-full px-5 py-2 transition"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* ── Hero (Apple-black) ────────────────────────────── */}
      <section className="bg-black">
        <div className="max-w-245 mx-auto px-6 py-16 sm:py-24 text-center">
          <h1
            className="text-white font-semibold tracking-tight"
            style={{
              fontSize: "clamp(36px, 7vw, 56px)",
              lineHeight: 1.07,
              letterSpacing: "-0.28px",
            }}
          >
            포켓몬 박스
          </h1>

          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              onClick={handleCatch}
              className="bg-[#0071e3] hover:brightness-110 active:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed text-white text-[15px] font-normal rounded-full px-5 py-2.5 transition tracking-tight"
            >
              포켓몬 전송
            </button>
            <span className="text-white/60 text-[13px] tracking-tight">
              보유 {serverList.length}마리
              {transferringCount > 0 && (
                <span className="ml-2 text-[#2997ff]">
                  · {transferringCount}마리 전송중
                </span>
              )}
            </span>
          </div>
        </div>
      </section>

      {/* ── Box grid ──────────────────────────────────────── */}
      <section className="max-w-245 mx-auto px-6 py-12 sm:py-16">
        {items.length === 0 ? (
          <EmptyState onCatch={handleCatch} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5">
            {items.map((item) => (
              <PokemonCard
                key={item.key}
                pokemon={item.pokemon}
                kind={item.kind}
                onClick={item.kind === "normal" ? handleSelect : undefined}
              />
            ))}
          </div>
        )}
      </section>

      {selected && (
        <PokemonDetail
          pokemon={selected}
          pendingKind={selectedPending?.kind ?? null}
          onClose={() => setSelectedId(null)}
        />
      )}

      <ToastContainer />
    </div>
  );
}

function EmptyState({ onCatch }: { onCatch: () => void }) {
  return (
    <div className="text-center py-24">
      <p
        className="text-[#1d1d1f] font-semibold tracking-tight"
        style={{ fontSize: "28px", lineHeight: 1.14, letterSpacing: "0.196px" }}
      >
        박스가 비어있습니다
      </p>
      <p className="mt-2 text-[15px] text-[rgba(0,0,0,0.48)] tracking-tight">
        포켓몬 전송 버튼을 눌러 첫 포켓몬을 받아보세요.
      </p>
      <button
        onClick={onCatch}
        className="mt-6 bg-[#0071e3] hover:brightness-110 active:brightness-95 text-white text-[15px] rounded-full px-5 py-2.5 transition tracking-tight"
      >
        포켓몬 전송
      </button>
    </div>
  );
}
