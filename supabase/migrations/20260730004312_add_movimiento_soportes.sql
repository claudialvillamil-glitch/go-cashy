-- Soportes adicionales de un movimiento (aparte del principal, que sigue
-- guardándose en movimientos.factura_path). Útil cuando un solo pago viene
-- respaldado por varias facturas/documentos escaneados.
CREATE TABLE IF NOT EXISTS public.movimiento_soportes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movimiento_id UUID NOT NULL REFERENCES public.movimientos(id) ON DELETE CASCADE,
  factura_path TEXT NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimiento_soportes TO anon, authenticated;
GRANT ALL ON public.movimiento_soportes TO service_role;
ALTER TABLE public.movimiento_soportes ENABLE ROW LEVEL SECURITY;

-- Mismas reglas que los movimientos: admin/contador/auditoría/analista ven
-- todo, responsable solo los de su agencia.
CREATE POLICY "soportes select" ON public.movimiento_soportes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.movimientos m WHERE m.id = movimiento_id
    AND (public.get_my_role() IN ('admin', 'contador', 'auditoria', 'analista_contable')
      OR m.agencia_id = public.get_my_agencia())
  ));
CREATE POLICY "soportes insert" ON public.movimiento_soportes FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.movimientos m WHERE m.id = movimiento_id
    AND (public.get_my_role() IN ('admin', 'analista_contable')
      OR (public.get_my_role() = 'responsable' AND m.agencia_id = public.get_my_agencia()))
  ));
CREATE POLICY "soportes delete" ON public.movimiento_soportes FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.movimientos m WHERE m.id = movimiento_id
    AND (public.get_my_role() IN ('admin', 'analista_contable')
      OR (public.get_my_role() = 'responsable' AND m.agencia_id = public.get_my_agencia()))
  ));
