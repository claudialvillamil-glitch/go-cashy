-- Retención en la fuente ya existía (cuenta_retencion / porcentaje_retencion).
-- Se agregan ReteICA y ReteIVA como retenciones independientes, cada una con su
-- propia cuenta contable y porcentaje configurable por concepto.

ALTER TABLE public.conceptos
  ADD COLUMN IF NOT EXISTS cuenta_reteica TEXT,
  ADD COLUMN IF NOT EXISTS porcentaje_reteica NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cuenta_reteiva TEXT,
  ADD COLUMN IF NOT EXISTS porcentaje_reteiva NUMERIC(5,2) NOT NULL DEFAULT 0;

-- Montos calculados por movimiento (recibo simple)
ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS reteica NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reteiva NUMERIC(14,2) NOT NULL DEFAULT 0;

-- Montos calculados por línea (recibos multi-soporte)
ALTER TABLE public.movimiento_items
  ADD COLUMN IF NOT EXISTS reteica NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reteiva NUMERIC(14,2) NOT NULL DEFAULT 0;
