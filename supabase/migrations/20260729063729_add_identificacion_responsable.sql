-- Identificación (cédula/NIT) del responsable del fondo, para que el
-- asiento de reposición de caja menor (cuenta 24109503 / cuenta_banco)
-- quede contabilizado a nombre de esa persona (como tercero).
ALTER TABLE public.fondo_config
  ADD COLUMN IF NOT EXISTS identificacion_responsable TEXT NOT NULL DEFAULT '';
