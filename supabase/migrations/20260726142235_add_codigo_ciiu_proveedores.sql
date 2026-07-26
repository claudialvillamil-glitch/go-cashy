-- Código CIIU (Clasificación Industrial Internacional Uniforme) de la
-- actividad económica del proveedor.
ALTER TABLE public.proveedores
  ADD COLUMN IF NOT EXISTS codigo_ciiu TEXT;
