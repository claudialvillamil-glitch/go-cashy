-- Configuración de retenciones por proveedor: al elegir el proveedor en un
-- recibo, se autocompletan las retenciones que le apliquen según esta
-- parametrización (el usuario puede seguir ajustándolas manualmente).

ALTER TABLE public.proveedores
  ADD COLUMN IF NOT EXISTS aplica_retencion BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tipo_retencion_renta TEXT,
  ADD COLUMN IF NOT EXISTS aplica_reteica BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS concepto_reteica TEXT NOT NULL DEFAULT 'servicios',
  ADD COLUMN IF NOT EXISTS tarifa_reteica NUMERIC(6,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS aplica_reteiva BOOLEAN NOT NULL DEFAULT false;
