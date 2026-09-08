/*
# Create ordens_servico table (single-tenant, no auth)

1. New Tables
- `ordens_servico`
  - `id` (uuid, primary key, auto-generated)
  - `numero_os` (text, unique, auto-generated OS number like "OS-2026-0001")
  - `tipo` (text, not null) — Tipo de manutenção: Corretiva ou Preventiva
  - `cliente` (text, not null) — Nome do cliente
  - `contrato` (text) — Número do contrato / OS
  - `regiao` (text, not null) — Região do equipamento
  - `gerador` (text, not null) — Identificação do gerador
  - `horimetro` (text, not null) — Horímetro do equipamento
  - `modelo` (text) — Modelo / Número de série
  - `tecnico` (text, not null) — Técnico responsável
  - `data_abertura` (date, not null) — Data de abertura
  - `data_conclusao` (date) — Data de conclusão
  - `hora_inicio` (time, not null) — Hora de início
  - `hora_conclusao` (time) — Hora de conclusão
  - `responsavel` (text, not null) — Responsável pelo ocorrido
  - `defeito` (text, not null) — Descrição do defeito
  - `prioridade` (text, not null) — Prioridade: Alta, Média, Baixa
  - `componentes` (jsonb) — Lista de componentes afetados
  - `outro_componente` (text) — Descrição do outro componente
  - `causa_raiz` (text) — Causa raiz identificada
  - `diagnostico` (text, not null) — Diagnóstico técnico
  - `intervencoes` (text, not null) — Intervenções realizadas
  - `servico` (text, not null) — Descrição do serviço executado
  - `medicoes` (jsonb) — Medições elétricas (tensão, corrente, frequência, fator de potência)
  - `pecas` (jsonb) — Peças utilizadas (até 3 + extras)
  - `status_final` (text, not null) — Status final do equipamento
  - `prazo` (text) — Prazo estimado
  - `fotos` (jsonb) — Array de fotos em base64
  - `foto_descricao` (text) — Descrição das fotos
  - `observacoes` (text) — Observações gerais
  - `proxima_manutencao` (text) — Próxima manutenção recomendada
  - `sig_tecnico` (text) — Nome do técnico que assinou
  - `sig_cargo` (text) — Cargo do técnico
  - `sig_cliente` (text) — Nome do cliente/aprovador
  - `sig_cliente_cargo` (text) — Cargo do cliente/aprovador
  - `sig_data` (date, not null) — Data da assinatura
  - `sig_tecnico_img` (text) — Assinatura do técnico em base64
  - `sig_cliente_img` (text) — Assinatura do cliente em base64
  - `created_at` (timestamptz, default now()) — Data de criação do registro

2. Security
- Enable RLS on `ordens_servico`.
- Allow anon + authenticated CRUD because the data is intentionally shared/public (no sign-in app).
*/

CREATE TABLE IF NOT EXISTS ordens_servico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_os text UNIQUE NOT NULL,
  tipo text NOT NULL DEFAULT 'Corretiva',
  cliente text NOT NULL,
  contrato text,
  regiao text NOT NULL,
  gerador text NOT NULL,
  horimetro text NOT NULL,
  modelo text,
  tecnico text NOT NULL,
  data_abertura date NOT NULL,
  data_conclusao date,
  hora_inicio text NOT NULL,
  hora_conclusao text,
  responsavel text NOT NULL DEFAULT 'Próprio (LIA)',
  defeito text NOT NULL,
  prioridade text NOT NULL DEFAULT 'Média',
  componentes jsonb DEFAULT '[]'::jsonb,
  outro_componente text,
  causa_raiz text DEFAULT '',
  diagnostico text NOT NULL,
  intervencoes text NOT NULL,
  servico text NOT NULL,
  medicoes jsonb DEFAULT '{}'::jsonb,
  pecas jsonb DEFAULT '{}'::jsonb,
  status_final text NOT NULL,
  prazo text,
  fotos jsonb DEFAULT '[]'::jsonb,
  foto_descricao text,
  observacoes text,
  proxima_manutencao text,
  sig_tecnico text,
  sig_cargo text,
  sig_cliente text,
  sig_cliente_cargo text,
  sig_data date NOT NULL,
  sig_tecnico_img text,
  sig_cliente_img text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ordens_servico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_ordens" ON ordens_servico;
CREATE POLICY "anon_select_ordens" ON ordens_servico FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_ordens" ON ordens_servico;
CREATE POLICY "anon_insert_ordens" ON ordens_servico FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_ordens" ON ordens_servico;
CREATE POLICY "anon_update_ordens" ON ordens_servico FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_ordens" ON ordens_servico;
CREATE POLICY "anon_delete_ordens" ON ordens_servico FOR DELETE
  TO anon, authenticated USING (true);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_ordens_servico_created_at ON ordens_servico (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_numero ON ordens_servico (numero_os);

-- Sequence for auto-incrementing OS number
CREATE SEQUENCE IF NOT EXISTS os_number_seq START 1;

-- Function to auto-generate OS number
CREATE OR REPLACE FUNCTION generate_os_number()
RETURNS text AS $$
DECLARE
  next_val integer;
  year_val text;
BEGIN
  SELECT nextval('os_number_seq') INTO next_val;
  SELECT EXTRACT(YEAR FROM now())::text INTO year_val;
  RETURN 'OS-' || year_val || '-' || lpad(next_val::text, 4, '0');
END;
$$ LANGUAGE plpgsql;
