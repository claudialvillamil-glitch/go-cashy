-- Datos de control documental que aparecen al pie del formato físico del
-- recibo de caja menor (ej. CÓDIGO: GF P6 12R1, VIGENCIA: 02-sept-19, VERSIÓN: 02).
ALTER TABLE public.fondo_config
  ADD COLUMN IF NOT EXISTS codigo_recibo TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS version_recibo TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS vigencia_recibo TEXT NOT NULL DEFAULT '';
