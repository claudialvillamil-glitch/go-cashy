
ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS reteica_aplica boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reteica_actividad text,
  ADD COLUMN IF NOT EXISTS reteica_tarifa numeric(6,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reteica_valor numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reteiva_aplica boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reteiva_valor numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retefuente_aplica boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS retefuente_concepto text,
  ADD COLUMN IF NOT EXISTS retefuente_tarifa numeric(5,2) NOT NULL DEFAULT 0;

ALTER TABLE public.movimiento_items
  ADD COLUMN IF NOT EXISTS reteica_aplica boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reteica_actividad text,
  ADD COLUMN IF NOT EXISTS reteica_tarifa numeric(6,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reteica_valor numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reteiva_aplica boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reteiva_valor numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retefuente_aplica boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS retefuente_concepto text,
  ADD COLUMN IF NOT EXISTS retefuente_tarifa numeric(5,2) NOT NULL DEFAULT 0;
