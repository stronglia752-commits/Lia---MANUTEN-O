/*
# Add sig_cliente_data column

Adds the approval-date field for the manager/client signature, captured
after the OS is already saved (approval happens in the OS list/detail view).

1. Changes
- `ordens_servico`
  - `sig_cliente_data` (date, nullable) — Data em que a aprovação foi assinada
*/

ALTER TABLE ordens_servico
  ADD COLUMN IF NOT EXISTS sig_cliente_data date;
