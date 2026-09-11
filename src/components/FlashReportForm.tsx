import { useState, useRef } from 'react';
import {
  Calendar, AlertTriangle, Camera, CheckCircle, Printer, Trash2, Save, Upload, X,
} from 'lucide-react';
import { supabase, type FlashReportInsert, type FlashReport } from '@/lib/supabase';

const REGIOES = ['Autazes', 'Borba', 'Humaitá', 'São Gabriel da Cachoeira', 'Nova Olinda'];

interface FlashReportFormProps {
  onSaved: () => void;
  editingReport?: FlashReport | null;
  onCancelEdit?: () => void;
}

function blankForm(today: string) {
  return {
    cliente: '', data: today, tecnico: '', horaInicio: '', horaFinal: '', horimetro: '',
    regiao: '', empresa: 'LIA', respInfo: 'Próprio',
    consReal: '', consPot: '', tipoDesvio: '', descricao: '',
    acoes: '', observacoes: '', respCom: '', cargo: 'Gerente Operacional',
    foto1Label: '', foto2Label: '', foto3Label: '',
  };
}

function formFromReport(r: FlashReport) {
  return {
    cliente: r.cliente, data: r.data, tecnico: r.tecnico,
    horaInicio: r.hora_inicio ?? '', horaFinal: r.hora_final ?? '', horimetro: r.horimetro ?? '',
    regiao: r.regiao, empresa: r.empresa, respInfo: r.resp_info,
    consReal: r.cons_real ?? '', consPot: r.cons_pot ?? '', tipoDesvio: r.tipo_desvio ?? '',
    descricao: r.descricao, acoes: r.acoes ?? '', observacoes: r.observacoes ?? '',
    respCom: r.resp_com ?? '', cargo: r.cargo ?? 'Gerente Operacional',
    foto1Label: r.foto1_label ?? '', foto2Label: r.foto2_label ?? '', foto3Label: r.foto3_label ?? '',
  };
}

const compressImage = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(reader.error);
  reader.onload = () => {
    const img = new Image();
    img.onerror = () => reject(new Error('Não foi possível ler a imagem'));
    img.onload = () => {
      const MAX_DIM = 1280;
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) { height = Math.round((height * MAX_DIM) / width); width = MAX_DIM; }
        else { width = Math.round((width * MAX_DIM) / height); height = MAX_DIM; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(reader.result as string); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.src = reader.result as string;
  };
  reader.readAsDataURL(file);
});

export default function FlashReportForm({ onSaved, editingReport, onCancelEdit }: FlashReportFormProps) {
  const today = new Date().toISOString().split('T')[0];
  const isEditing = !!editingReport;

  const [form, setForm] = useState(editingReport ? formFromReport(editingReport) : blankForm(today));
  const [foto1, setFoto1] = useState<string | null>(editingReport?.foto1 ?? null);
  const [foto2, setFoto2] = useState<string | null>(editingReport?.foto2 ?? null);
  const [foto3, setFoto3] = useState<string | null>(editingReport?.foto3 ?? null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleFoto = async (slot: 1 | 2 | 3, file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return;
    try {
      const compressed = await compressImage(file);
      if (slot === 1) setFoto1(compressed);
      if (slot === 2) setFoto2(compressed);
      if (slot === 3) setFoto3(compressed);
    } catch {
      setSaveMsg({ type: 'error', text: 'Não foi possível processar essa foto.' });
    }
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.cliente) e.cliente = 'Cliente é obrigatório';
    if (!form.tecnico) e.tecnico = 'Técnico é obrigatório';
    if (!form.regiao) e.regiao = 'Região é obrigatória';
    if (!form.descricao) e.descricao = 'Descrição do evento é obrigatória';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    setSaveMsg(null);
    if (!validate()) {
      setSaveMsg({ type: 'error', text: 'Preencha todos os campos obrigatórios destacados em vermelho.' });
      return;
    }
    setSaving(true);
    try {
      const dados = {
        cliente: form.cliente,
        data: form.data,
        tecnico: form.tecnico,
        hora_inicio: form.horaInicio || null,
        hora_final: form.horaFinal || null,
        horimetro: form.horimetro || null,
        regiao: form.regiao,
        empresa: form.empresa,
        resp_info: form.respInfo,
        cons_real: form.consReal || null,
        cons_pot: form.consPot || null,
        tipo_desvio: form.tipoDesvio || null,
        descricao: form.descricao,
        acoes: form.acoes || null,
        observacoes: form.observacoes || null,
        resp_com: form.respCom || null,
        cargo: form.cargo || null,
        foto1_label: form.foto1Label || null,
        foto2_label: form.foto2Label || null,
        foto3_label: form.foto3Label || null,
        foto1, foto2, foto3,
      };

      if (isEditing && editingReport) {
        const { error } = await supabase.from('flash_reports').update(dados).eq('id', editingReport.id);
        if (error) throw error;
        setSaveMsg({ type: 'success', text: 'Flash Report atualizado com sucesso!' });
      } else {
        const insert: FlashReportInsert = dados;
        const { error } = await supabase.from('flash_reports').insert(insert);
        if (error) throw error;
        setSaveMsg({ type: 'success', text: 'Flash Report salvo com sucesso!' });
      }
      setTimeout(() => onSaved(), 1200);
    } catch (err) {
      setSaveMsg({ type: 'error', text: `Erro ao salvar: ${(err as Error).message}` });
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => window.print();

  const clearForm = () => {
    if (!confirm('Tem certeza que deseja limpar todos os campos?')) return;
    setForm(blankForm(today));
    setFoto1(null); setFoto2(null); setFoto3(null);
    setErrors({}); setSaveMsg(null);
  };

  const fieldClass = (field: string) =>
    `w-full border rounded-lg px-3 py-2 text-[13px] outline-none transition-all ${
      errors[field] ? 'border-red-500 bg-red-50' : 'border-[#D8E4F0] bg-white focus:border-[#2D6FAA] focus:shadow-[0_0_0_3px_rgba(45,111,170,.1)]'
    }`;

  return (
    <div className="max-w-[760px] mx-auto px-4 pb-16">
      {isEditing && (
        <div className="mb-4 p-3 rounded-lg text-[13px] bg-[#E8F0FA] text-[#1A4A7A] border border-[#B8D0E8]">
          Editando Flash Report de <strong>{editingReport!.cliente}</strong> já salvo. As alterações vão substituir os dados atuais.
        </div>
      )}

      <Card icon={<Calendar size={14} />} title="1. IDENTIFICAÇÃO">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Field label="Cliente *" error={errors.cliente}>
            <input className={fieldClass('cliente')} value={form.cliente} onChange={(e) => update('cliente', e.target.value)} placeholder="Ex: VPOWER — Autazes" />
          </Field>
          <Field label="Data">
            <input type="date" className={fieldClass('data')} value={form.data} onChange={(e) => update('data', e.target.value)} />
          </Field>
        </div>
        <div className="mt-3.5">
          <Field label="Técnico Responsável *" error={errors.tecnico}>
            <input className={fieldClass('tecnico')} value={form.tecnico} onChange={(e) => update('tecnico', e.target.value)} placeholder="Nome completo" />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-3.5">
          <Field label="Hora Início"><input type="time" className={fieldClass('horaInicio')} value={form.horaInicio} onChange={(e) => update('horaInicio', e.target.value)} /></Field>
          <Field label="Hora Final"><input type="time" className={fieldClass('horaFinal')} value={form.horaFinal} onChange={(e) => update('horaFinal', e.target.value)} /></Field>
          <Field label="Horímetro (h)"><input className={fieldClass('horimetro')} value={form.horimetro} onChange={(e) => update('horimetro', e.target.value)} placeholder="Ex: 50h" /></Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-3.5">
          <Field label="Região *" error={errors.regiao}>
            <select className={fieldClass('regiao')} value={form.regiao} onChange={(e) => update('regiao', e.target.value)}>
              <option value="">Selecione...</option>
              {REGIOES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Empresa"><input className={fieldClass('empresa')} value={form.empresa} onChange={(e) => update('empresa', e.target.value)} /></Field>
        </div>
        <div className="mt-3.5">
          <label className="text-[11.5px] font-medium text-[#5A6B80]">Responsável em Informar o Ocorrido</label>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {['Próprio', 'Cliente'].map((v) => (
              <Pill key={v} active={form.respInfo === v} onClick={() => update('respInfo', v)}>{v}</Pill>
            ))}
          </div>
        </div>
      </Card>

      <Card icon={<AlertTriangle size={14} />} title="2. DESVIO">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Field label="Consequência Real"><input className={fieldClass('consReal')} value={form.consReal} onChange={(e) => update('consReal', e.target.value)} placeholder="Ex: Equipamento operante" /></Field>
          <Field label="Consequência Potencial"><input className={fieldClass('consPot')} value={form.consPot} onChange={(e) => update('consPot', e.target.value)} placeholder="Ex: Equipamento voltando a operar" /></Field>
        </div>
        <div className="mt-3.5">
          <Field label="Tipo / Causa do Desvio"><input className={fieldClass('tipoDesvio')} value={form.tipoDesvio} onChange={(e) => update('tipoDesvio', e.target.value)} placeholder="Ex: Dano ao equipamento" /></Field>
        </div>
        <div className="mt-3.5">
          <Field label="Descrição do Evento *" error={errors.descricao}>
            <textarea className={fieldClass('descricao')} value={form.descricao} onChange={(e) => update('descricao', e.target.value)} placeholder="Descreva detalhadamente o que aconteceu..." rows={4} />
          </Field>
        </div>
      </Card>

      <Card icon={<Camera size={14} />} title="3. FOTOGRAFIAS DO EVENTO">
        <FotoSlot label="Foto 1 — Local da Falha" legenda={form.foto1Label} onLegenda={(v) => update('foto1Label', v)} foto={foto1} onFoto={(f) => handleFoto(1, f)} onRemove={() => setFoto1(null)} inputRef={fileRefs[0]} />
        <FotoSlot label="Foto 2 — Identificação do Equipamento" legenda={form.foto2Label} onLegenda={(v) => update('foto2Label', v)} foto={foto2} onFoto={(f) => handleFoto(2, f)} onRemove={() => setFoto2(null)} inputRef={fileRefs[1]} />
        <FotoSlot label="Foto 3 — Opcional" legenda={form.foto3Label} onLegenda={(v) => update('foto3Label', v)} foto={foto3} onFoto={(f) => handleFoto(3, f)} onRemove={() => setFoto3(null)} inputRef={fileRefs[2]} last />
      </Card>

      <Card icon={<CheckCircle size={14} />} title="4. AÇÕES E ENCERRAMENTO">
        <Field label="Ações Imediatas">
          <textarea className={fieldClass('acoes')} value={form.acoes} onChange={(e) => update('acoes', e.target.value)} placeholder="Liste as ações tomadas numeradas: 1. ... 2. ..." rows={3} />
        </Field>
        <div className="mt-3.5">
          <Field label="Observações">
            <textarea className={fieldClass('observacoes')} value={form.observacoes} onChange={(e) => update('observacoes', e.target.value)} placeholder="Situação final do equipamento, pendências..." rows={3} />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-3.5">
          <Field label="Responsável pela Comunicação"><input className={fieldClass('respCom')} value={form.respCom} onChange={(e) => update('respCom', e.target.value)} /></Field>
          <Field label="Cargo"><input className={fieldClass('cargo')} value={form.cargo} onChange={(e) => update('cargo', e.target.value)} /></Field>
        </div>
      </Card>

      {saveMsg && (
        <div className={`mt-4 p-3 rounded-lg text-[13px] ${
          saveMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {saveMsg.text}
        </div>
      )}
      <div className="mt-7 p-5 bg-white rounded-xl border border-[#D8E4F0] text-center">
        <div className="flex flex-wrap gap-3 justify-center">
          <button onClick={handleSave} disabled={saving} className="px-6 py-3 bg-[#0F2942] text-white rounded-lg text-[14px] font-medium hover:bg-[#1A4A7A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2">
            {saving ? (<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Salvando...</>) : (<><Save size={16} />{isEditing ? 'Salvar Alterações' : 'Salvar Flash Report'}</>)}
          </button>
          <button onClick={handlePrint} className="px-6 py-3 bg-white text-[#0F2942] border border-[#D8E4F0] rounded-lg text-[14px] font-medium hover:border-[#2D6FAA] transition-colors inline-flex items-center gap-2">
            <Printer size={16} />Gerar PDF
          </button>
          {isEditing ? (
            <button onClick={onCancelEdit} className="px-6 py-3 bg-white text-[#5A6B80] border border-[#D8E4F0] rounded-lg text-[14px] font-medium hover:bg-[#F7F9FC] transition-colors inline-flex items-center gap-2">
              <X size={16} />Cancelar edição
            </button>
          ) : (
            <button onClick={clearForm} className="px-6 py-3 bg-white text-red-500 border border-red-200 rounded-lg text-[14px] font-medium hover:bg-red-50 transition-colors inline-flex items-center gap-2">
              <Trash2 size={16} />Limpar
            </button>
          )}
        </div>
        <div className="text-[11px] text-[#8FA3B8] mt-2">No Chrome: escolha "Salvar como PDF" no destino da impressão</div>
      </div>
    </div>
  );
}

function FotoSlot({ label, legenda, onLegenda, foto, onFoto, onRemove, inputRef, last }: {
  label: string; legenda: string; onLegenda: (v: string) => void; foto: string | null;
  onFoto: (f: File | undefined) => void; onRemove: () => void; inputRef: React.RefObject<HTMLInputElement>; last?: boolean;
}) {
  return (
    <div className={last ? '' : 'mb-3.5'}>
      <div className="border-[1.5px] border-dashed border-[#C8A84B] rounded-lg bg-[#FFFBF0] overflow-hidden">
        <div className="px-3.5 py-2.5 text-[13px] font-semibold text-[#8a5c00] border-b border-[#C8A84B]/20">{label}</div>
        <div className="p-3.5 flex flex-col gap-2">
          <input className="w-full border border-[#D8E4F0] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#2D6FAA] bg-white" value={legenda} onChange={(e) => onLegenda(e.target.value)} placeholder="Descreva o que a foto mostra..." />
          {foto ? (
            <div className="relative w-24 h-24">
              <img src={foto} alt={label} className="w-24 h-24 object-cover rounded-lg border border-[#C8A84B]" />
              <button type="button" onClick={onRemove} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors">
                <X size={12} />
              </button>
            </div>
          ) : (
            <div onClick={() => inputRef.current?.click()} className="border-2 border-dashed border-[#C8A84B] rounded-lg p-4 text-center cursor-pointer text-[#8a5c00] text-[13px] hover:bg-[#fff6df] transition-all">
              <Upload size={22} className="mx-auto mb-1.5 text-[#C8A84B]" strokeWidth={1.5} />
              Toque para escolher a foto
              <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFoto(e.target.files?.[0])} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-[#D8E4F0] mb-4 overflow-hidden break-inside-avoid">
      <div className="px-5 py-3 bg-[#F7F9FC] border-b border-[#D8E4F0] flex items-center gap-2.5">
        <div className="w-7 h-7 bg-[#0F2942] rounded-md flex items-center justify-center flex-shrink-0 text-white">{icon}</div>
        <div className="text-[12px] font-semibold text-[#1A4A7A] tracking-wide">{title}</div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11.5px] font-medium text-[#5A6B80]">{label}</label>
      {children}
      {error && <span className="text-[11px] text-red-500">{error}</span>}
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <div onClick={onClick} className={`px-3.5 py-1.5 border rounded-full text-[12.5px] cursor-pointer transition-all select-none ${
      active ? 'border-[#1A4A7A] bg-[#E8F0FA] text-[#1A4A7A] font-medium' : 'border-[#D8E4F0] bg-white text-[#5A6B80] hover:border-[#2D6FAA] hover:text-[#2D6FAA]'
    }`}>
      {children}
    </div>
  );
}
