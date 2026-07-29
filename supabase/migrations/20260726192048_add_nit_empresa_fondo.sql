-- NIT de la empresa/cooperativa, para mostrarlo en el recibo junto al nombre
-- (elemento estándar de un comprobante de egreso en Colombia).
ALTER TABLE public.fondo_config
  ADD COLUMN IF NOT EXISTS nit_empresa TEXT NOT NULL DEFAULT '';
