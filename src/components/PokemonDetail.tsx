import { useRef, useState } from "react";
import {
  type MyPokemon,
  MAX_LEVEL,
  MAX_FRIENDSHIP,
} from "../lib/box";
import { getBerryPlan } from "../lib/berries";
import { type ShopItem, getItemName } from "../lib/items";
import {
  TYPE_COLORS,
  getTypeTextColor,
  type EvolutionRequirement,
} from "../lib/pokemon";
import type { PendingKind } from "../store/boxStore";
import ShopModal from "./ShopModal";
import { useParticles } from "../hooks/useParticles";
import { useEvolution } from "../hooks/useEvolution";
import { usePokemonActions } from "../hooks/usePokemonActions";

interface Props {
  pokemon: MyPokemon;
  pendingKind: PendingKind | null;
  onClose: () => void;
}

function describe(req: EvolutionRequirement, p: MyPokemon): string {
  switch (req.kind) {
    case "level":
      return `필요 레벨 ${req.minLevel} (현재 ${p.level})`;
    case "friendship":
      return `친밀도 MAX 필요 (현재 ${p.friendship}/${MAX_FRIENDSHIP})`;
    case "item":
      return `${req.itemName} 장착 필요${
        p.heldItem === req.itemKey
          ? ""
          : ` (현재 ${p.heldItem ? getItemName(p.heldItem) : "없음"})`
      }`;
    case "unsupported":
    default:
      return `미지원 진화 조건 (${req.kind === "unsupported" ? req.trigger : "알 수 없음"})`;
  }
}

export default function PokemonDetail({
  pokemon,
  pendingKind,
  onClose,
}: Props) {
  const [shopOpen, setShopOpen] = useState(false);
  const heartRef = useRef<HTMLDivElement>(null);

  const acting = pendingKind != null;
  const berries = getBerryPlan(pokemon.pokemonId);

  const { particles, burstParticles } = useParticles();
  const { nextEvolutions, checkMeetsRequirement } = useEvolution(pokemon);
  
  const {
    handleFeed,
    handlePlay,
    handleBuy,
    handleUnequip,
    handleEvolve,
    handleRelease,
    evolveFlash,
    releaseAnim,
  } = usePokemonActions({
    pokemon,
    acting,
    onBurstParticles: burstParticles,
    onClose,
  });

  const wrappedHandlePlay = async () => {
    if (acting || pokemon.friendship >= MAX_FRIENDSHIP) return;
    if (heartRef.current) {
      heartRef.current.classList.remove("animate-heart-pop");
      void heartRef.current.offsetWidth;
      heartRef.current.classList.add("animate-heart-pop");
    }
    await handlePlay();
  };

  const wrappedHandleBuy = async (item: ShopItem) => {
    const success = await handleBuy(item);
    if (success) setShopOpen(false);
  };

  const atMaxLevel = pokemon.level >= MAX_LEVEL;
  const atMaxFriendship = pokemon.friendship >= MAX_FRIENDSHIP;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center apple-glass animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md max-h-[92vh] overflow-auto sm:rounded-2xl rounded-t-3xl shadow-[0_-10px_60px_rgba(0,0,0,0.2)] animate-in zoom-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ───────────────────────────────────────── */}
        <div className="sticky top-0 bg-white/85 backdrop-blur-xl px-5 py-3 flex items-center justify-between border-b border-black/6 z-10">
          <div className="min-w-0">
            <h2 className="text-[17px] font-semibold text-[#1d1d1f] tracking-tight truncate">
              {pokemon.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/6 hover:bg-black/12 text-[#1d1d1f] flex items-center justify-center text-[15px] leading-none transition"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* ── Pending banner ───────────────────────────────── */}
        {pendingKind && (
          <div
            className={`px-5 py-2.5 text-[13px] font-medium tracking-tight text-white ${
              pendingKind === "parting" ? "bg-[#1d1d1f]" : "bg-[#0071e3]"
            }`}
          >
            {pendingKind === "creating" &&
              "전송중 — 새로운 친구가 박스에 도착하고 있어요"}
            {pendingKind === "parting" &&
              "이별 하는 중.. — 야생으로 돌려보내는 중이에요"}
          </div>
        )}

        {/* ── Sprite ───────────────────────────────────────── */}
        <div className="relative px-6 pt-6 pb-2 bg-[#f5f5f7]">
          <div className="aspect-square max-w-65 mx-auto relative">
            <img
              src={pokemon.image}
              alt={pokemon.name}
              className={`w-full h-full object-contain ${
                evolveFlash ? "animate-evolve-shimmer" : ""
              } ${releaseAnim ? "animate-release" : ""}`}
            />
            {evolveFlash && (
              <div className="absolute inset-0 rounded-full animate-evolve-flash pointer-events-none" />
            )}
            {/* Particle layer */}
            <div className="absolute inset-0 pointer-events-none overflow-visible">
              {particles.map((p) => (
                <span
                  key={p.id}
                  className="absolute left-1/2 bottom-1/2 text-2xl animate-particle"
                  style={
                    {
                      ["--dx" as string]: `${p.dx}px`,
                      ["--dy" as string]: `${p.dy}px`,
                      animationDelay: `${p.delay}ms`,
                    } as React.CSSProperties
                  }
                >
                  {p.emoji}
                </span>
              ))}
            </div>
          </div>

          {/* Type pills */}
          <div className="flex gap-1.5 justify-center mt-3 mb-1">
            {pokemon.types.map((t: string) => (
              <span
                key={t}
                className="text-[12px] px-3 py-0.5 rounded-full font-semibold tracking-tight"
                style={{
                  backgroundColor: TYPE_COLORS[t] ?? "#9FA19F",
                  color: getTypeTextColor(t),
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>


        {/* ── Stats ────────────────────────────────────────── */}
        <div className="px-5 pt-4 grid grid-cols-3 gap-2">
          <Stat label="LEVEL" value={pokemon.level} max={MAX_LEVEL} />
          <Stat label="친밀도" value={pokemon.friendship} max={MAX_FRIENDSHIP}>
            <div ref={heartRef} className="flex gap-0.5 justify-center mt-0.5">
              {Array.from({ length: MAX_FRIENDSHIP }, (_, i) => (
                <span
                  key={i}
                  className={`w-1 h-1 rounded-full ${
                    i < pokemon.friendship ? "bg-[#ff375f]" : "bg-black/12"
                  }`}
                />
              ))}
            </div>
          </Stat>
          <Stat label="포인트" value={pokemon.points} suffix=" P" />
        </div>

        {/* ── Held item ────────────────────────────────────── */}
        <Section title="장착 도구">
          {pokemon.heldItem ? (
            <div className="flex items-center justify-between bg-[#f5f5f7] rounded-xl px-3.5 py-2.5">
              <span className="text-[14px] font-medium text-[#1d1d1f] tracking-tight">
                {getItemName(pokemon.heldItem)}
              </span>
              <button
                onClick={handleUnequip}
                disabled={acting}
                className="text-[12px] font-medium text-[#0066cc] hover:underline disabled:opacity-40 tracking-tight"
              >
                해제
              </button>
            </div>
          ) : (
            <div className="text-[13px] text-[rgba(0,0,0,0.48)] tracking-tight bg-[#f5f5f7] rounded-xl px-3.5 py-2.5 text-center">
              장착된 도구가 없습니다
            </div>
          )}
        </Section>

        {/* ── Berries ──────────────────────────────────────── */}
        <Section
          title="나무열매 먹이기"
          right={
            atMaxLevel ? (
              <span className="text-[11px] text-[rgba(0,0,0,0.48)]">
                레벨 MAX
              </span>
            ) : null
          }
        >
          <div className="grid grid-cols-3 gap-2">
            {berries.map((berry) => (
              <button
                key={berry.key}
                onClick={() => handleFeed(berry)}
                disabled={acting || atMaxLevel}
                className="group relative bg-[#f5f5f7] hover:bg-black/6 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl h-16 transition text-[#1d1d1f] overflow-hidden"
              >
                {/* Default: Image */}
                <div className="absolute inset-0 flex items-center justify-center transition-opacity duration-200 group-hover:opacity-0">
                  <img
                    src={berry.image}
                    alt={berry.name}
                    className="w-10 h-10 object-contain"
                  />
                </div>
                {/* Hover: Info */}
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="text-[12px] font-semibold tracking-tight leading-tight">
                    {berry.name}
                  </div>
                  <div className="text-[10px] text-[#0066cc] font-medium tracking-tight">
                    +Lv {berry.levelGain}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Section>

        {/* ── Play & Shop ──────────────────────────────────── */}
        <Section>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={wrappedHandlePlay}
              disabled={acting || atMaxFriendship}
              className="bg-[#f5f5f7] hover:bg-black/6 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl py-3 text-[14px] font-medium text-[#1d1d1f] tracking-tight transition"
            >
              {atMaxFriendship ? "친밀도 MAX" : "놀아주기"}
            </button>
            <button
              onClick={() => setShopOpen(true)}
              disabled={acting}
              className="bg-[#f5f5f7] hover:bg-black/6 active:scale-[0.97] disabled:opacity-40 rounded-xl py-3 text-[14px] font-medium text-[#1d1d1f] tracking-tight transition"
            >
              상점
            </button>
          </div>
        </Section>

        {/* ── Evolution ────────────────────────────────────── */}
        <Section title="진화">
          {nextEvolutions === undefined ? (
            <div className="text-[12px] text-center text-[rgba(0,0,0,0.48)] py-2 tracking-tight">
              진화 정보 확인 중...
            </div>
          ) : nextEvolutions.length === 0 ? (
            <div className="text-[12px] text-center text-[rgba(0,0,0,0.48)] py-1 tracking-tight">
              더 이상 진화할 수 없습니다
            </div>
          ) : (
            <div className="space-y-2">
              {nextEvolutions.map((next) => {
                const ok = checkMeetsRequirement(next.requirement);
                return (
                  <div
                    key={next.pokemonId}
                    className="bg-[#f5f5f7] rounded-xl p-3 flex items-center gap-3"
                  >
                    <img
                      src={next.image}
                      alt={next.koreanName}
                      className="w-14 h-14 object-contain"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold text-[#1d1d1f] tracking-tight">
                        {next.koreanName}
                      </div>
                      <div
                        className={`text-[12px] tracking-tight ${
                          ok ? "text-[rgba(0,0,0,0.48)]" : "text-[#ff453a]"
                        }`}
                      >
                        {describe(next.requirement, pokemon)}
                      </div>
                    </div>
                    <button
                      onClick={() => handleEvolve(next)}
                      disabled={!ok || acting}
                      className="bg-[#0071e3] hover:brightness-110 active:scale-[0.97] disabled:bg-black/8 disabled:text-[rgba(0,0,0,0.32)] disabled:cursor-not-allowed text-white text-[13px] font-medium rounded-full px-4 py-1.5 tracking-tight transition"
                    >
                      진화
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* ── Release ──────────────────────────────────────── */}
        <div className="px-5 pb-6 pt-2">
          <button
            onClick={handleRelease}
            disabled={acting}
            className="w-full bg-white hover:bg-[#fff5f5] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed border border-[#ff453a]/30 text-[#ff453a] text-[14px] font-medium py-3 rounded-full tracking-tight transition"
          >
            놓아주기
          </button>
        </div>
      </div>

      {shopOpen && (
        <ShopModal
          points={pokemon.points}
          acting={acting}
          onClose={() => setShopOpen(false)}
          onBuy={wrappedHandleBuy}
        />
      )}
    </div>
  );
}

function Section({
  title,
  right,
  children,
}: {
  title?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="px-5 pt-5">
      {(title || right) && (
        <div className="flex items-center justify-between mb-2">
          {title && (
            <div className="text-[11px] font-semibold text-[rgba(0,0,0,0.48)] uppercase tracking-[0.08em]">
              {title}
            </div>
          )}
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  max,
  suffix,
  children,
}: {
  label: string;
  value: number;
  max?: number;
  suffix?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-[#f5f5f7] rounded-xl py-2.5 text-center">
      <div className="text-[10px] font-semibold text-[rgba(0,0,0,0.48)] uppercase tracking-[0.08em]">
        {label}
      </div>
      <div className="text-[16px] font-semibold text-[#1d1d1f] tracking-tight mt-0.5">
        {value}
        {suffix && (
          <span className="text-[12px] text-[rgba(0,0,0,0.48)] ml-0.5">
            {suffix}
          </span>
        )}
        {max && (
          <span className="text-[11px] text-[rgba(0,0,0,0.48)] font-normal">
            {" "}
            / {max}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
