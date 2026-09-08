import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface OrdemServico {
  id: string;
  numero_os: string;
  tipo: string;
  cliente: string;
  contrato: string | null;
  regiao: string;
  gerador: string;
  horimetro: string;
  modelo: string | null;
  tecnico: string;
  data_abertura: string;
  data_conclusao: string | null;
  hora_inicio: string;
  hora_conclusao: string | null;
  responsavel: string;
  defeito: string;
  prioridade: string;
  componentes: string[];
  outro_componente: string | null;
  causa_raiz: string;
  diagnostico: string;
  intervencoes: string;
  servico: string;
  medicoes: {
    va?: string;
    vb?: string;
    vc?: string;
    ca?: string;
    cb?: string;
    cc?: string;
    freq?: string;
    fp?: string;
  };
  pecas: {
    p1d?: string;
    p1c?: string;
    p1q?: string;
    p2d?: string;
    p2c?: string;
    p2q?: string;
    p3d?: string;
    p3c?: string;
    p3q?: string;
    extra?: string;
  };
  status_final: string;
  prazo: string | null;
  fotos: string[];
  foto_descricao: string | null;
  observacoes: string | null;
  proxima_manutencao: string | null;
  sig_tecnico: string | null;
  sig_cargo: string | null;
  sig_cliente: string | null;
  sig_cliente_cargo: string | null;
  sig_cliente_data: string | null;
  sig_data: string;
  sig_tecnico_img: string | null;
  sig_cliente_img: string | null;
  created_at: string;
}

export type OrdemServicoInsert = Omit<OrdemServico, 'id' | 'numero_os' | 'created_at' | 'sig_cliente' | 'sig_cliente_cargo' | 'sig_cliente_data' | 'sig_cliente_img'> & {
  numero_os?: string;
  sig_cliente?: string | null;
  sig_cliente_cargo?: string | null;
  sig_cliente_data?: string | null;
  sig_cliente_img?: string | null;
};
