-- Agrega el porcentaje de IVA configurable por concepto, igual que ya existe para retención.
-- Se usa para calcular automáticamente el IVA sugerido al registrar un gasto.
ALTER TABLE public.conceptos
  ADD COLUMN IF NOT EXISTS porcentaje_iva NUMERIC(5,2) NOT NULL DEFAULT 19;

-- Los conceptos que ya tenían cuenta_iva en NULL (ej. Servicios públicos, exentos)
-- quedan en 0% para no calcular IVA donde no aplica.
UPDATE public.conceptos
SET porcentaje_iva = 0
WHERE cuenta_iva IS NULL;
