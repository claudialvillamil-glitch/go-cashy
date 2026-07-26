-- La hoja de "Configuración" (fondo, agencias, tarifas de retención,
-- conceptos de ReteICA) ahora también la pueden editar el Contador y el
-- Analista contable, además del Administrador.

DROP POLICY IF EXISTS "fondo admin update" ON public.fondo_config;
CREATE POLICY "fondo config update" ON public.fondo_config FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'contador', 'analista_contable'));

DROP POLICY IF EXISTS "agencias admin insert" ON public.agencias;
CREATE POLICY "agencias config insert" ON public.agencias FOR INSERT
  WITH CHECK (public.get_my_role() IN ('admin', 'contador', 'analista_contable'));
DROP POLICY IF EXISTS "agencias admin update" ON public.agencias;
CREATE POLICY "agencias config update" ON public.agencias FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'contador', 'analista_contable'));
DROP POLICY IF EXISTS "agencias admin delete" ON public.agencias;
CREATE POLICY "agencias config delete" ON public.agencias FOR DELETE
  USING (public.get_my_role() IN ('admin', 'contador', 'analista_contable'));

DROP POLICY IF EXISTS "tarifas admin insert" ON public.tarifas_retencion_renta;
CREATE POLICY "tarifas config insert" ON public.tarifas_retencion_renta FOR INSERT
  WITH CHECK (public.get_my_role() IN ('admin', 'contador', 'analista_contable'));
DROP POLICY IF EXISTS "tarifas admin update" ON public.tarifas_retencion_renta;
CREATE POLICY "tarifas config update" ON public.tarifas_retencion_renta FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'contador', 'analista_contable'));
DROP POLICY IF EXISTS "tarifas admin delete" ON public.tarifas_retencion_renta;
CREATE POLICY "tarifas config delete" ON public.tarifas_retencion_renta FOR DELETE
  USING (public.get_my_role() IN ('admin', 'contador', 'analista_contable'));

DROP POLICY IF EXISTS "reteica admin insert" ON public.conceptos_reteica;
CREATE POLICY "reteica config insert" ON public.conceptos_reteica FOR INSERT
  WITH CHECK (public.get_my_role() IN ('admin', 'contador', 'analista_contable'));
DROP POLICY IF EXISTS "reteica admin update" ON public.conceptos_reteica;
CREATE POLICY "reteica config update" ON public.conceptos_reteica FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'contador', 'analista_contable'));
DROP POLICY IF EXISTS "reteica admin delete" ON public.conceptos_reteica;
CREATE POLICY "reteica config delete" ON public.conceptos_reteica FOR DELETE
  USING (public.get_my_role() IN ('admin', 'contador', 'analista_contable'));
