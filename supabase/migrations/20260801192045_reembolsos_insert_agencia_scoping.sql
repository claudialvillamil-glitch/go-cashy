-- Un "responsable" solo puede crear reembolsos para SU PROPIA agencia (antes
-- la política solo verificaba el rol, sin confirmar la agencia — alguien
-- podría, en teoría, forzar una petición directa para crear un reembolso a
-- nombre de otra agencia).
DROP POLICY IF EXISTS "reembolsos insert" ON public.reembolsos;
CREATE POLICY "reembolsos insert" ON public.reembolsos FOR INSERT
  WITH CHECK (
    public.get_my_role() = 'admin'
    OR (public.get_my_role() = 'responsable' AND agencia_id = public.get_my_agencia())
  );
