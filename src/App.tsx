import { useEffect, useState } from 'react';
import { readBiology, type PokemonBiology } from './api/biology';
import ListCard from './components/ListCard';
import BiologyModal from './components/BiologyModal';

export default function App() {
  const [docs, setDocs] = useState<PokemonBiology[]>([]);
  const [selected, setSelected] = useState<PokemonBiology | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    readBiology().then(setDocs).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-12 text-center text-slate-400 font-medium">Loading Biology Documents...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 font-sans">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {docs.map((doc) => (
          <ListCard 
            key={doc.id} 
            doc={doc} 
            onClick={setSelected} 
          />
        ))}
      </div>

      {selected && (
        <BiologyModal 
          selected={selected} 
          onClose={() => setSelected(null)} 
        />
      )}

      {docs.length === 0 && !loading && (
        <div className="text-center py-24 text-slate-400 font-medium">데이터가 없습니다.</div>
      )}
    </div>
  );
}
