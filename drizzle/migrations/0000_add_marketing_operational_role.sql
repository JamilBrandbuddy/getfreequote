ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'marketing';
CREATE OR REPLACE FUNCTION public.is_operator(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text IN ('admin','marketing','staff'));
$$;
REVOKE ALL ON FUNCTION public.is_operator(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_operator(uuid) TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT public.is_operator(_user_id);
$$;
COMMENT ON FUNCTION public.is_staff(uuid) IS 'Compatibility wrapper for published legacy code; use is_operator for new operational authorization.';
CREATE POLICY "Operators can delete quotes" ON public.quotes FOR DELETE TO authenticated USING (public.is_operator(auth.uid()));
CREATE POLICY "Operators can delete attachment rows" ON public.quote_files FOR DELETE TO authenticated USING (public.is_operator(auth.uid()));
CREATE POLICY "Operators can delete private attachments" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'quote-files' AND public.is_operator(auth.uid()));