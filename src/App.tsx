import { useState } from 'react';
import { Plus, List, FileText, ClipboardList } from 'lucide-react';
import OSForm from '@/components/OSForm';
import OSList from '@/components/OSList';
import FlashReportForm from '@/components/FlashReportForm';
import FlashReportList from '@/components/FlashReportList';
import type { OrdemServico, FlashReport } from '@/lib/supabase';

type Modulo = 'os' | 'flash';
type View = 'form' | 'list';

function App() {
  const [modulo, setModulo] = useState<Modulo>('os');
  const [view, setView] = useState<View>('form');
  const [editingOS, setEditingOS] = useState<OrdemServico | null>(null);
  const [editingFlash, setEditingFlash] = useState<FlashReport | null>(null);

  const trocarModulo = (m: Modulo) => {
    setModulo(m);
    setView('form');
    setEditingOS(null);
    setEditingFlash(null);
  };

  const goToNewForm = () => {
    setEditingOS(null);
    setEditingFlash(null);
    setView('form');
  };

  const handleEditOS = (os: OrdemServico) => {
    setEditingOS(os);
    setView('form');
  };

  const handleEditFlash = (r: FlashReport) => {
    setEditingFlash(r);
    setView('form');
  };

  const handleSaved = () => {
    setEditingOS(null);
    setEditingFlash(null);
    setView('list');
  };

  return (
    <div className="min-h-screen bg-[#F0F4F9]">
      {/* Topbar */}
      <div className="bg-[#0F2942] px-4 sm:px-6 py-3.5 flex items-center justify-between print:block">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#C8A84B] rounded-md flex items-center justify-center text-[13px] font-semibold text-[#0F2942]">
            LIA
          </div>
          <div className="text-[15px] font-medium text-white">
            {modulo === 'os' ? 'Ordem de Serviço' : 'Flash Report'}
            <span className="block text-[11px] font-light text-white/50 mt-0.5">
              Locações Inteligentes da Amazônia · V.POWER
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          {modulo === 'os' ? (
            <>
              <button
                onClick={goToNewForm}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${
                  view === 'form' ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white/90'
                }`}
              >
                <Plus size={14} />
                Nova OS
              </button>
              <button
                onClick={() => { setEditingOS(null); setView('list'); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${
                  view === 'list' ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white/90'
                }`}
              >
                <List size={14} />
                OS Salvas
              </button>
            </>
          ) : (
            <>
              <button
                onClick={goToNewForm}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${
                  view === 'form' ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white/90'
                }`}
              >
                <Plus size={14} />
                Novo Flash
              </button>
              <button
                onClick={() => { setEditingFlash(null); setView('list'); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${
                  view === 'list' ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white/90'
                }`}
              >
                <List size={14} />
                Flash Salvos
              </button>
            </>
          )}
        </div>
      </div>

      {/* Seletor de módulo */}
      <div className="bg-white border-b border-[#D8E4F0] px-4 sm:px-6 print:hidden">
        <div className="max-w-[760px] mx-auto flex gap-1 -mb-px">
          <button
            onClick={() => trocarModulo('os')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium border-b-2 transition-all ${
              modulo === 'os' ? 'border-[#1A4A7A] text-[#1A4A7A]' : 'border-transparent text-[#8FA3B8] hover:text-[#5A6B80]'
            }`}
          >
            <ClipboardList size={15} />
            OS Digital
          </button>
          <button
            onClick={() => trocarModulo('flash')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium border-b-2 transition-all ${
              modulo === 'flash' ? 'border-[#1A4A7A] text-[#1A4A7A]' : 'border-transparent text-[#8FA3B8] hover:text-[#5A6B80]'
            }`}
          >
            <FileText size={15} />
            Flash Report
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="pt-6">
        {modulo === 'os' ? (
          view === 'form' ? (
            <OSForm
              onSaved={handleSaved}
              editingOS={editingOS}
              onCancelEdit={() => { setEditingOS(null); setView('list'); }}
            />
          ) : (
            <OSList onBack={goToNewForm} onEdit={handleEditOS} />
          )
        ) : view === 'form' ? (
          <FlashReportForm
            onSaved={handleSaved}
            editingReport={editingFlash}
            onCancelEdit={() => { setEditingFlash(null); setView('list'); }}
          />
        ) : (
          <FlashReportList onBack={goToNewForm} onEdit={handleEditFlash} />
        )}
      </div>
    </div>
  );
}

export default App;
