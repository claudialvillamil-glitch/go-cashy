-- Cuentas contables de ReteICA, una por cada concepto (Servicios / Compras),
-- independientes del concepto contable del gasto porque se elige en el recibo.
ALTER TABLE public.fondo_config
  ADD COLUMN IF NOT EXISTS cuenta_reteica_servicios TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cuenta_reteica_compras TEXT NOT NULL DEFAULT '';

-- Guardamos qué concepto de ReteICA se usó en cada recibo (servicios/compras)
-- para poder contabilizarlo en la cuenta correcta.
ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS concepto_reteica_usado TEXT;
