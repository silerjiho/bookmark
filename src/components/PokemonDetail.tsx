import { useState, useEffect } from "react";
import type { MyPokemon, Berry } from "../api/box";
import { BERRIES, calcExpProgress } from "../api/box";
import { getNextEvolution, type NextEvolution } from "../api/pokemon";

interface PokemonDetailProps {
  pokemon: MyPokemon;
  onClose: () => void;
  onFeed: (berry: Berry) => Promise<void>;
  onEvolve: (next: NextEvolution) => Promise<void>;
  onRelease: () => Promise<void>;
}

export default function PokemonDetail({
  pokemon,
  onClose,
  onFeed,
  onEvolve,
  onRelease,
}: PokemonDetailProps) {
  const [nextEvolution, setNextEvolution] = useState<NextEvolution | null | undefined>(undefined);
  const [acting, setActing] = useState(false);

  const expProgress = calcExpProgress(pokemon.exp);
  const canEvolve =
    nextEvolution != null &&
    (nextEvolution.minLevel === null || pokemon.level >= nextEvolution.minLevel);

  useEffect(() => {
    setNextEvolution(undefined);
    getNextEvolution(pokemon.pokemonId, pokemon.evolutionChainUrl).then(
      setNextEvolution,
    );
  }, [pokemon.pokemonId, pokemon.evolutionChainUrl]);

  const wrap = async (fn: () => Promise<void>) => {
    if (acting) return;
    setActing(true);
    try {
      await fn();
    } finally {
      setActing(false);
    }
  };

  const handleRelease = () =>
    wrap(async () => {
      if (!confirm(`${pokemon.nickname}을(를) 정말 놓아주시겠습니까?`)) return;
      await onRelease();
      onClose();
    });

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl overflow-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{pokemon.nickname}</h2>
            {pokemon.nickname !== pokemon.name && (
              <p className="text-sm text-slate-400">{pokemon.name}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 text-2xl leading-none hover:text-slate-600 px-1"
          >
            &times;
          </button>
        </div>

        {/* Image */}
        <img
          src={pokemon.image}
          alt={pokemon.name}
          className="w-40 h-40 mx-auto object-contain"
        />

        {/* Types */}
        <div className="flex gap-1.5 justify-center mb-4">
          {pokemon.types.map((t) => (
            <span
              key={t}
              className="text-sm bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full"
            >
              {t}
            </span>
          ))}
        </div>

        {/* Level & Exp bar */}
        <div className="mb-5">
          <div className="flex justify-between text-sm text-slate-600 mb-1">
            <span className="font-bold text-base">Lv.{pokemon.level}</span>
            <span className="text-slate-400">
              {expProgress.current} / {expProgress.needed} EXP
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5">
            <div
              className="bg-yellow-400 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${expProgress.percent}%` }}
            />
          </div>
        </div>

        {/* Berries */}
        <div className="mb-5">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            나무열매 먹이기
          </div>
          <div className="flex gap-2">
            {BERRIES.map((berry) => (
              <button
                key={berry.id}
                onClick={() => wrap(() => onFeed(berry))}
                disabled={acting}
                className="flex-1 text-sm bg-green-50 border border-green-200 text-green-700 py-2 px-1.5 rounded-lg hover:bg-green-100 disabled:opacity-50 transition-colors leading-tight"
              >
                {berry.name}
                <br />
                <span className="text-xs text-green-500">+{berry.exp} EXP</span>
              </button>
            ))}
          </div>
        </div>

        {/* Evolution */}
        <div className="mb-5">
          {nextEvolution === undefined ? (
            <div className="text-xs text-center text-slate-400 py-2">진화 정보 확인 중...</div>
          ) : nextEvolution ? (
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 flex items-center gap-3">
              <img
                src={nextEvolution.image}
                alt={nextEvolution.koreanName}
                className="w-14 h-14 object-contain"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-slate-800">
                  {nextEvolution.koreanName}으로 진화
                </div>
                {nextEvolution.minLevel != null && (
                  <div className="text-xs text-slate-500">
                    필요 레벨: {nextEvolution.minLevel}
                    {!canEvolve && (
                      <span className="text-red-400 ml-1">
                        (현재 {pokemon.level})
                      </span>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => wrap(() => onEvolve(nextEvolution))}
                disabled={!canEvolve || acting}
                className="text-sm bg-purple-600 text-white px-3 py-2 rounded-lg font-bold hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                진화!
              </button>
            </div>
          ) : (
            <div className="text-xs text-center text-slate-400 py-1">
              더 이상 진화할 수 없습니다
            </div>
          )}
        </div>

        {/* Release */}
        <button
          onClick={handleRelease}
          disabled={acting}
          className="w-full text-sm text-red-500 border border-red-200 py-2.5 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors font-medium"
        >
          놓아주기
        </button>
      </div>
    </div>
  );
}
