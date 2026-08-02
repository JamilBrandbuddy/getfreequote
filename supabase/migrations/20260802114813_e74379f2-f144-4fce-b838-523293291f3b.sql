CREATE POLICY "Staff can read quote files storage" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'quote-files' AND public.is_staff(auth.uid()));
CREATE POLICY "Admins can delete quote files storage" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'quote-files' AND public.has_role(auth.uid(),'admin'));