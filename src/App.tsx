import { useState } from 'react';
import { Plus, List } from 'lucide-react';
import OSForm from '@/components/OSForm';
import OSList from '@/components/OSList';

type View = 'form' | 'list';

function App() {
  const [view, setView] = useState<View>('form');

  return (
    <div className="min-h-screen bg-[#F0F4F9]">
      {/* Topbar */}
      <div className="bg-[#0F2942] px-4 sm:px-6 py-3.5 flex items-center justify-between print:block">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#C8A84B] rounded-md flex items-center justify-center text-[13px] font-semibold text-[#0F2942]">
            LIA
          </div>
          <div className="text-[15px] font-medium text-white">
            Ordem de Serviço
            <span className="block text-[11px] font-light text-white/50 mt-0.5">
              Locações Inteligentes da Amazônia · V.POWER
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <button
            onClick={() => setView('form')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${
              view === 'form' ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white/90'
            }`}
          >
            <Plus size={14} />
            Nova OS
          </button>
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${
              view === 'list' ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white/90'
            }`}
          >
            <List size={14} />
            OS Salvas
          </button>
          <div className="hidden sm:block text-[11px] bg-white/12 text-white/80 px-2.5 py-1 rounded-full">
            OS Digital
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-6">
        {view === 'form' ? (
          <OSForm onSaved={() => setView('list')} />
        ) : (
          <OSList onBack={() => setView('form')} />
        )}
      </div>
    </div>
  );
}

export default App;
