import type { PokemonBiology } from '../api/biology.api';
import type { PokemonData } from '../lib/pokemon';

interface BiologyModalProps {
  selected: PokemonBiology;
  onClose: () => void;
}

export default function BiologyModal({ selected, onClose }: BiologyModalProps) {
  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" 
      onClick={onClose}
    >
      <div 
        className="bg-white p-6 rounded-lg max-w-lg w-full max-h-[90vh] overflow-auto shadow-xl" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold text-slate-900 leading-snug">{selected.videoTitle}</h2>
          <button onClick={onClose} className="text-slate-400 text-3xl leading-none px-2 hover:text-slate-600">&times;</button>
        </div>
        
        <img src={selected.pokemonImage} className="w-40 h-40 mx-auto mb-6 object-contain" alt="" />
        
        <div className="bg-slate-50 p-4 rounded-md mb-6 border-l-4 border-slate-200">
          <p className="text-slate-600 italic text-sm leading-relaxed">
            Q. {selected.primaryQuestion}
          </p>
        </div>

        {selected.videoLink && (
          <a 
            href={selected.videoLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className="block text-center bg-red-600 text-white py-2.5 rounded font-bold hover:bg-red-700 transition-colors mb-6 shadow-sm"
          >
            영상 보러가기
          </a>
        )}

        <div className="border-t pt-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Related</div>
          <div className="flex flex-wrap gap-2">
            {selected.relatedPokemon.map((p: PokemonData) => (
              <div key={p.name} className="flex items-center gap-2 border px-2.5 py-1 rounded bg-slate-50 text-slate-600">
                <img src={p.image} className="w-6 h-6 object-contain" alt="" />
                <span className="text-xs font-medium">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
