import { useState, useEffect, useCallback } from 'react';
import { Eye, Trash2, ArrowLeft, Search, FileText, Pencil, Printer } from 'lucide-react';
import { supabase, type FlashReport } from '@/lib/supabase';

interface FlashReportListProps {
  onBack: () => void;
  onEdit: (r: FlashReport) => void;
}

export default function FlashReportList({ onBack, onEdit }: FlashReportListProps) {
  const [reports, setReports] = useState<FlashReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<FlashReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.from('flash_reports').select('*').order('created_at', { ascending: false });
      if (err) throw err;
      setReports((data ?? []) as FlashReport[]);
    } catch (err) {
      setError(`Erro ao carregar: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este Flash Report?')) return;
    try {
      const { error: err } = await supabase.from('flash_reports').delete().eq('id', id);
      if (err) throw err;
      setReports((prev) => prev.filter((r) => r.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch (err) {
      setError(`Erro ao excluir: ${(err as Error).message}`);
    }
  };

  const filtered = reports.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.cliente?.toLowerCase().includes(q) ||
      r.tecnico?.toLowerCase().includes(q) ||
      r.regiao?.toLowerCase().includes(q)
    );
  });

  if (selected) {
    const fotos = [
      { src: selected.foto1, label: selected.foto1_label },
      { src: selected.foto2, label: selected.foto2_label },
      { src: selected.foto3, label: selected.foto3_label },
    ].filter((f) => f.src);

    return (
      <div className="max-w-[760px] mx-auto px-4 pb-16">
        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-[#1A4A7A] hover:text-[#2D6FAA] mb-4 text-[14px] font-medium">
          <ArrowLeft size={18} />Voltar para lista
        </button>

        <div className="bg-white rounded-xl border border-[#D8E4F0] overflow-hidden mb-4">
          <div className="px-5 py-3 bg-[#F7F9FC] border-b border-[#D8E4F0] flex items-center gap-2.5">
            <FileText size={14} className="text-[#1A4A7A]" />
            <div className="text-[12px] font-semibold text-[#1A4A7A] tracking-wide">{selected.cliente}</div>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailRow label="Data" value={selected.data ? new Date(selected.data + 'T00:00:00').toLocaleDateString('pt-BR') : null} />
              <DetailRow label="Técnico Responsável" value={selected.tecnico} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <DetailRow label="Região" value={selected.regiao} />
              <DetailRow label="Hora Início" value={selected.hora_inicio} />
              <DetailRow label="Hora Final" value={selected.hora_final} />
            </div>
            <DetailRow label="Consequência Real" value={selected.cons_real} />
            <DetailRow label="Consequência Potencial" value={selected.cons_pot} />
            <DetailRow label="Tipo / Causa do Desvio" value={selected.tipo_desvio} />
            <DetailRow label="Descrição do Evento" value={selected.descricao} />
            <DetailRow label="Ações Imediatas" value={selected.acoes} />
            <DetailRow label="Observações" value={selected.observacoes} />
            <DetailRow label="Responsável pela Comunicação" value={selected.resp_com} />

            {fotos.length > 0 && (
              <div>
                <div className="text-[11.5px] font-medium text-[#5A6B80] mb-2">Fotos</div>
                <div className="flex flex-wrap gap-3">
                  {fotos.map((f, i) => (
                    <div key={i} className="text-center">
                      <img src={f.src as string} alt={f.label ?? ''} className="w-24 h-24 object-cover rounded-lg border border-[#D8E4F0]" />
                      {f.label && <div className="text-[10px] text-[#8FA3B8] mt-1 max-w-24">{f.label}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 justify-center flex-wrap">
          <button onClick={() => onEdit(selected)} className="px-6 py-3 bg-white text-[#1A4A7A] border border-[#1A4A7A] rounded-lg text-[14px] font-medium hover:bg-[#E8F0FA] transition-colors inline-flex items-center gap-2">
            <Pencil size={16} />Editar
          </button>
          <button onClick={() => window.print()} className="px-6 py-3 bg-[#0F2942] text-white rounded-lg text-[14px] font-medium hover:bg-[#1A4A7A] transition-colors inline-flex items-center gap-2">
            <Printer size={16} />Gerar PDF
          </button>
          <button onClick={() => handleDelete(selected.id)} className="px-6 py-3 bg-white text-red-500 border border-red-200 rounded-lg text-[14px] font-medium hover:bg-red-50 transition-colors inline-flex items-center gap-2">
            <Trash2 size={16} />Excluir
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[760px] mx-auto px-4 pb-16">
      <button onClick={onBack} className="flex items-center gap-2 text-[#1A4A7A] hover:text-[#2D6FAA] mb-4 text-[14px] font-medium">
        <ArrowLeft size={18} />Voltar para formulário
      </button>

      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8FA3B8]" />
        <input
          type="text"
          placeholder="Buscar por cliente, técnico, região..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-[#D8E4F0] rounded-lg text-[13px] outline-none focus:border-[#2D6FAA] focus:shadow-[0_0_0_3px_rgba(45,111,170,.1)] transition-all"
        />
      </div>

      {error && <div className="p-3 rounded-lg text-[13px] bg-red-50 text-red-700 border border-red-200 mb-4">{error}</div>}

      {loading ? (
        <div className="text-center py-12 text-[#8FA3B8] text-[14px]">Carregando Flash Reports...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-[#8FA3B8] text-[14px]">
          {reports.length === 0 ? 'Nenhum Flash Report salvo ainda.' : 'Nenhum resultado encontrado.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-[#D8E4F0] p-4 hover:border-[#2D6FAA] transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <span className="text-[14px] font-semibold text-[#0F2942]">{r.cliente}</span>
                  <div className="text-[13px] font-medium text-[#1A4A7A] mt-1">{r.tecnico}</div>
                  <div className="text-[12px] text-[#5A6B80] mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                    <span>Região: {r.regiao}</span>
                    <span>{r.data ? new Date(r.data + 'T00:00:00').toLocaleDateString('pt-BR') : ''}</span>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => setSelected(r)} className="p-2 text-[#1A4A7A] hover:bg-[#E8F0FA] rounded-lg transition-colors" title="Visualizar">
                    <Eye size={18} />
                  </button>
                  <button onClick={() => handleDelete(r.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-[11.5px] font-medium text-[#5A6B80]">{label}</div>
      <div className="text-[13px] text-[#1A2535] mt-0.5">{value}</div>
    </div>
  );
}
