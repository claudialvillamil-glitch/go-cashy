-- Solo Admin y Responsable de agencia pueden crear solicitudes de reembolso.
-- Contador, Auditoría y Analista contable siguen pudiendo verlas (solo consulta).
DROP POLICY IF EXISTS "reembolsos insert" ON public.reembolsos;
CREATE POLICY "reembolsos insert" ON public.reembolsos FOR INSERT
  WITH CHECK (public.get_my_role() IN ('admin', 'responsable'));
