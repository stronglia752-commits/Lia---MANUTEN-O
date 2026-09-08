import { useState, useRef, useCallback } from 'react';
import {
  Layers, Calendar, AlertCircle, Wrench, Activity, Package,
  CheckCircle, Camera, FileText, PenLine, Printer, Trash2, Save,
  Upload, X,
} from 'lucide-react';
import SignaturePad from './SignaturePad';
import { supabase, type OrdemServicoInsert } from '@/lib/supabase';

const REGIOES = ['Autazes', 'Borba', 'Humaitá', 'São Gabriel da Cachoeira', 'Nova Olinda'];
const COMPONENTES = ['AVR', 'PMG / Excitatriz', 'Disjuntor', 'Carter', 'Bobina de fechamento', 'Conector / Cabo', 'Fusível', 'Outro'];
const CAUSAS = ['Desgaste natural', 'Falha elétrica', 'Falha mecânica', 'Erro operacional', 'Defeito de fabricação', 'Em investigação'];
const STATUS_OPTIONS = [
  { v: 'Equipamento normalizado e operante', label: 'Normalizado e operante', color: '#1A6B3C' },
  { v: 'Em boas condições (preventiva concluída)', label: 'Boas condições', color: '#2D6FAA' },
  { v: 'Aguardando peça / material', label: 'Aguardando peça', color: '#C8A84B' },
  { v: 'Retorno necessário', label: 'Retorno necessário', color: '#C8A84B' },
  { v: 'Inoperante — aguardando decisão', label: 'Inoperante', color: '#AA2222' },
];

interface OSFormProps {
  onSaved: () => void;
}

export default function OSForm({ onSaved }: OSFormProps) {
  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    tipo: 'Corretiva',
    cliente: 'V.POWER',
    contrato: '',
    regiao: '',
    gerador: '',
    horimetro: '',
    modelo: '',
    tecnico: 'Matheus Firmes Reis',
    data_abertura: today,
    data_conclusao: '',
    hora_inicio: '',
    hora_conclusao: '',
    responsavel: 'Próprio (LIA)',
    defeito: '',
    prioridade: 'Média',
    outro_componente: '',
    causa_raiz: '',
    diagnostico: '',
    intervencoes: '',
    servico: '',
    va: '', vb: '', vc: '',
    ca: '', cb: '', cc: '',
    freq: '', fp: '',
    p1d: '', p1c: '', p1q: '',
    p2d: '', p2c: '', p2q: '',
    p3d: '', p3c: '', p3q: '',
    pecas_extra: '',
    status_final: '',
    prazo: '',
    foto_descricao: '',
    observacoes: '',
    proxima_manutencao: '',
    sig_tecnico: 'Matheus Firmes Reis',
    sig_cargo: 'Técnico de Manutenção',
    sig_data: today,
  });

  const [componentes, setComponentes] = useState<string[]>([]);
  const [fotos, setFotos] = useState<string[]>([]);
  const [sigTecnicoImg, setSigTecnicoImg] = useState<string | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = useCallback((field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const toggleComponente = (comp: string) => {
    setComponentes((prev) => {
      const next = prev.includes(comp)
        ? prev.filter((c) => c !== comp)
        : [...prev, comp];
      if (!next.includes('Outro')) {
        update('outro_componente', '');
      }
      return next;
    });
  };

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    const remaining = 5 - fotos.length;
    if (newFiles.length > remaining) {
      setSaveMsg({ type: 'error', text: `Limite de 5 fotos atingido. Apenas ${remaining} foto(s) adicionada(s).` });
    }
    const toAdd = newFiles.slice(0, remaining);
    toAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setFotos((prev) => (prev.length < 5 ? [...prev, reader.result as string] : prev));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFoto = (index: number) => {
    setFotos((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    const required: Record<string, string> = {
      regiao: 'Região',
      gerador: 'Gerador',
      horimetro: 'Horímetro',
      tecnico: 'Técnico',
      data_abertura: 'Data de abertura',
      hora_inicio: 'Hora de início',
      defeito: 'Descrição do defeito',
      diagnostico: 'Diagnóstico técnico',
      intervencoes: 'Intervenções realizadas',
      servico: 'Descrição do serviço',
      status_final: 'Status final',
      sig_data: 'Data da assinatura',
    };
    Object.entries(required).forEach(([field, label]) => {
      if (!form[field as keyof typeof form]) e[field] = `${label} é obrigatório`;
    });
    if (componentes.length === 0) e.componentes = 'Selecione ao menos um componente';
    if (!sigTecnicoImg) e.sig_tecnico_img = 'Assinatura do técnico é obrigatória';
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
      const { data: lastOs } = await supabase
        .from('ordens_servico')
        .select('numero_os')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let numeroOs = `OS-${new Date().getFullYear()}-0001`;
      if (lastOs?.numero_os) {
        const parts = lastOs.numero_os.split('-');
        const seq = parseInt(parts[2] ?? '0', 10) + 1;
        numeroOs = `OS-${parts[1]}-${String(seq).padStart(4, '0')}`;
      }

      const insert: OrdemServicoInsert = {
        numero_os: numeroOs,
        tipo: form.tipo,
        cliente: form.cliente,
        contrato: form.contrato || null,
        regiao: form.regiao,
        gerador: form.gerador,
        horimetro: form.horimetro,
        modelo: form.modelo || null,
        tecnico: form.tecnico,
        data_abertura: form.data_abertura,
        data_conclusao: form.data_conclusao || null,
        hora_inicio: form.hora_inicio,
        hora_conclusao: form.hora_conclusao || null,
        responsavel: form.responsavel,
        defeito: form.defeito,
        prioridade: form.prioridade,
        componentes,
        outro_componente: form.outro_componente || null,
        causa_raiz: form.causa_raiz,
        diagnostico: form.diagnostico,
        intervencoes: form.intervencoes,
        servico: form.servico,
        medicoes: {
          va: form.va, vb: form.vb, vc: form.vc,
          ca: form.ca, cb: form.cb, cc: form.cc,
          freq: form.freq, fp: form.fp,
        },
        pecas: {
          p1d: form.p1d, p1c: form.p1c, p1q: form.p1q,
          p2d: form.p2d, p2c: form.p2c, p2q: form.p2q,
          p3d: form.p3d, p3c: form.p3c, p3q: form.p3q,
          extra: form.pecas_extra,
        },
        status_final: form.status_final,
        prazo: form.prazo || null,
        fotos,
        foto_descricao: form.foto_descricao || null,
        observacoes: form.observacoes || null,
        proxima_manutencao: form.proxima_manutencao || null,
        sig_tecnico: form.sig_tecnico,
        sig_cargo: form.sig_cargo,
        sig_data: form.sig_data,
        sig_tecnico_img: sigTecnicoImg,
      };

      const { error } = await supabase.from('ordens_servico').insert(insert);
      if (error) throw error;

      setSaveMsg({ type: 'success', text: `OS ${numeroOs} salva com sucesso!` });
      setTimeout(() => onSaved(), 1500);
    } catch (err) {
      setSaveMsg({ type: 'error', text: `Erro ao salvar: ${(err as Error).message}` });
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const clearForm = () => {
    if (!confirm('Tem certeza que deseja limpar todos os campos?')) return;
    setForm({
      tipo: 'Corretiva', cliente: 'V.POWER', contrato: '', regiao: '', gerador: '',
      horimetro: '', modelo: '', tecnico: 'Matheus Firmes Reis',
      data_abertura: today, data_conclusao: '', hora_inicio: '', hora_conclusao: '',
      responsavel: 'Próprio (LIA)', defeito: '', prioridade: 'Média',
      outro_componente: '', causa_raiz: '', diagnostico: '', intervencoes: '',
      servico: '', va: '', vb: '', vc: '', ca: '', cb: '', cc: '', freq: '', fp: '',
      p1d: '', p1c: '', p1q: '', p2d: '', p2c: '', p2q: '', p3d: '', p3c: '', p3q: '',
      pecas_extra: '', status_final: '', prazo: '', foto_descricao: '',
      observacoes: '', proxima_manutencao: '', sig_tecnico: 'Matheus Firmes Reis',
      sig_cargo: 'Técnico de Manutenção',
      sig_data: today,
    });
    setComponentes([]);
    setFotos([]);
    setSigTecnicoImg(null);
    setErrors({});
    setSaveMsg(null);
  };

  const fieldClass = (field: string) =>
    `w-full border rounded-lg px-3 py-2 text-[13px] outline-none transition-all ${
      errors[field] ? 'border-red-500 bg-red-50' : 'border-[#D8E4F0] bg-white focus:border-[#2D6FAA] focus:shadow-[0_0_0_3px_rgba(45,111,170,.1)]'
    }`;

  return (
    <div className="max-w-[760px] mx-auto px-4 pb-16">
      {/* TIPO */}
      <Card icon={<Layers size={14} />} title="TIPO DE MANUTENÇÃO">
        <div>
          <label className="text-[11.5px] font-medium text-[#5A6B80]">Selecione o tipo <span className="text-red-500">*</span></label>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {['Corretiva', 'Preventiva', 'Preditiva'].map((v) => (
              <Pill key={v} active={form.tipo === v} onClick={() => update('tipo', v)}>{v}</Pill>
            ))}
          </div>
        </div>
      </Card>

      {/* 1. IDENTIFICAÇÃO */}
      <Card icon={<Calendar size={14} />} title="1. IDENTIFICAÇÃO DO EQUIPAMENTO">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Field label="Cliente *" error={errors.cliente}>
            <input className={fieldClass('cliente')} value={form.cliente} onChange={(e) => update('cliente', e.target.value)} />
          </Field>
          <Field label="Contrato / Nº OS">
            <input className={fieldClass('contrato')} value={form.contrato} onChange={(e) => update('contrato', e.target.value)} placeholder="Nº do contrato" />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-3.5">
          <Field label="Região *" error={errors.regiao}>
            <select className={fieldClass('regiao')} value={form.regiao} onChange={(e) => update('regiao', e.target.value)}>
              <option value="">Selecione...</option>
              {REGIOES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Gerador *" error={errors.gerador}>
            <input className={fieldClass('gerador')} value={form.gerador} onChange={(e) => update('gerador', e.target.value)} placeholder="ex: G26, GMG34" />
          </Field>
          <Field label="Horímetro (h) *" error={errors.horimetro}>
            <input className={fieldClass('horimetro')} value={form.horimetro} onChange={(e) => update('horimetro', e.target.value)} placeholder="ex: 199" />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-3.5">
          <Field label="Modelo / Nº de Série">
            <input className={fieldClass('modelo')} value={form.modelo} onChange={(e) => update('modelo', e.target.value)} placeholder="Modelo do equipamento" />
          </Field>
          <Field label="Técnico Responsável *" error={errors.tecnico}>
            <input className={fieldClass('tecnico')} value={form.tecnico} onChange={(e) => update('tecnico', e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-3.5">
          <Field label="Data de Abertura *" error={errors.data_abertura}>
            <input type="date" className={fieldClass('data_abertura')} value={form.data_abertura} onChange={(e) => update('data_abertura', e.target.value)} />
          </Field>
          <Field label="Data de Conclusão">
            <input type="date" className={fieldClass('data_conclusao')} value={form.data_conclusao} onChange={(e) => update('data_conclusao', e.target.value)} />
          </Field>
          <Field label="Hora de Início *" error={errors.hora_inicio}>
            <input type="time" className={fieldClass('hora_inicio')} value={form.hora_inicio} onChange={(e) => update('hora_inicio', e.target.value)} />
          </Field>
          <Field label="Hora de Conclusão">
            <input type="time" className={fieldClass('hora_conclusao')} value={form.hora_conclusao} onChange={(e) => update('hora_conclusao', e.target.value)} />
          </Field>
        </div>
        <div className="mt-3.5">
          <label className="text-[11.5px] font-medium text-[#5A6B80]">Responsável pelo ocorrido</label>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {['Próprio (LIA)', 'Cliente (V.Power)'].map((v) => (
              <Pill key={v} active={form.responsavel === v} onClick={() => update('responsavel', v)}>{v}</Pill>
            ))}
          </div>
        </div>
      </Card>

      {/* 2. DEFEITO */}
      <Card icon={<AlertCircle size={14} />} title="2. DEFEITO RELATADO / OBJETIVO DA MANUTENÇÃO">
        <Field label="Descrição do defeito ou objetivo *" error={errors.defeito}>
          <textarea className={fieldClass('defeito')} value={form.defeito} onChange={(e) => update('defeito', e.target.value)} placeholder="Descreva detalhadamente o problema identificado ou o objetivo da manutenção..." rows={4} />
        </Field>
        <div className="mt-3.5">
          <label className="text-[11.5px] font-medium text-[#5A6B80]">Prioridade</label>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {['Alta', 'Média', 'Baixa'].map((v) => (
              <Pill key={v} active={form.prioridade === v} onClick={() => update('prioridade', v)}>{v}</Pill>
            ))}
          </div>
        </div>
      </Card>

      {/* 3. COMPONENTES */}
      <Card icon={<Wrench size={14} />} title="3. COMPONENTES AFETADOS / INSPEÇÃO VISUAL">
        <div>
          <label className="text-[11.5px] font-medium text-[#5A6B80]">Selecione todos que se aplicam * <span className="text-red-500 text-[10px]">{errors.componentes}</span></label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1.5">
            {COMPONENTES.map((comp) => (
              <CheckItem key={comp} checked={componentes.includes(comp)} onClick={() => toggleComponente(comp)}>
                {comp}
              </CheckItem>
            ))}
          </div>
        </div>
        {componentes.includes('Outro') && (
          <div className="mt-2.5">
            <Field label="Especifique o outro componente">
              <input className={fieldClass('outro_componente')} value={form.outro_componente} onChange={(e) => update('outro_componente', e.target.value)} placeholder="Descreva o componente..." />
            </Field>
          </div>
        )}
        <div className="mt-3.5">
          <label className="text-[11.5px] font-medium text-[#5A6B80]">Causa raiz identificada</label>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {CAUSAS.map((v) => (
              <Pill key={v} active={form.causa_raiz === v} onClick={() => update('causa_raiz', v)}>{v}</Pill>
            ))}
          </div>
        </div>
      </Card>

      {/* 4. DIAGNÓSTICO */}
      <Card icon={<Activity size={14} />} title="4. DIAGNÓSTICO / INTERVENÇÕES REALIZADAS">
        <Field label="Diagnóstico técnico *" error={errors.diagnostico}>
          <textarea className={fieldClass('diagnostico')} value={form.diagnostico} onChange={(e) => update('diagnostico', e.target.value)} placeholder="Descreva o diagnóstico realizado..." rows={3} />
        </Field>
        <div className="mt-3.5">
          <Field label="Intervenções / reparos realizados *" error={errors.intervencoes}>
            <textarea className={fieldClass('intervencoes')} value={form.intervencoes} onChange={(e) => update('intervencoes', e.target.value)} placeholder="Liste as intervenções executadas..." rows={3} />
          </Field>
        </div>
      </Card>

      {/* 5. SERVIÇO / MEDIÇÕES */}
      <Card icon={<Activity size={14} />} title="5. SERVIÇO EXECUTADO / MEDIÇÕES ELÉTRICAS">
        <Field label="Descrição do serviço executado *" error={errors.servico}>
          <textarea className={fieldClass('servico')} value={form.servico} onChange={(e) => update('servico', e.target.value)} placeholder="Descreva o serviço realizado..." rows={3} />
        </Field>
        <div className="mt-3.5">
          <label className="text-[11.5px] font-medium text-[#5A6B80]">Medições elétricas (opcional)</label>
          <div className="overflow-x-auto mt-1.5">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr>
                  <th className="bg-[#F7F9FC] border border-[#D8E4F0] px-2.5 py-2 font-medium text-[#5A6B80] text-center">Parâmetro</th>
                  <th className="bg-[#F7F9FC] border border-[#D8E4F0] px-2.5 py-2 font-medium text-[#5A6B80] text-center">Fase A</th>
                  <th className="bg-[#F7F9FC] border border-[#D8E4F0] px-2.5 py-2 font-medium text-[#5A6B80] text-center">Fase B</th>
                  <th className="bg-[#F7F9FC] border border-[#D8E4F0] px-2.5 py-2 font-medium text-[#5A6B80] text-center">Fase C</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-[#D8E4F0] bg-[#F7F9FC] font-medium text-[#5A6B80] px-2.5 py-2">Tensão (V)</td>
                  {(['va', 'vb', 'vc'] as const).map((f) => (
                    <td key={f} className="border border-[#D8E4F0] p-1">
                      <input className="w-full border-none bg-transparent text-center text-[12.5px] outline-none px-1 py-1" value={form[f]} onChange={(e) => update(f, e.target.value)} placeholder="—" />
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="border border-[#D8E4F0] bg-[#F7F9FC] font-medium text-[#5A6B80] px-2.5 py-2">Corrente (A)</td>
                  {(['ca', 'cb', 'cc'] as const).map((f) => (
                    <td key={f} className="border border-[#D8E4F0] p-1">
                      <input className="w-full border-none bg-transparent text-center text-[12.5px] outline-none px-1 py-1" value={form[f]} onChange={(e) => update(f, e.target.value)} placeholder="—" />
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="border border-[#D8E4F0] bg-[#F7F9FC] font-medium text-[#5A6B80] px-2.5 py-2">Frequência (Hz)</td>
                  <td colSpan={3} className="border border-[#D8E4F0] p-1">
                    <input className="w-full border-none bg-transparent text-center text-[12.5px] outline-none px-1 py-1" value={form.freq} onChange={(e) => update('freq', e.target.value)} placeholder="—" />
                  </td>
                </tr>
                <tr>
                  <td className="border border-[#D8E4F0] bg-[#F7F9FC] font-medium text-[#5A6B80] px-2.5 py-2">Fator de Potência</td>
                  <td colSpan={3} className="border border-[#D8E4F0] p-1">
                    <input className="w-full border-none bg-transparent text-center text-[12.5px] outline-none px-1 py-1" value={form.fp} onChange={(e) => update('fp', e.target.value)} placeholder="—" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* 6. PEÇAS */}
      <Card icon={<Package size={14} />} title="6. PEÇAS / MATERIAIS UTILIZADOS">
        {[['p1d', 'p1c', 'p1q'], ['p2d', 'p2c', 'p2q'], ['p3d', 'p3c', 'p3q']].map((row, i) => (
          <div key={i} className={`grid grid-cols-1 sm:grid-cols-3 gap-3.5 ${i > 0 ? 'mt-2.5' : ''}`}>
            <Field label={`Peça ${i + 1} — Descrição`}>
              <input className={fieldClass(row[0])} value={form[row[0] as keyof typeof form]} onChange={(e) => update(row[0], e.target.value)} placeholder="Nome da peça" />
            </Field>
            <Field label="Código / Ref.">
              <input className={fieldClass(row[1])} value={form[row[1] as keyof typeof form]} onChange={(e) => update(row[1], e.target.value)} placeholder="Código" />
            </Field>
            <Field label="Qtd.">
              <input className={fieldClass(row[2])} value={form[row[2] as keyof typeof form]} onChange={(e) => update(row[2], e.target.value)} placeholder="Qtd." />
            </Field>
          </div>
        ))}
        <div className="mt-2.5">
          <Field label="Peças adicionais">
            <textarea className={fieldClass('pecas_extra')} value={form.pecas_extra} onChange={(e) => update('pecas_extra', e.target.value)} placeholder="Liste outras peças se necessário..." rows={2} />
          </Field>
        </div>
      </Card>

      {/* 7. RESULTADO */}
      <Card icon={<CheckCircle size={14} />} title="7. RESULTADO DO ATENDIMENTO">
        <div>
          <label className="text-[11.5px] font-medium text-[#5A6B80]">Status final do equipamento * <span className="text-red-500 text-[10px]">{errors.status_final}</span></label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1.5">
            {STATUS_OPTIONS.map((opt) => (
              <div
                key={opt.v}
                onClick={() => update('status_final', opt.v)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 border rounded-lg cursor-pointer transition-all ${
                  form.status_final === opt.v ? 'border-[#1A4A7A] bg-[#E8F0FA] text-[#1A4A7A]' : 'border-[#D8E4F0] bg-white hover:border-[#2D6FAA]'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: opt.color }} />
                <span className="text-[13px]">{opt.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3.5">
          <Field label="Prazo estimado (se aplicável)">
            <input className={fieldClass('prazo')} value={form.prazo} onChange={(e) => update('prazo', e.target.value)} placeholder="ex: 01/12/2026 ou 500 horas" />
          </Field>
        </div>
      </Card>

      {/* 8. FOTOS */}
      <Card icon={<Camera size={14} />} title="8. REGISTRO FOTOGRÁFICO">
        <div>
          <label className="text-[11.5px] font-medium text-[#5A6B80]">Fotos do evento / serviço (até 5 imagens)</label>
          <div
            className="border-2 border-dashed border-[#D8E4F0] rounded-lg p-6 text-center cursor-pointer text-[#5A6B80] text-[13px] hover:border-[#2D6FAA] hover:bg-[#f0f6ff] transition-all mt-1.5"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={28} className="mx-auto mb-2 text-[#8FA3B8]" strokeWidth={1.5} />
            Clique para selecionar ou arraste as fotos aqui
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
          {fotos.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2.5">
              {fotos.map((foto, i) => (
                <div key={i} className="relative group">
                  <img src={foto} alt={`Foto ${i + 1}`} className="w-20 h-20 object-cover rounded-lg border border-[#D8E4F0]" />
                  <button
                    type="button"
                    onClick={() => removeFoto(i)}
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="mt-2.5">
          <Field label="Descrição das fotos">
            <textarea className={fieldClass('foto_descricao')} value={form.foto_descricao} onChange={(e) => update('foto_descricao', e.target.value)} placeholder="Legenda ou descrição das fotos..." rows={2} />
          </Field>
        </div>
      </Card>

      {/* 9. OBSERVAÇÕES */}
      <Card icon={<FileText size={14} />} title="9. OBSERVAÇÕES / RECOMENDAÇÕES">
        <Field label="Observações gerais">
          <textarea className={fieldClass('observacoes')} value={form.observacoes} onChange={(e) => update('observacoes', e.target.value)} placeholder="Inclua informações adicionais relevantes..." rows={3} />
        </Field>
        <div className="mt-3.5">
          <Field label="Próxima manutenção recomendada">
            <input className={fieldClass('proxima_manutencao')} value={form.proxima_manutencao} onChange={(e) => update('proxima_manutencao', e.target.value)} placeholder="ex: 500 horas ou 01/12/2026" />
          </Field>
        </div>
      </Card>

      {/* 10. ASSINATURAS */}
      <Card icon={<PenLine size={14} />} title="10. ASSINATURAS">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Field label="Técnico Responsável *">
            <input className={fieldClass('sig_tecnico')} value={form.sig_tecnico} onChange={(e) => update('sig_tecnico', e.target.value)} />
          </Field>
          <Field label="Cargo">
            <input className={fieldClass('sig_cargo')} value={form.sig_cargo} onChange={(e) => update('sig_cargo', e.target.value)} />
          </Field>
        </div>
        <div className="mt-3.5" style={{ maxWidth: 220 }}>
          <Field label="Data da assinatura *" error={errors.sig_data}>
            <input type="date" className={fieldClass('sig_data')} value={form.sig_data} onChange={(e) => update('sig_data', e.target.value)} />
          </Field>
        </div>
        <div className="flex justify-center mt-4">
          <div className="flex flex-col items-center gap-1">
            <SignaturePad label="Assinatura do Técnico" onChange={setSigTecnicoImg} value={sigTecnicoImg} />
            {errors.sig_tecnico_img && <span className="text-[11px] text-red-500">{errors.sig_tecnico_img}</span>}
          </div>
        </div>
      </Card>

      {/* BARRA DE AÇÕES */}
      {saveMsg && (
        <div className={`mt-4 p-3 rounded-lg text-[13px] ${
          saveMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {saveMsg.text}
        </div>
      )}
      <div className="mt-7 p-5 bg-white rounded-xl border border-[#D8E4F0] text-center">
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-[#0F2942] text-white rounded-lg text-[14px] font-medium hover:bg-[#1A4A7A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save size={16} />
                Salvar OS
              </>
            )}
          </button>
          <button
            onClick={handlePrint}
            className="px-6 py-3 bg-white text-[#0F2942] border border-[#D8E4F0] rounded-lg text-[14px] font-medium hover:border-[#2D6FAA] transition-colors inline-flex items-center gap-2"
          >
            <Printer size={16} />
            Gerar PDF
          </button>
          <button
            onClick={clearForm}
            className="px-6 py-3 bg-white text-red-500 border border-red-200 rounded-lg text-[14px] font-medium hover:bg-red-50 transition-colors inline-flex items-center gap-2"
          >
            <Trash2 size={16} />
            Limpar
          </button>
        </div>
        <div className="text-[11px] text-[#8FA3B8] mt-2">No Chrome: escolha "Salvar como PDF" no destino da impressão</div>
      </div>
    </div>
  );
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-[#D8E4F0] mb-4 overflow-hidden break-inside-avoid">
      <div className="px-5 py-3 bg-[#F7F9FC] border-b border-[#D8E4F0] flex items-center gap-2.5">
        <div className="w-7 h-7 bg-[#0F2942] rounded-md flex items-center justify-center flex-shrink-0 text-white">
          {icon}
        </div>
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
    <div
      onClick={onClick}
      className={`px-3.5 py-1.5 border rounded-full text-[12.5px] cursor-pointer transition-all select-none ${
        active ? 'border-[#1A4A7A] bg-[#E8F0FA] text-[#1A4A7A] font-medium' : 'border-[#D8E4F0] bg-white text-[#5A6B80] hover:border-[#2D6FAA] hover:text-[#2D6FAA]'
      }`}
    >
      {children}
    </div>
  );
}

function CheckItem({ checked, onClick, children }: { checked: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2.5 px-3 py-2.5 border rounded-lg cursor-pointer text-[13px] transition-all select-none ${
        checked ? 'border-[#1A4A7A] bg-[#E8F0FA] text-[#1A4A7A]' : 'border-[#D8E4F0] bg-white hover:border-[#2D6FAA] hover:bg-[#F7F9FC]'
      }`}
    >
      <div className={`w-4 h-4 border-[1.5px] rounded flex items-center justify-center flex-shrink-0 transition-all ${
        checked ? 'bg-[#1A4A7A] border-[#1A4A7A]' : 'border-[#D8E4F0]'
      }`}>
        {checked && (
          <svg viewBox="0 0 10 10" className="w-2.5 h-2.5" fill="none" stroke="white" strokeWidth="2.5">
            <polyline points="1.5,5 4,7.5 8.5,2" />
          </svg>
        )}
      </div>
      {children}
    </div>
  );
}

    
