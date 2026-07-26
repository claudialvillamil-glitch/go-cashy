-- =========================================================================
-- PERFILES Y ROLES
-- =========================================================================
-- rol: 'pendiente' (recién registrado, sin acceso), 'admin' (todo),
-- 'responsable' (solo su agencia), 'contador' (lectura de todo).
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'pendiente' CHECK (rol IN ('pendiente', 'admin', 'responsable', 'contador')),
  agencia_id UUID REFERENCES public.agencias(id),
  activo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO anon, authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Funciones auxiliares (SECURITY DEFINER para evitar recursión de RLS al
-- consultar profiles desde las políticas de otras tablas).
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT rol FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_agencia()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT agencia_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT activo FROM public.profiles WHERE id = auth.uid()), false);
$$;

-- Al registrarse un usuario nuevo (auth.users), se crea automáticamente su
-- fila en profiles, inactiva y en rol "pendiente" hasta que un admin lo active.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  es_primero BOOLEAN;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO es_primero;
  INSERT INTO public.profiles (id, email, nombre, rol, activo)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'nombre', ''),
    CASE WHEN es_primero THEN 'admin' ELSE 'pendiente' END,
    es_primero
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP POLICY IF EXISTS "select own or admin" ON public.profiles;
CREATE POLICY "select own or admin" ON public.profiles FOR SELECT
  USING (id = auth.uid() OR public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "insert own profile" ON public.profiles;
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "update own or admin" ON public.profiles;
CREATE POLICY "update own or admin" ON public.profiles FOR UPDATE
  USING (id = auth.uid() OR public.get_my_role() = 'admin')
  WITH CHECK (id = auth.uid() OR public.get_my_role() = 'admin');

-- =========================================================================
-- REEMPLAZO DE POLÍTICAS ABIERTAS/GENÉRICAS POR REGLAS DE ROL Y AGENCIA
-- =========================================================================

DROP POLICY IF EXISTS "public agencias" ON public.agencias;
DROP POLICY IF EXISTS "authenticated agencias read" ON public.agencias;
DROP POLICY IF EXISTS "authenticated agencias write" ON public.agencias;
DROP POLICY IF EXISTS "authenticated agencias update" ON public.agencias;
DROP POLICY IF EXISTS "authenticated agencias delete" ON public.agencias;
DROP POLICY IF EXISTS "auth agencias select" ON public.agencias;
DROP POLICY IF EXISTS "auth agencias insert" ON public.agencias;
DROP POLICY IF EXISTS "auth agencias update" ON public.agencias;
DROP POLICY IF EXISTS "auth agencias delete" ON public.agencias;
CREATE POLICY "agencias select activos" ON public.agencias FOR SELECT USING (public.is_active_user());
CREATE POLICY "agencias admin insert" ON public.agencias FOR INSERT WITH CHECK (public.get_my_role() = 'admin');
CREATE POLICY "agencias admin update" ON public.agencias FOR UPDATE USING (public.get_my_role() = 'admin');
CREATE POLICY "agencias admin delete" ON public.agencias FOR DELETE USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "public conceptos" ON public.conceptos;
DROP POLICY IF EXISTS "authenticated conceptos read" ON public.conceptos;
DROP POLICY IF EXISTS "authenticated conceptos write" ON public.conceptos;
DROP POLICY IF EXISTS "authenticated conceptos update" ON public.conceptos;
DROP POLICY IF EXISTS "authenticated conceptos delete" ON public.conceptos;
DROP POLICY IF EXISTS "auth conceptos select" ON public.conceptos;
DROP POLICY IF EXISTS "auth conceptos insert" ON public.conceptos;
DROP POLICY IF EXISTS "auth conceptos update" ON public.conceptos;
DROP POLICY IF EXISTS "auth conceptos delete" ON public.conceptos;
CREATE POLICY "conceptos select activos" ON public.conceptos FOR SELECT USING (public.is_active_user());
CREATE POLICY "conceptos admin insert" ON public.conceptos FOR INSERT WITH CHECK (public.get_my_role() = 'admin');
CREATE POLICY "conceptos admin update" ON public.conceptos FOR UPDATE USING (public.get_my_role() = 'admin');
CREATE POLICY "conceptos admin delete" ON public.conceptos FOR DELETE USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "public write fondo" ON public.fondo_config;
DROP POLICY IF EXISTS "public read fondo" ON public.fondo_config;
DROP POLICY IF EXISTS "authenticated fondo read" ON public.fondo_config;
DROP POLICY IF EXISTS "authenticated fondo insert" ON public.fondo_config;
DROP POLICY IF EXISTS "authenticated fondo update" ON public.fondo_config;
DROP POLICY IF EXISTS "authenticated fondo delete" ON public.fondo_config;
DROP POLICY IF EXISTS "auth fondo select" ON public.fondo_config;
DROP POLICY IF EXISTS "auth fondo insert" ON public.fondo_config;
DROP POLICY IF EXISTS "auth fondo update" ON public.fondo_config;
DROP POLICY IF EXISTS "auth fondo delete" ON public.fondo_config;
CREATE POLICY "fondo select activos" ON public.fondo_config FOR SELECT USING (public.is_active_user());
CREATE POLICY "fondo admin update" ON public.fondo_config FOR UPDATE USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "public proveedores" ON public.proveedores;
DROP POLICY IF EXISTS "authenticated proveedores" ON public.proveedores;
DROP POLICY IF EXISTS "auth proveedores select" ON public.proveedores;
DROP POLICY IF EXISTS "auth proveedores insert" ON public.proveedores;
DROP POLICY IF EXISTS "auth proveedores update" ON public.proveedores;
DROP POLICY IF EXISTS "auth proveedores delete" ON public.proveedores;
CREATE POLICY "proveedores select activos" ON public.proveedores FOR SELECT USING (public.is_active_user());
CREATE POLICY "proveedores insert activos" ON public.proveedores FOR INSERT WITH CHECK (public.is_active_user());
CREATE POLICY "proveedores update activos" ON public.proveedores FOR UPDATE USING (public.is_active_user());
CREATE POLICY "proveedores admin delete" ON public.proveedores FOR DELETE USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "public tarifas_retencion_renta" ON public.tarifas_retencion_renta;
CREATE POLICY "tarifas select activos" ON public.tarifas_retencion_renta FOR SELECT USING (public.is_active_user());
CREATE POLICY "tarifas admin insert" ON public.tarifas_retencion_renta FOR INSERT WITH CHECK (public.get_my_role() = 'admin');
CREATE POLICY "tarifas admin update" ON public.tarifas_retencion_renta FOR UPDATE USING (public.get_my_role() = 'admin');
CREATE POLICY "tarifas admin delete" ON public.tarifas_retencion_renta FOR DELETE USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "public conceptos_reteica" ON public.conceptos_reteica;
CREATE POLICY "reteica select activos" ON public.conceptos_reteica FOR SELECT USING (public.is_active_user());
CREATE POLICY "reteica admin insert" ON public.conceptos_reteica FOR INSERT WITH CHECK (public.get_my_role() = 'admin');
CREATE POLICY "reteica admin update" ON public.conceptos_reteica FOR UPDATE USING (public.get_my_role() = 'admin');
CREATE POLICY "reteica admin delete" ON public.conceptos_reteica FOR DELETE USING (public.get_my_role() = 'admin');

-- Movimientos: el responsable solo ve/crea/edita los de su propia agencia;
-- admin y contador ven todo; solo admin puede borrar.
DROP POLICY IF EXISTS "public movimientos" ON public.movimientos;
DROP POLICY IF EXISTS "authenticated movimientos" ON public.movimientos;
DROP POLICY IF EXISTS "auth movimientos select" ON public.movimientos;
DROP POLICY IF EXISTS "auth movimientos insert" ON public.movimientos;
DROP POLICY IF EXISTS "auth movimientos update" ON public.movimientos;
DROP POLICY IF EXISTS "auth movimientos delete" ON public.movimientos;
CREATE POLICY "movimientos select" ON public.movimientos FOR SELECT
  USING (public.get_my_role() IN ('admin', 'contador') OR agencia_id = public.get_my_agencia());
CREATE POLICY "movimientos insert" ON public.movimientos FOR INSERT
  WITH CHECK (
    public.get_my_role() = 'admin'
    OR (public.get_my_role() = 'responsable' AND agencia_id = public.get_my_agencia())
  );
CREATE POLICY "movimientos update" ON public.movimientos FOR UPDATE
  USING (
    public.get_my_role() = 'admin'
    OR (public.get_my_role() = 'responsable' AND agencia_id = public.get_my_agencia())
  );
CREATE POLICY "movimientos delete" ON public.movimientos FOR DELETE
  USING (public.get_my_role() = 'admin');

-- Movimiento_items: mismas reglas, mirando la agencia del movimiento padre.
DROP POLICY IF EXISTS "public movimiento_items" ON public.movimiento_items;
DROP POLICY IF EXISTS "authenticated movimiento_items" ON public.movimiento_items;
DROP POLICY IF EXISTS "auth items select" ON public.movimiento_items;
DROP POLICY IF EXISTS "auth items insert" ON public.movimiento_items;
DROP POLICY IF EXISTS "auth items update" ON public.movimiento_items;
DROP POLICY IF EXISTS "auth items delete" ON public.movimiento_items;
CREATE POLICY "items select" ON public.movimiento_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.movimientos m WHERE m.id = movimiento_id
    AND (public.get_my_role() IN ('admin', 'contador') OR m.agencia_id = public.get_my_agencia())
  ));
CREATE POLICY "items insert" ON public.movimiento_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.movimientos m WHERE m.id = movimiento_id
    AND (public.get_my_role() = 'admin'
      OR (public.get_my_role() = 'responsable' AND m.agencia_id = public.get_my_agencia()))
  ));
CREATE POLICY "items update" ON public.movimiento_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.movimientos m WHERE m.id = movimiento_id
    AND (public.get_my_role() = 'admin'
      OR (public.get_my_role() = 'responsable' AND m.agencia_id = public.get_my_agencia()))
  ));
CREATE POLICY "items delete" ON public.movimiento_items FOR DELETE
  USING (public.get_my_role() = 'admin');

-- Reembolsos: admin/contador ven todos; responsable ve los que incluyan
-- movimientos de su agencia. Solo admin aprueba/paga (update) o borra.
DROP POLICY IF EXISTS "public reembolsos" ON public.reembolsos;
DROP POLICY IF EXISTS "authenticated reembolsos" ON public.reembolsos;
DROP POLICY IF EXISTS "auth reembolsos select" ON public.reembolsos;
DROP POLICY IF EXISTS "auth reembolsos insert" ON public.reembolsos;
DROP POLICY IF EXISTS "auth reembolsos update" ON public.reembolsos;
DROP POLICY IF EXISTS "auth reembolsos delete" ON public.reembolsos;
CREATE POLICY "reembolsos select" ON public.reembolsos FOR SELECT
  USING (
    public.get_my_role() IN ('admin', 'contador')
    OR EXISTS (SELECT 1 FROM public.movimientos m WHERE m.reembolso_id = id AND m.agencia_id = public.get_my_agencia())
  );
CREATE POLICY "reembolsos insert" ON public.reembolsos FOR INSERT
  WITH CHECK (public.is_active_user());
CREATE POLICY "reembolsos update" ON public.reembolsos FOR UPDATE
  USING (public.get_my_role() = 'admin');
CREATE POLICY "reembolsos delete" ON public.reembolsos FOR DELETE
  USING (public.get_my_role() = 'admin');

-- Storage (soportes/facturas): cualquier usuario activo puede ver y subir.
DROP POLICY IF EXISTS "public facturas read" ON storage.objects;
DROP POLICY IF EXISTS "public facturas write" ON storage.objects;
DROP POLICY IF EXISTS "public facturas update" ON storage.objects;
DROP POLICY IF EXISTS "public facturas delete" ON storage.objects;
DROP POLICY IF EXISTS "authenticated facturas read" ON storage.objects;
DROP POLICY IF EXISTS "authenticated facturas write" ON storage.objects;
DROP POLICY IF EXISTS "authenticated facturas update" ON storage.objects;
DROP POLICY IF EXISTS "authenticated facturas delete" ON storage.objects;
DROP POLICY IF EXISTS "auth facturas select" ON storage.objects;
DROP POLICY IF EXISTS "auth facturas insert" ON storage.objects;
DROP POLICY IF EXISTS "auth facturas update" ON storage.objects;
DROP POLICY IF EXISTS "auth facturas delete" ON storage.objects;
CREATE POLICY "facturas select activos" ON storage.objects FOR SELECT
  USING (bucket_id = 'facturas' AND public.is_active_user());
CREATE POLICY "facturas insert activos" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'facturas' AND public.is_active_user());
CREATE POLICY "facturas update activos" ON storage.objects FOR UPDATE
  USING (bucket_id = 'facturas' AND public.is_active_user());
CREATE POLICY "facturas delete admin" ON storage.objects FOR DELETE
  USING (bucket_id = 'facturas' AND public.get_my_role() = 'admin');
