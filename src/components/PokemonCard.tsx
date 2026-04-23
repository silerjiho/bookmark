import { MAX_FRIENDSHIP, getItemName, type MyPokemon } from "../api/box";

interface PokemonCardProps {
  pokemon: MyPokemon;
  onClick: (pokemon: MyPokemon) => void;
}

export default function PokemonCard({ pokemon, onClick }: PokemonCardProps) {
  return (
    <div
      onClick={() => onClick(pokemon)}
      className="border rounded-xl p-4 cursor-pointer hover:bg-slate-50 transition-colors flex flex-col items-center gap-2 shadow-sm"
    >
      <img
        src={pokemon.image}
        alt={pokemon.name}
        className="w-24 h-24 object-contain"
      />
      <div className="text-center w-full">
        <div className="font-bold text-slate-900">{pokemon.nickname}</div>
        {pokemon.nickname !== pokemon.name && (
          <div className="text-xs text-slate-400">{pokemon.name}</div>
        )}
        <div className="text-sm font-medium text-slate-500 mt-0.5">
          Lv.{pokemon.level}
        </div>
        <div className="text-xs text-pink-500 mt-0.5 tracking-tighter">
          친밀도 {pokemon.friendship}/{MAX_FRIENDSHIP}
        </div>
        {pokemon.heldItem && (
          <div className="text-[10px] text-amber-600 mt-1 truncate" title={getItemName(pokemon.heldItem)}>
            [{getItemName(pokemon.heldItem)}]
          </div>
        )}
        <div className="flex gap-1 justify-center mt-1 flex-wrap">
          {pokemon.types.map((t) => (
            <span
              key={t}
              className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
