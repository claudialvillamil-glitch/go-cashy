-- Cuenta contable y porcentaje de impoconsumo, configurable por concepto
-- (igual que ya existe para IVA). Por defecto 8%, sin cuenta asignada.
ALTER TABLE public.conceptos
  ADD COLUMN IF NOT EXISTS cuenta_impoconsumo TEXT,
  ADD COLUMN IF NOT EXISTS porcentaje_impoconsumo NUMERIC(5,2) NOT NULL DEFAULT 8;
