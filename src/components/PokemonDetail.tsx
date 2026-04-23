import { useEffect, useState } from "react";
import {
  type MyPokemon,
  type Berry,
  type ShopItem,
  MAX_LEVEL,
  MAX_FRIENDSHIP,
  getBerryPlan,
  getItemName,
} from "../api/box";
import {
  getNextEvolutions,
  type NextEvolution,
  type EvolutionRequirement,
} from "../api/pokemon";
import ShopModal from "./ShopModal";

interface PokemonDetailProps {
  pokemon: MyPokemon;
  transferring: boolean;
  onClose: () => void;
  onFeed: (berry: Berry) => Promise<unknown>;
  onPlay: () => Promise<unknown>;
  onBuyItem: (item: ShopItem) => Promise<unknown>;
  onUnequip: () => Promise<unknown>;
  onEvolve: (next: NextEvolution) => Promise<unknown>;
  onRelease: () => Promise<unknown>;
}

function meetsRequirement(req: EvolutionRequirement, p: MyPokemon): boolean {
  switch (req.kind) {
    case "level":
      return p.level >= req.minLevel;
    case "friendship":
      return p.friendship >= MAX_FRIENDSHIP;
    case "item":
      return p.heldItem === req.itemKey;
    case "unsupported":
      return false;
  }
}

function describeRequirement(req: EvolutionRequirement, p: MyPokemon): string {
  switch (req.kind) {
    case "level":
      return `필요 레벨 ${req.minLevel} (현재 ${p.level})`;
    case "friendship":
      return `친밀도 MAX 필요 (현재 ${p.friendship}/${MAX_FRIENDSHIP})`;
    case "item":
      return `${req.itemName} 장착 필요${p.heldItem === req.itemKey ? "" : ` (현재 ${p.heldItem ? getItemName(p.heldItem) : "없음"})`}`;
    case "unsupported":
      return `미지원 진화 조건 (${req.trigger})`;
  }
}

export default function PokemonDetail({
  pokemon,
  transferring,
  onClose,
  onFeed,
  onPlay,
  onBuyItem,
  onUnequip,
  onEvolve,
  onRelease,
}: PokemonDetailProps) {
  const [nextEvolutions, setNextEvolutions] = useState<NextEvolution[] | undefined>(undefined);
  const [shopOpen, setShopOpen] = useState(false);

  const berries = getBerryPlan(pokemon.pokemonId);

  useEffect(() => {
    setNextEvolutions(undefined);
    getNextEvolutions(pokemon.pokemonId, pokemon.evolutionChainUrl).then(
      setNextEvolutions,
    );
  }, [pokemon.pokemonId, pokemon.evolutionChainUrl]);

  const handleRelease = async () => {
    if (transferring) return;
    if (!confirm(`${pokemon.nickname}을(를) 정말 놓아주시겠습니까?`)) return;
    await onRelease();
    onClose();
  };

  const handleBuyItem = async (item: ShopItem) => {
    await onBuyItem(item);
    setShopOpen(false);
  };

  const atMaxLevel = pokemon.level >= MAX_LEVEL;
  const atMaxFriendship = pokemon.friendship >= MAX_FRIENDSHIP;
  const acting = transferring;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl overflow-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
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

        <img
          src={pokemon.image}
          alt={pokemon.name}
          className="w-40 h-40 mx-auto object-contain"
        />

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

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-5 text-center">
          <div className="bg-slate-50 rounded-lg py-2">
            <div className="text-[11px] text-slate-400 uppercase tracking-wider">Lv</div>
            <div className="font-bold text-slate-800">{pokemon.level}<span className="text-xs text-slate-400"> / {MAX_LEVEL}</span></div>
          </div>
          <div className="bg-pink-50 rounded-lg py-2">
            <div className="text-[11px] text-pink-400 uppercase tracking-wider">친밀도</div>
            <div className="font-bold text-pink-600">{pokemon.friendship}<span className="text-xs text-pink-300"> / {MAX_FRIENDSHIP}</span></div>
          </div>
          <div className="bg-amber-50 rounded-lg py-2">
            <div className="text-[11px] text-amber-500 uppercase tracking-wider">포인트</div>
            <div className="font-bold text-amber-700">{pokemon.points} P</div>
          </div>
        </div>

        {/* Held item */}
        <div className="mb-5">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            장착 도구
          </div>
          {pokemon.heldItem ? (
            <div className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              <span className="text-sm font-medium text-amber-800">{getItemName(pokemon.heldItem)}</span>
              <button
                onClick={() => onUnequip()}
                disabled={acting}
                className="text-xs text-amber-700 border border-amber-300 px-2 py-1 rounded hover:bg-amber-100 disabled:opacity-50"
              >
                해제
              </button>
            </div>
          ) : (
            <div className="text-sm text-slate-400 px-3 py-2 bg-slate-50 rounded-lg text-center">
              장착된 도구가 없습니다
            </div>
          )}
        </div>

        {/* Berries */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              나무열매 먹이기
            </div>
            {atMaxLevel && (
              <div className="text-[11px] text-slate-400">레벨 MAX</div>
            )}
          </div>
          <div className="flex gap-2">
            {berries.map((berry) => (
              <button
                key={berry.key}
                onClick={() => onFeed(berry)}
                disabled={acting || atMaxLevel}
                className="flex-1 text-sm bg-green-50 border border-green-200 text-green-700 py-2 px-1.5 rounded-lg hover:bg-green-100 disabled:opacity-50 transition-colors leading-tight"
              >
                {berry.name}
                <br />
                <span className="text-xs text-green-500">+Lv {berry.levelGain}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Play & Shop */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          <button
            onClick={() => onPlay()}
            disabled={acting || atMaxFriendship}
            className="text-sm bg-pink-50 border border-pink-200 text-pink-700 py-2.5 rounded-lg hover:bg-pink-100 disabled:opacity-50 font-medium"
          >
            {atMaxFriendship ? "친밀도 MAX" : "놀아주기"}
          </button>
          <button
            onClick={() => setShopOpen(true)}
            disabled={acting}
            className="text-sm bg-amber-50 border border-amber-200 text-amber-700 py-2.5 rounded-lg hover:bg-amber-100 disabled:opacity-50 font-medium"
          >
            상점
          </button>
        </div>

        {/* Evolution */}
        <div className="mb-5">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            진화
          </div>
          {nextEvolutions === undefined ? (
            <div className="text-xs text-center text-slate-400 py-2">진화 정보 확인 중...</div>
          ) : nextEvolutions.length === 0 ? (
            <div className="text-xs text-center text-slate-400 py-1">
              더 이상 진화할 수 없습니다
            </div>
          ) : (
            <div className="space-y-2">
              {nextEvolutions.map((next) => {
                const ok = meetsRequirement(next.requirement, pokemon);
                return (
                  <div
                    key={next.pokemonId}
                    className="bg-purple-50 border border-purple-100 rounded-xl p-3 flex items-center gap-3"
                  >
                    <img
                      src={next.image}
                      alt={next.koreanName}
                      className="w-14 h-14 object-contain"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-800">
                        {next.koreanName}
                      </div>
                      <div className={`text-xs ${ok ? "text-slate-500" : "text-red-400"}`}>
                        {describeRequirement(next.requirement, pokemon)}
                      </div>
                    </div>
                    <button
                      onClick={() => onEvolve(next)}
                      disabled={!ok || acting}
                      className="text-sm bg-purple-600 text-white px-3 py-2 rounded-lg font-bold hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                    >
                      진화!
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button
          onClick={handleRelease}
          disabled={acting}
          className="w-full text-sm text-red-500 border border-red-200 py-2.5 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors font-medium"
        >
          놓아주기
        </button>
      </div>

      {shopOpen && (
        <ShopModal
          points={pokemon.points}
          acting={acting}
          onClose={() => setShopOpen(false)}
          onBuy={handleBuyItem}
        />
      )}
    </div>
  );
}
