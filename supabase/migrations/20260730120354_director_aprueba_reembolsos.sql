-- El Director de agencia puede cambiar el estado (aprobar/marcar pagado) de
-- los reembolsos que incluyan movimientos de SU propia agencia, además del
-- administrador (que sigue pudiendo hacerlo para cualquiera).
DROP POLICY IF EXISTS "reembolsos update" ON public.reembolsos;
CREATE POLICY "reembolsos update" ON public.reembolsos FOR UPDATE
  USING (
    public.get_my_role() = 'admin'
    OR (
      public.get_my_role() = 'director_agencia'
      AND EXISTS (
        SELECT 1 FROM public.movimientos m
        WHERE m.reembolso_id = reembolsos.id
          AND m.agencia_id = public.get_my_agencia()
      )
    )
  );
