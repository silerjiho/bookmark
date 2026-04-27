import { MAX_FRIENDSHIP, getItemName, type MyPokemon } from "../api/box";
import { TYPE_COLORS, getTypeTextColor } from "../api/pokemon";

export type CardKind = "normal" | "creating" | "growing" | "parting";

interface PokemonCardProps {
  pokemon: MyPokemon | null;
  /** Optimistic snapshot, used when kind === "growing" to render the *target* values. */
  optimistic?: MyPokemon | null;
  kind: CardKind;
  onClick?: (p: MyPokemon) => void;
}

const PILL = "px-2 py-0.5 rounded-full text-[11px] font-medium tracking-tight";

function StatusBadge({ kind }: { kind: Exclude<CardKind, "normal"> }) {
  const config = {
    creating: {
      label: "전송중",
      bg: "bg-[#0071e3]",
      fg: "text-white",
    },
    growing: {
      label: "성장중",
      bg: "bg-[#0071e3]",
      fg: "text-white",
    },
    parting: {
      label: "이별 하는 중..",
      bg: "bg-[#1d1d1f]",
      fg: "text-white",
    },
  }[kind];
  return (
    <div
      className={`absolute top-3 left-3 ${config.bg} ${config.fg} ${PILL} apple-card-shadow z-10`}
    >
      {config.label}
    </div>
  );
}

function PokeballSpinner() {
  return (
    <div className="relative w-20 h-20 animate-pokeball">
      <div className="absolute inset-0 rounded-full bg-linear-to-b from-[#dc2626] to-[#dc2626] [background:linear-gradient(to_bottom,#dc2626_0%,#dc2626_50%,#fafafa_50%,#fafafa_100%)] border-[3px] border-[#1d1d1f]" />
      <div className="absolute top-1/2 left-0 right-0 h-1.5 bg-[#1d1d1f] -translate-y-1/2" />
      <div className="absolute top-1/2 left-1/2 w-6 h-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#fafafa] border-[3px] border-[#1d1d1f]" />
      <div className="absolute top-1/2 left-1/2 w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1d1d1f]" />
    </div>
  );
}

function CreatingCard({ optimistic }: { optimistic: MyPokemon | null }) {
  return (
    <div className="relative bg-[#f5f5f7] rounded-2xl p-5 overflow-hidden apple-card-shadow">
      <StatusBadge kind="creating" />
      <div className="aspect-square flex items-center justify-center mb-3 relative">
        {optimistic?.image ? (
          <>
            <img
              src={optimistic.image}
              alt=""
              className="w-full h-full object-contain opacity-30 blur-[1px]"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <PokeballSpinner />
            </div>
          </>
        ) : (
          <PokeballSpinner />
        )}
      </div>
      <div className="text-center">
        <div className="text-[15px] font-semibold text-[#1d1d1f] tracking-tight">
          {optimistic?.name ?? "포켓몬을 받는 중"}
        </div>
        <div className="text-[12px] text-[rgba(0,0,0,0.48)] mt-1">
          전송기에서 신호를 받는 중...
        </div>
      </div>
    </div>
  );
}

function FriendshipDots({ value }: { value: number }) {
  return (
    <div className="flex gap-0.75 justify-center mt-1">
      {Array.from({ length: MAX_FRIENDSHIP }, (_, i) => (
        <span
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${
            i < value ? "bg-[#ff375f]" : "bg-[rgba(0,0,0,0.12)]"
          }`}
        />
      ))}
    </div>
  );
}

function TypeChips({ types }: { types: string[] }) {
  return (
    <div className="flex gap-1 justify-center mt-1.5 flex-wrap">
      {types.map((t) => (
        <span
          key={t}
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full tracking-tight"
          style={{
            backgroundColor: TYPE_COLORS[t] ?? "#9FA19F",
            color: getTypeTextColor(t),
          }}
        >
          {t}
        </span>
      ))}
    </div>
  );
}

function PokemonInfo({ pokemon }: { pokemon: MyPokemon }) {
  return (
    <div className="text-center w-full">
      <div className="text-[15px] font-semibold text-[#1d1d1f] tracking-tight truncate">
        {pokemon.name}
      </div>
      <div className="text-[12px] font-medium text-[rgba(0,0,0,0.8)] mt-1 tracking-tight">
        Lv.{pokemon.level}
      </div>
      <FriendshipDots value={pokemon.friendship} />
      <TypeChips types={pokemon.types} />
      {pokemon.heldItem && (
        <div
          className="text-[10px] text-[#0066cc] mt-1.5 truncate font-medium"
          title={getItemName(pokemon.heldItem)}
        >
          · {getItemName(pokemon.heldItem)} ·
        </div>
      )}
    </div>
  );
}

export default function PokemonCard({
  pokemon,
  optimistic,
  kind,
  onClick,
}: PokemonCardProps) {
  if (kind === "creating") {
    return <CreatingCard optimistic={optimistic ?? pokemon} />;
  }
  if (!pokemon) return null;

  const interactive = kind === "normal";
  const isParting = kind === "parting";
  const isGrowing = kind === "growing";
  // Always render the server snapshot — never the optimistic snapshot.
  // The post-evolution image must only appear once GitHub actually reflects the change.
  const display = pokemon;

  return (
    <button
      type="button"
      onClick={interactive && onClick ? () => onClick(pokemon) : undefined}
      disabled={!interactive}
      className={`group relative bg-[#f5f5f7] rounded-2xl p-5 text-left overflow-hidden apple-card-shadow transition-transform ${
        interactive
          ? "hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          : "cursor-default"
      }`}
    >
      {kind !== "normal" && <StatusBadge kind={kind} />}

      <div className="aspect-square flex items-center justify-center mb-3 relative">
        <img
          src={display.image}
          alt={display.name}
          className={`w-full h-full object-contain ${
            isGrowing ? "animate-growing" : ""
          } ${isParting ? "animate-parting" : ""}`}
        />
        {isGrowing && (
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 text-2xl animate-particle">
              ✨
            </div>
            <div
              className="absolute top-1/2 left-2 text-xl animate-particle"
              style={
                {
                  ["--dx" as string]: "-20px",
                  ["--dy" as string]: "-80px",
                  animationDelay: "200ms",
                } as React.CSSProperties
              }
            >
              ✦
            </div>
            <div
              className="absolute bottom-2 right-2 text-xl animate-particle"
              style={
                {
                  ["--dx" as string]: "20px",
                  ["--dy" as string]: "-100px",
                  animationDelay: "400ms",
                } as React.CSSProperties
              }
            >
              ✦
            </div>
          </div>
        )}
      </div>

      <PokemonInfo pokemon={display} />
    </button>
  );
}
