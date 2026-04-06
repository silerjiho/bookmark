import type { PokemonBiology } from '../api/biology';

interface ListCardProps {
  doc: PokemonBiology;
  onClick: (doc: PokemonBiology) => void;
}

export default function ListCard({ doc, onClick }: ListCardProps) {
  return (
    <div 
      onClick={() => onClick(doc)}
      className="border p-4 rounded cursor-pointer hover:bg-gray-50 flex items-center gap-4 transition-colors"
    >
      <img src={doc.pokemonImage} alt="" className="w-16 h-16 object-contain" />
      <div className="flex-1 min-w-0">
        <div className="font-bold text-slate-900">{doc.pokemon}</div>
        <div className="text-sm text-slate-500 truncate">{doc.videoTitle}</div>
      </div>
    </div>
  );
}
