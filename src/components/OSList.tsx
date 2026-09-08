import { useState, useEffect, useCallback } from 'react';
import { Eye, Trash2, ArrowLeft, Search, FileText, ShieldCheck, Clock } from 'lucide-react';
import { supabase, type OrdemServico } from '@/lib/supabase';
import SignaturePad from './SignaturePad';

interface OSListProps {
  onBack: () => void;
}

export default function OSList({ onBack }: OSListProps) {
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<OrdemServico | null>(null);
  const [error, setError] = useState<string | null>(null);

  // --- Aprovação do gerente (assinatura pós-criação) ---
  const [aprovNome, setAprovNome] = useState('');
  const [aprovCargo, setAprovCargo] = useState('');
  const [aprovSigImg, setAprovSigImg] = useState<string | null>(null);
  const [aprovSaving, setAprovSaving] = useState(false);
  const [aprovError, setAprovError] = useState<string | null>(null);

  const fetchOrdens = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('ordens_servico')
        .select('*')
        .order('created_at', { ascending: false });
      if (err) throw err;
      setOrdens((data ?? []) as OrdemServico[]);
    } catch (err) {
      setError(`Erro ao carregar: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrdens(); }, [fetchOrdens]);

  // sempre que abrir uma OS diferente, recarrega o estado de aprovação a partir dela
  useEffect(() => {
    if (selected) {
      setAprovNome(selected.sig_cliente ?? '');
      setAprovCargo(selected.sig_cliente_cargo ?? '');
      setAprovSigImg(selected.sig_cliente_img ?? null);
      setAprovError(null);
    }
  }, [selected]);

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta OS?')) return;
    try {
      const { error: err } = await supabase.from('ordens_servico').delete().eq('id', id);
      if (err) throw err;
      setOrdens((prev) => prev.filter((o) => o.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch (err) {
      setError(`Erro ao excluir: ${(err as Error).message}`);
    }
  };

  const handleAprovar = async () => {
    if (!selected) return;
    setAprovError(null);
    if (!aprovNome.trim()) {
      setAprovError('Informe o nome de quem está aprovando.');
      return;
    }
    if (!aprovSigImg) {
      setAprovError('Assine no quadro acima para confirmar a aprovação.');
      return;
    }
    setAprovSaving(true);
    try {
      const hoje = new Date().toISOString().split('T')[0];
      const { error: err } = await supabase
        .from('ordens_servico')
        .update({
          sig_cliente: aprovNome,
          sig_cliente_cargo: aprovCargo || null,
          sig_cliente_img: aprovSigImg,
          sig_cliente_data: hoje,
        })
        .eq('id', selected.id);
      if (err) throw err;

      const atualizado: OrdemServico = {
        ...selected,
        sig_cliente: aprovNome,
        sig_cliente_cargo: aprovCargo || null,
        sig_cliente_img: aprovSigImg,
        sig_cliente_data: hoje,
      };
      setSelected(atualizado);
      setOrdens((prev) => prev.map((o) => (o.id === selected.id ? atualizado : o)));
    } catch (err) {
      setAprovError(`Erro ao salvar aprovação: ${(err as Error).message}`);
    } finally {
      setAprovSaving(false);
    }
  };

  const filtered = ordens.filter((o) => {
    const q = search.toLowerCase();
    return (
      o.numero_os?.toLowerCase().includes(q) ||
      o.cliente?.toLowerCase().includes(q) ||
      o.gerador?.toLowerCase().includes(q) ||
      o.tecnico?.toLowerCase().includes(q) ||
      o.regiao?.toLowerCase().includes(q)
    );
  });

  const statusColor = (status: string) => {
    if (status.includes('normalizado')) return '#1A6B3C';
    if (status.includes('boas')) return '#2D6FAA';
    if (status.includes('Inoperante')) return '#AA2222';
    return '#C8A84B';
  };

  const AprovacaoBadge = ({ aprovado }: { aprovado: boolean }) => (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
        aprovado
          ? 'text-[#1A6B3C] border-[#1A6B3C] bg-[#EAF5EE]'
          : 'text-[#C8A84B] border-[#C8A84B] bg-[#FBF6E9]'
      }`}
    >
      {aprovado ? <ShieldCheck size={12} /> : <Clock size={12} />}
      {aprovado ? 'Aprovado' : 'Aguardando aprovação'}
    </span>
  );

  if (selected) {
    const aprovado = !!selected.sig_cliente_img;

    return (
      <div className="max-w-[760px] mx-auto px-4 pb-16">
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-2 text-[#1A4A7A] hover:text-[#2D6FAA] mb-4 text-[14px] font-medium"
        >
          <ArrowLeft size={18} />
          Voltar para lista
        </button>

        <div className="bg-white rounded-xl border border-[#D8E4F0] overflow-hidden mb-4">
          <div className="px-5 py-3 bg-[#F7F9FC] border-b border-[#D8E4F0] flex items-center justify-between gap-2.5 flex-wrap">
            <div className="flex items-center gap-2.5">
              <FileText size={14} className="text-white" />
              <div className="text-[12px] font-semibold text-[#1A4A7A] tracking-wide">
                OS {selected.numero_os}
              </div>
            </div>
            <AprovacaoBadge aprovado={aprovado} />
          </div>
          <div className="p-5 space-y-4">
            <DetailRow label="Tipo" value={selected.tipo} />
            <DetailRow label="Cliente" value={selected.cliente} />
            <DetailRow label="Contrato" value={selected.contrato} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <DetailRow label="Região" value={selected.regiao} />
              <DetailRow label="Gerador" value={selected.gerador} />
              <DetailRow label="Horímetro" value={selected.horimetro} />
            </div>
            <DetailRow label="Modelo / Série" value={selected.modelo} />
            <DetailRow label="Técnico" value={selected.tecnico} />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <DetailRow label="Data Abertura" value={selected.data_abertura} />
              <DetailRow label="Data Conclusão" value={selected.data_conclusao} />
              <DetailRow label="Hora Início" value={selected.hora_inicio} />
              <DetailRow label="Hora Conclusão" value={selected.hora_conclusao} />
            </div>
            <DetailRow label="Responsável" value={selected.responsavel} />
            <DetailRow label="Defeito" value={selected.defeito} />
            <DetailRow label="Prioridade" value={selected.prioridade} />
            <DetailRow label="Componentes" value={(selected.componentes ?? []).join(', ')} />
            <DetailRow label="Outro componente" value={selected.outro_componente} />
            <DetailRow label="Causa raiz" value={selected.causa_raiz} />
            <DetailRow label="Diagnóstico" value={selected.diagnostico} />
            <DetailRow label="Intervenções" value={selected.intervencoes} />
            <DetailRow label="Serviço" value={selected.servico} />
            <DetailRow label="Status final" value={selected.status_final} />
            <DetailRow label="Prazo" value={selected.prazo} />
            <DetailRow label="Observações" value={selected.observacoes} />
            <DetailRow label="Próxima manutenção" value={selected.proxima_manutencao} />

            {(selected.fotos ?? []).length > 0 && (
              <div>
                <div className="text-[11.5px] font-medium text-[#5A6B80] mb-2">Fotos</div>
                <div className="flex flex-wrap gap-2">
                  {selected.fotos.map((foto, i) => (
                    <img key={i} src={foto} alt={`Foto ${i + 1}`} className="w-24 h-24 object-cover rounded-lg border border-[#D8E4F0]" />
                  ))}
                </div>
              </div>
            )}

            {/* Assinatura do técnico (feita na criação da OS) */}
            <div className="flex justify-center pt-4 border-t border-[#D8E4F0]">
              <div className="flex flex-col items-center gap-2">
                <div className="text-[11px] text-[#8FA3B8]">Assinatura do Técnico</div>
                {selected.sig_tecnico_img ? (
                  <img src={selected.sig_tecnico_img} alt="Assinatura técnico" className="max-w-[200px] border border-[#D8E4F0] rounded-lg bg-[#F7F9FC]" />
                ) : (
                  <div className="text-[12px] text-[#8FA3B8] italic">Sem assinatura</div>
                )}
                <div className="text-[13px] font-medium text-[#0F2942]">{selected.sig_tecnico}</div>
                <div className="text-[11px] text-[#8FA3B8]">{selected.sig_cargo}</div>
              </div>
            </div>
            <DetailRow label="Data da assinatura do técnico" value={selected.sig_data} />

            {/* Aprovação do gerente — só aparece/é editável depois que a OS já existe */}
            <div className="pt-5 border-t border-[#D8E4F0]">
              <div className="text-[12px] font-semibold text-[#1A4A7A] tracking-wide mb-3">
                APROVAÇÃO DO GERENTE
              </div>

              {aprovado ? (
                <div className="flex flex-col items-center gap-2">
                  <img
                    src={selected.sig_cliente_img as string}
                    alt="Assinatura do aprovador"
                    className="max-w-[200px] border border-[#1A6B3C] rounded-lg bg-[#EAF5EE]"
                  />
                  <div className="text-[13px] font-medium text-[#0F2942]">{selected.sig_cliente}</div>
                  {selected.sig_cliente_cargo && (
                    <div className="text-[11px] text-[#8FA3B8]">{selected.sig_cliente_cargo}</div>
                  )}
                  {selected.sig_cliente_data && (
                    <div className="text-[11px] text-[#8FA3B8]">
                      Aprovado em {new Date(selected.sig_cliente_data + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-[#F7F9FC] border border-[#D8E4F0] rounded-lg p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-3.5">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11.5px] font-medium text-[#5A6B80]">
                        Nome do gerente / aprovador <span className="text-red-500">*</span>
                      </label>
                      <input
                        className="w-full border border-[#D8E4F0] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#2D6FAA] focus:shadow-[0_0_0_3px_rgba(45,111,170,.1)] transition-all"
                        value={aprovNome}
                        onChange={(e) => setAprovNome(e.target.value)}
                        placeholder="Nome de quem está aprovando"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11.5px] font-medium text-[#5A6B80]">Cargo</label>
                      <input
                        className="w-full border border-[#D8E4F0] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#2D6FAA] focus:shadow-[0_0_0_3px_rgba(45,111,170,.1)] transition-all"
                        value={aprovCargo}
                        onChange={(e) => setAprovCargo(e.target.value)}
                        placeholder="Cargo"
                      />
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <SignaturePad label="Assinatura do Gerente" onChange={setAprovSigImg} value={aprovSigImg} />
                  </div>

                  {aprovError && (
                    <div className="text-[12px] text-red-500 text-center mt-2">{aprovError}</div>
                  )}

                  <div className="flex justify-center mt-4">
                    <button
                      onClick={handleAprovar}
                      disabled={aprovSaving}
                      className="px-6 py-2.5 bg-[#1A6B3C] text-white rounded-lg text-[13px] font-medium hover:bg-[#155230] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                    >
                      {aprovSaving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={16} />
                          Confirmar aprovação
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => window.print()}
            className="px-6 py-3 bg-[#0F2942] text-white rounded-lg text-[14px] font-medium hover:bg-[#1A4A7A] transition-colors inline-flex items-center gap-2"
          >
            <FileText size={16} />
            Gerar PDF
          </button>
          <button
            onClick={() => handleDelete(selected.id)}
            className="px-6 py-3 bg-white text-red-500 border border-red-200 rounded-lg text-[14px] font-medium hover:bg-red-50 transition-colors inline-flex items-center gap-2"
          >
            <Trash2 size={16} />
            Excluir
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[760px] mx-auto px-4 pb-16">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-[#1A4A7A] hover:text-[#2D6FAA] mb-4 text-[14px] font-medium"
      >
        <ArrowLeft size={18} />
        Voltar para formulário
      </button>

      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8FA3B8]" />
        <input
          type="text"
          placeholder="Buscar por número, cliente, gerador, técnico..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-[#D8E4F0] rounded-lg text-[13px] outline-none focus:border-[#2D6FAA] focus:shadow-[0_0_0_3px_rgba(45,111,170,.1)] transition-all"
        />
      </div>

      {error && (
        <div className="p-3 rounded-lg text-[13px] bg-red-50 text-red-700 border border-red-200 mb-4">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12 text-[#8FA3B8] text-[14px]">Carregando ordens de serviço...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-[#8FA3B8] text-[14px]">
          {ordens.length === 0 ? 'Nenhuma OS cadastrada ainda.' : 'Nenhum resultado encontrado.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((os) => (
            <div
              key={os.id}
              className="bg-white rounded-xl border border-[#D8E4F0] p-4 hover:border-[#2D6FAA] transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-semibold text-[#0F2942]">{os.numero_os}</span>
                    <span
                      className="px-2 py-0.5 rounded-full text-[11px] font-medium border"
                      style={{
                        color: statusColor(os.status_final),
                        borderColor: statusColor(os.status_final),
                        backgroundColor: statusColor(os.status_final) + '15',
                      }}
                    >
                      {os.tipo}
                    </span>
                    <AprovacaoBadge aprovado={!!os.sig_cliente_img} />
                  </div>
                  <div className="text-[12px] text-[#5A6B80] mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                    <span>Cliente: {os.cliente}</span>
                    <span>Gerador: {os.gerador}</span>
                    <span>Região: {os.regiao}</span>
                  </div>
                  <div className="text-[12px] text-[#8FA3B8] mt-0.5">
                    Técnico: {os.tecnico} · {new Date(os.created_at).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => setSelected(os)}
                    className="p-2 text-[#1A4A7A] hover:bg-[#E8F0FA] rounded-lg transition-colors"
                    title="Visualizar"
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(os.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Excluir"
                  >
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
