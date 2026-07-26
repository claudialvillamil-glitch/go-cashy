-- Cuentas contables de retención en la fuente, una por cada tarifa/tipo de
-- servicio (independiente del concepto, porque la tarifa se elige en el
-- recibo). Se configuran una sola vez para toda la empresa.
ALTER TABLE public.fondo_config
  ADD COLUMN IF NOT EXISTS cuenta_retencion_hotel TEXT NOT NULL DEFAULT '24109503',
  ADD COLUMN IF NOT EXISTS cuenta_retencion_servicios_declarante TEXT NOT NULL DEFAULT '24109503',
  ADD COLUMN IF NOT EXISTS cuenta_retencion_servicios_no_declarante TEXT NOT NULL DEFAULT '24109503',
  ADD COLUMN IF NOT EXISTS cuenta_retencion_fletes TEXT NOT NULL DEFAULT '24109503';

-- Guardamos qué tarifa se usó en cada recibo, para poder contabilizarla en
-- la cuenta correcta más adelante (ej. al generar el asiento o el reembolso).
ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS tipo_retencion_renta TEXT;
