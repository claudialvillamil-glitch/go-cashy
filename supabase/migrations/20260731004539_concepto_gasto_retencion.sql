-- Cada concepto de gasto (Cafetería, Transporte, Papelería, etc.) queda
-- vinculado a su concepto de retención (Compras o Servicios), para que el
-- sistema aplique la retención automáticamente sin que el usuario tenga que
-- elegir Compras/Servicios manualmente cada vez.
ALTER TABLE public.conceptos
  ADD COLUMN IF NOT EXISTS concepto_retencion_renta_id UUID REFERENCES public.conceptos_retencion_renta(id);
