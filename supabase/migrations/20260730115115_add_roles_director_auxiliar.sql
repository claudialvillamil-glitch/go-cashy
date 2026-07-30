-- Nuevos roles:
-- "director_agencia": igual que responsable en cuanto a que está vinculado
--   a UNA agencia, pero de solo consulta (no crea recibos ni solicita
--   reembolsos). El acceso de lectura ya funciona automáticamente gracias a
--   las políticas existentes que permiten ver lo de "mi agencia"
--   (agencia_id = get_my_agencia()), sin necesitar estar en la lista de
--   roles con acceso total. Solo falta permitir el valor del rol.
-- "auxiliar_contable": exactamente los mismos permisos que analista_contable
--   (consulta total + configuración), así que se agrega a todas las
--   políticas donde aparece analista_contable.

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_rol_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_rol_check
  CHECK (rol IN ('pendiente', 'admin', 'responsable', 'contador', 'auditoria', 'analista_contable', 'director_agencia', 'auxiliar_contable'));

-- Movimientos: lectura total para roles de oficina central + auxiliar contable.
DROP POLICY IF EXISTS "movimientos select" ON public.movimientos;
CREATE POLICY "movimientos select" ON public.movimientos FOR SELECT
  USING (
    public.get_my_role() IN ('admin', 'contador', 'auditoria', 'analista_contable', 'auxiliar_contable')
    OR agencia_id = public.get_my_agencia()
  );

DROP POLICY IF EXISTS "items select" ON public.movimiento_items;
CREATE POLICY "items select" ON public.movimiento_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.movimientos m WHERE m.id = movimiento_id
    AND (public.get_my_role() IN ('admin', 'contador', 'auditoria', 'analista_contable', 'auxiliar_contable')
      OR m.agencia_id = public.get_my_agencia())
  ));

-- Movimientos: modificar (igual que analista_contable).
DROP POLICY IF EXISTS "movimientos update" ON public.movimientos;
CREATE POLICY "movimientos update" ON public.movimientos FOR UPDATE
  USING (
    public.get_my_role() IN ('admin', 'analista_contable', 'auxiliar_contable')
    OR (public.get_my_role() = 'responsable' AND agencia_id = public.get_my_agencia())
  );

DROP POLICY IF EXISTS "items update" ON public.movimiento_items;
CREATE POLICY "items update" ON public.movimiento_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.movimientos m WHERE m.id = movimiento_id
    AND (public.get_my_role() IN ('admin', 'analista_contable', 'auxiliar_contable')
      OR (public.get_my_role() = 'responsable' AND m.agencia_id = public.get_my_agencia()))
  ));

-- Reembolsos: lectura total.
DROP POLICY IF EXISTS "reembolsos select" ON public.reembolsos;
CREATE POLICY "reembolsos select" ON public.reembolsos
FOR SELECT TO authenticated
USING (
  get_my_role() = ANY (ARRAY['admin','contador','auditoria','analista_contable','auxiliar_contable'])
  OR EXISTS (
    SELECT 1 FROM public.movimientos m
    WHERE m.reembolso_id = reembolsos.id
      AND m.agencia_id = get_my_agencia()
  )
);

-- Soportes adicionales: lectura total.
DROP POLICY IF EXISTS "movimiento_soportes select" ON public.movimiento_soportes;
CREATE POLICY "movimiento_soportes select" ON public.movimiento_soportes
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.movimientos m
  WHERE m.id = movimiento_soportes.movimiento_id
    AND (
      get_my_role() = ANY (ARRAY['admin','contador','auditoria','analista_contable','auxiliar_contable'])
      OR m.agencia_id = get_my_agencia()
    )
));
DROP POLICY IF EXISTS "soportes select" ON public.movimiento_soportes;
CREATE POLICY "soportes select" ON public.movimiento_soportes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.movimientos m WHERE m.id = movimiento_id
    AND (public.get_my_role() IN ('admin', 'contador', 'auditoria', 'analista_contable', 'auxiliar_contable')
      OR m.agencia_id = public.get_my_agencia())
  ));
DROP POLICY IF EXISTS "soportes insert" ON public.movimiento_soportes;
CREATE POLICY "soportes insert" ON public.movimiento_soportes FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.movimientos m WHERE m.id = movimiento_id
    AND (public.get_my_role() IN ('admin', 'analista_contable', 'auxiliar_contable')
      OR (public.get_my_role() = 'responsable' AND m.agencia_id = public.get_my_agencia()))
  ));
DROP POLICY IF EXISTS "soportes delete" ON public.movimiento_soportes;
CREATE POLICY "soportes delete" ON public.movimiento_soportes FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.movimientos m WHERE m.id = movimiento_id
    AND (public.get_my_role() IN ('admin', 'analista_contable', 'auxiliar_contable')
      OR (public.get_my_role() = 'responsable' AND m.agencia_id = public.get_my_agencia()))
  ));

-- Configuración (fondo, agencias, tarifas, ReteICA) editable por auxiliar
-- contable también.
DROP POLICY IF EXISTS "fondo config update" ON public.fondo_config;
CREATE POLICY "fondo config update" ON public.fondo_config FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'contador', 'analista_contable', 'auxiliar_contable'));

DROP POLICY IF EXISTS "agencias config insert" ON public.agencias;
CREATE POLICY "agencias config insert" ON public.agencias FOR INSERT
  WITH CHECK (public.get_my_role() IN ('admin', 'contador', 'analista_contable', 'auxiliar_contable'));
DROP POLICY IF EXISTS "agencias config update" ON public.agencias;
CREATE POLICY "agencias config update" ON public.agencias FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'contador', 'analista_contable', 'auxiliar_contable'));
DROP POLICY IF EXISTS "agencias config delete" ON public.agencias;
CREATE POLICY "agencias config delete" ON public.agencias FOR DELETE
  USING (public.get_my_role() IN ('admin', 'contador', 'analista_contable', 'auxiliar_contable'));

DROP POLICY IF EXISTS "tarifas config insert" ON public.tarifas_retencion_renta;
CREATE POLICY "tarifas config insert" ON public.tarifas_retencion_renta FOR INSERT
  WITH CHECK (public.get_my_role() IN ('admin', 'contador', 'analista_contable', 'auxiliar_contable'));
DROP POLICY IF EXISTS "tarifas config update" ON public.tarifas_retencion_renta;
CREATE POLICY "tarifas config update" ON public.tarifas_retencion_renta FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'contador', 'analista_contable', 'auxiliar_contable'));
DROP POLICY IF EXISTS "tarifas config delete" ON public.tarifas_retencion_renta;
CREATE POLICY "tarifas config delete" ON public.tarifas_retencion_renta FOR DELETE
  USING (public.get_my_role() IN ('admin', 'contador', 'analista_contable', 'auxiliar_contable'));

DROP POLICY IF EXISTS "reteica config insert" ON public.conceptos_reteica;
CREATE POLICY "reteica config insert" ON public.conceptos_reteica FOR INSERT
  WITH CHECK (public.get_my_role() IN ('admin', 'contador', 'analista_contable', 'auxiliar_contable'));
DROP POLICY IF EXISTS "reteica config update" ON public.conceptos_reteica;
CREATE POLICY "reteica config update" ON public.conceptos_reteica FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'contador', 'analista_contable', 'auxiliar_contable'));
DROP POLICY IF EXISTS "reteica config delete" ON public.conceptos_reteica;
CREATE POLICY "reteica config delete" ON public.conceptos_reteica FOR DELETE
  USING (public.get_my_role() IN ('admin', 'contador', 'analista_contable', 'auxiliar_contable'));

DROP POLICY IF EXISTS "reteica ciudad config insert" ON public.tarifas_reteica_ciudad;
CREATE POLICY "reteica ciudad config insert" ON public.tarifas_reteica_ciudad FOR INSERT
  WITH CHECK (public.get_my_role() IN ('admin', 'contador', 'analista_contable', 'auxiliar_contable'));
DROP POLICY IF EXISTS "reteica ciudad config update" ON public.tarifas_reteica_ciudad;
CREATE POLICY "reteica ciudad config update" ON public.tarifas_reteica_ciudad FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'contador', 'analista_contable', 'auxiliar_contable'));
DROP POLICY IF EXISTS "reteica ciudad config delete" ON public.tarifas_reteica_ciudad;
CREATE POLICY "reteica ciudad config delete" ON public.tarifas_reteica_ciudad FOR DELETE
  USING (public.get_my_role() IN ('admin', 'contador', 'analista_contable', 'auxiliar_contable'));

DROP POLICY IF EXISTS "fondos_agencia config insert" ON public.fondos_agencia;
CREATE POLICY "fondos_agencia config insert" ON public.fondos_agencia FOR INSERT
  WITH CHECK (public.get_my_role() IN ('admin', 'contador', 'analista_contable', 'auxiliar_contable'));
DROP POLICY IF EXISTS "fondos_agencia config update" ON public.fondos_agencia;
CREATE POLICY "fondos_agencia config update" ON public.fondos_agencia FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'contador', 'analista_contable', 'auxiliar_contable'));
DROP POLICY IF EXISTS "fondos_agencia config delete" ON public.fondos_agencia;
CREATE POLICY "fondos_agencia config delete" ON public.fondos_agencia FOR DELETE
  USING (public.get_my_role() IN ('admin', 'contador', 'analista_contable', 'auxiliar_contable'));

-- Archivos de factura: auxiliar contable ve todo, igual que analista.
CREATE OR REPLACE FUNCTION public.can_read_factura(_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_active_user() AND (
    get_my_role() = ANY (ARRAY['admin','contador','auditoria','analista_contable','auxiliar_contable'])
    OR split_part(_name, '/', 1) = COALESCE(get_my_agencia()::text, '~none~')
    OR EXISTS (
      SELECT 1 FROM public.movimientos m
      WHERE m.factura_path = _name AND m.agencia_id = get_my_agencia()
    )
    OR EXISTS (
      SELECT 1 FROM public.movimiento_soportes s
      JOIN public.movimientos m ON m.id = s.movimiento_id
      WHERE s.factura_path = _name AND m.agencia_id = get_my_agencia()
    )
  );
$$;
