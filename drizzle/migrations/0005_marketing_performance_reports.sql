CREATE TABLE public.marketing_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_year integer NOT NULL CHECK (period_year BETWEEN 2020 AND 2100),
  period_month integer NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  currency text NOT NULL DEFAULT 'CAD' CHECK (currency IN ('CAD','USD')),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  highlights text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  current_version integer NOT NULL DEFAULT 0,
  has_unpublished_changes boolean NOT NULL DEFAULT true,
  created_by uuid, created_by_email text,
  updated_by uuid, updated_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  UNIQUE (period_year, period_month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_reports TO authenticated;
GRANT ALL ON public.marketing_reports TO service_role;
ALTER TABLE public.marketing_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Marketing reads report drafts" ON public.marketing_reports FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'marketing'));
CREATE POLICY "Marketing creates reports" ON public.marketing_reports FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'marketing'));
CREATE POLICY "Marketing edits reports" ON public.marketing_reports FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'marketing')) WITH CHECK (public.has_role(auth.uid(),'marketing'));
CREATE POLICY "Marketing deletes unpublished reports" ON public.marketing_reports FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'marketing') AND current_version = 0);
CREATE TRIGGER marketing_reports_updated_at BEFORE UPDATE ON public.marketing_reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.marketing_report_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.marketing_reports(id) ON DELETE RESTRICT,
  version integer NOT NULL,
  period_year integer NOT NULL,
  period_month integer NOT NULL,
  currency text NOT NULL,
  data jsonb NOT NULL,
  highlights text NOT NULL DEFAULT '',
  change_note text,
  published_by uuid, published_by_email text,
  published_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (report_id, version)
);
GRANT SELECT ON public.marketing_report_versions TO authenticated;
GRANT ALL ON public.marketing_report_versions TO service_role;
ALTER TABLE public.marketing_report_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin and marketing read published reports" ON public.marketing_report_versions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'marketing'));

CREATE OR REPLACE FUNCTION public.publish_marketing_report(_report_id uuid, _note text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.marketing_reports; uid uuid := auth.uid(); em text; v integer;
BEGIN
  IF uid IS NULL OR NOT public.has_role(uid,'marketing') THEN RAISE EXCEPTION 'Only Marketing can publish reports'; END IF;
  SELECT * INTO r FROM public.marketing_reports WHERE id = _report_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Report not found'; END IF;
  em := coalesce(auth.jwt()->>'email','');
  v := r.current_version + 1;
  INSERT INTO public.marketing_report_versions(report_id,version,period_year,period_month,currency,data,highlights,change_note,published_by,published_by_email)
  VALUES (r.id,v,r.period_year,r.period_month,r.currency,r.data,r.highlights,nullif(trim(coalesce(_note,'')),''),uid,em);
  UPDATE public.marketing_reports SET status='published', current_version=v, has_unpublished_changes=false, published_at=now(), updated_by=uid, updated_by_email=em WHERE id=r.id;
  RETURN jsonb_build_object('version',v);
END $$;
REVOKE ALL ON FUNCTION public.publish_marketing_report(uuid,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.publish_marketing_report(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.marketing_quote_stats(_year integer, _month integer)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE s timestamptz; e timestamptz; res jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'marketing')) THEN RAISE EXCEPTION 'Access required'; END IF;
  s := make_date(_year,_month,1)::timestamp AT TIME ZONE 'America/Regina';
  e := (make_date(_year,_month,1) + interval '1 month')::timestamp AT TIME ZONE 'America/Regina';
  SELECT jsonb_build_object(
    'submissions', count(*),
    'spam', count(*) FILTER (WHERE status='spam'),
    'uniqueCustomers', count(DISTINCT right(regexp_replace(customer_phone,'\D','','g'),10)) FILTER (WHERE status<>'spam'),
    'converted', count(*) FILTER (WHERE status<>'spam' AND conversion_status='converted'),
    'notConverted', count(*) FILTER (WHERE status<>'spam' AND conversion_status='not_converted'),
    'pending', count(*) FILTER (WHERE status<>'spam' AND conversion_status='pending')
  ) INTO res FROM public.quotes WHERE created_at >= s AND created_at < e;
  RETURN res;
END $$;
REVOKE ALL ON FUNCTION public.marketing_quote_stats(integer,integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.marketing_quote_stats(integer,integer) TO authenticated;