
CREATE POLICY "company invoices read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'invoices' AND (storage.foldername(name))[1] = public.get_user_company_id()::text);

CREATE POLICY "company invoices insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'invoices' AND (storage.foldername(name))[1] = public.get_user_company_id()::text);

CREATE POLICY "company invoices update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'invoices' AND (storage.foldername(name))[1] = public.get_user_company_id()::text);

CREATE POLICY "company invoices delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'invoices' AND (storage.foldername(name))[1] = public.get_user_company_id()::text);
