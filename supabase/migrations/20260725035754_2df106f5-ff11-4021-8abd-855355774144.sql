
-- Drop all overly permissive policies and replace with authenticated-only

-- movimientos
DROP POLICY IF EXISTS "public movimientos" ON public.movimientos;
CREATE POLICY "authenticated movimientos" ON public.movimientos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- movimiento_items
DROP POLICY IF EXISTS "public movimiento_items" ON public.movimiento_items;
CREATE POLICY "authenticated movimiento_items" ON public.movimiento_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- reembolsos
DROP POLICY IF EXISTS "public reembolsos" ON public.reembolsos;
CREATE POLICY "authenticated reembolsos" ON public.reembolsos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- proveedores
DROP POLICY IF EXISTS "public proveedores" ON public.proveedores;
CREATE POLICY "authenticated proveedores" ON public.proveedores
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- agencias
DROP POLICY IF EXISTS "public agencias" ON public.agencias;
CREATE POLICY "authenticated agencias read" ON public.agencias
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated agencias write" ON public.agencias
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated agencias update" ON public.agencias
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated agencias delete" ON public.agencias
  FOR DELETE TO authenticated USING (true);

-- conceptos
DROP POLICY IF EXISTS "public conceptos" ON public.conceptos;
CREATE POLICY "authenticated conceptos read" ON public.conceptos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated conceptos write" ON public.conceptos
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated conceptos update" ON public.conceptos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated conceptos delete" ON public.conceptos
  FOR DELETE TO authenticated USING (true);

-- fondo_config
DROP POLICY IF EXISTS "public read fondo" ON public.fondo_config;
DROP POLICY IF EXISTS "public write fondo" ON public.fondo_config;
CREATE POLICY "authenticated fondo read" ON public.fondo_config
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated fondo insert" ON public.fondo_config
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated fondo update" ON public.fondo_config
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated fondo delete" ON public.fondo_config
  FOR DELETE TO authenticated USING (true);

-- Revoke anon grants on these tables
REVOKE ALL ON public.movimientos FROM anon;
REVOKE ALL ON public.movimiento_items FROM anon;
REVOKE ALL ON public.reembolsos FROM anon;
REVOKE ALL ON public.proveedores FROM anon;
REVOKE ALL ON public.agencias FROM anon;
REVOKE ALL ON public.conceptos FROM anon;
REVOKE ALL ON public.fondo_config FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimientos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimiento_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reembolsos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proveedores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agencias TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conceptos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fondo_config TO authenticated;

-- Storage: facturas bucket - authenticated only
DROP POLICY IF EXISTS "public facturas read" ON storage.objects;
DROP POLICY IF EXISTS "public facturas write" ON storage.objects;
DROP POLICY IF EXISTS "public facturas update" ON storage.objects;
DROP POLICY IF EXISTS "public facturas delete" ON storage.objects;

CREATE POLICY "authenticated facturas read" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'facturas');
CREATE POLICY "authenticated facturas write" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'facturas');
CREATE POLICY "authenticated facturas update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'facturas') WITH CHECK (bucket_id = 'facturas');
CREATE POLICY "authenticated facturas delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'facturas');
