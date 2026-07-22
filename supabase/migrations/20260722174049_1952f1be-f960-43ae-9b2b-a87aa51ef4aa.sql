
CREATE POLICY "public facturas read" ON storage.objects FOR SELECT USING (bucket_id = 'facturas');
CREATE POLICY "public facturas write" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'facturas');
CREATE POLICY "public facturas update" ON storage.objects FOR UPDATE USING (bucket_id = 'facturas');
CREATE POLICY "public facturas delete" ON storage.objects FOR DELETE USING (bucket_id = 'facturas');
