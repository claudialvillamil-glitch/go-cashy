
-- Replace true with auth.uid() IS NOT NULL for write policies to satisfy linter
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE (schemaname='public' AND tablename IN ('movimientos','movimiento_items','reembolsos','proveedores','agencias','conceptos','fondo_config'))
       OR (schemaname='storage' AND tablename='objects' AND policyname LIKE 'authenticated facturas%')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- Recreate with auth.uid() IS NOT NULL
CREATE POLICY "auth movimientos select" ON public.movimientos FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth movimientos insert" ON public.movimientos FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth movimientos update" ON public.movimientos FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth movimientos delete" ON public.movimientos FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "auth items select" ON public.movimiento_items FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth items insert" ON public.movimiento_items FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth items update" ON public.movimiento_items FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth items delete" ON public.movimiento_items FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "auth reembolsos select" ON public.reembolsos FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth reembolsos insert" ON public.reembolsos FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth reembolsos update" ON public.reembolsos FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth reembolsos delete" ON public.reembolsos FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "auth proveedores select" ON public.proveedores FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth proveedores insert" ON public.proveedores FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth proveedores update" ON public.proveedores FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth proveedores delete" ON public.proveedores FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "auth agencias select" ON public.agencias FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth agencias insert" ON public.agencias FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth agencias update" ON public.agencias FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth agencias delete" ON public.agencias FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "auth conceptos select" ON public.conceptos FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth conceptos insert" ON public.conceptos FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth conceptos update" ON public.conceptos FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth conceptos delete" ON public.conceptos FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "auth fondo select" ON public.fondo_config FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth fondo insert" ON public.fondo_config FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth fondo update" ON public.fondo_config FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth fondo delete" ON public.fondo_config FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "auth facturas select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'facturas' AND auth.uid() IS NOT NULL);
CREATE POLICY "auth facturas insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'facturas' AND auth.uid() IS NOT NULL);
CREATE POLICY "auth facturas update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'facturas' AND auth.uid() IS NOT NULL) WITH CHECK (bucket_id = 'facturas' AND auth.uid() IS NOT NULL);
CREATE POLICY "auth facturas delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'facturas' AND auth.uid() IS NOT NULL);
