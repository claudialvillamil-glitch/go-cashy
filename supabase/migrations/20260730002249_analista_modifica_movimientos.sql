-- El Analista contable ahora también puede modificar (editar/corregir)
-- movimientos, además de admin y responsable (en su propia agencia).
DROP POLICY IF EXISTS "movimientos update" ON public.movimientos;
CREATE POLICY "movimientos update" ON public.movimientos FOR UPDATE
  USING (
    public.get_my_role() IN ('admin', 'analista_contable')
    OR (public.get_my_role() = 'responsable' AND agencia_id = public.get_my_agencia())
  );

-- Igual para los ítems de recibos con varios soportes.
DROP POLICY IF EXISTS "items update" ON public.movimiento_items;
CREATE POLICY "items update" ON public.movimiento_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.movimientos m WHERE m.id = movimiento_id
    AND (public.get_my_role() IN ('admin', 'analista_contable')
      OR (public.get_my_role() = 'responsable' AND m.agencia_id = public.get_my_agencia()))
  ));
