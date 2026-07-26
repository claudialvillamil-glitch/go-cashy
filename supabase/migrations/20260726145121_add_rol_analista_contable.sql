-- Nuevo rol "analista_contable": mismo alcance de solo consulta que
-- contador/auditoria (ve todas las agencias, no registra ni aprueba).
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_rol_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_rol_check
  CHECK (rol IN ('pendiente', 'admin', 'responsable', 'contador', 'auditoria', 'analista_contable'));

DROP POLICY IF EXISTS "movimientos select" ON public.movimientos;
CREATE POLICY "movimientos select" ON public.movimientos FOR SELECT
  USING (
    public.get_my_role() IN ('admin', 'contador', 'auditoria', 'analista_contable')
    OR agencia_id = public.get_my_agencia()
  );

DROP POLICY IF EXISTS "items select" ON public.movimiento_items;
CREATE POLICY "items select" ON public.movimiento_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.movimientos m WHERE m.id = movimiento_id
    AND (public.get_my_role() IN ('admin', 'contador', 'auditoria', 'analista_contable')
      OR m.agencia_id = public.get_my_agencia())
  ));

DROP POLICY IF EXISTS "reembolsos select" ON public.reembolsos;
CREATE POLICY "reembolsos select" ON public.reembolsos FOR SELECT
  USING (
    public.get_my_role() IN ('admin', 'contador', 'auditoria', 'analista_contable')
    OR EXISTS (SELECT 1 FROM public.movimientos m WHERE m.reembolso_id = id AND m.agencia_id = public.get_my_agencia())
  );
