ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS conversion_status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS conversion_changed_at timestamptz;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS conversion_changed_by uuid;
ALTER TABLE public.quotes ADD CONSTRAINT quotes_conversion_status_check CHECK (conversion_status IN ('pending','converted','not_converted'));
COMMENT ON COLUMN public.quotes.conversion_status IS 'Manually confirmed sales outcome. pending until a team member confirms. Independent of quote status.';

CREATE TABLE public.quote_conversion_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  previous_status text,
  new_status text NOT NULL,
  note text,
  changed_by uuid,
  changed_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.quote_conversion_history TO authenticated;
GRANT ALL ON public.quote_conversion_history TO service_role;
ALTER TABLE public.quote_conversion_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Operators can read conversion history" ON public.quote_conversion_history FOR SELECT TO authenticated USING (public.is_operator(auth.uid()));
CREATE INDEX quote_conversion_history_quote_idx ON public.quote_conversion_history(quote_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.guard_conversion_columns() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (NEW.conversion_status IS DISTINCT FROM OLD.conversion_status OR NEW.conversion_changed_at IS DISTINCT FROM OLD.conversion_changed_at OR NEW.conversion_changed_by IS DISTINCT FROM OLD.conversion_changed_by)
     AND coalesce(current_setting('app.conversion_write', true), '') <> 'on' THEN
    RAISE EXCEPTION 'Conversion outcome can only be changed through the audited action';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER quotes_guard_conversion BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.guard_conversion_columns();

CREATE OR REPLACE FUNCTION public.set_quote_conversion(_quote_id uuid, _new_status text, _note text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE prev text; uid uuid := auth.uid(); mail text;
BEGIN
  IF uid IS NULL OR NOT public.is_operator(uid) THEN RAISE EXCEPTION 'Dashboard access required'; END IF;
  IF _new_status NOT IN ('pending','converted','not_converted') THEN RAISE EXCEPTION 'Invalid conversion status'; END IF;
  SELECT conversion_status INTO prev FROM public.quotes WHERE id = _quote_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quote not found'; END IF;
  IF prev = _new_status THEN RETURN jsonb_build_object('changed', false, 'status', prev); END IF;
  SELECT email INTO mail FROM auth.users WHERE id = uid;
  PERFORM set_config('app.conversion_write', 'on', true);
  UPDATE public.quotes SET conversion_status = _new_status, conversion_changed_at = now(), conversion_changed_by = uid WHERE id = _quote_id;
  PERFORM set_config('app.conversion_write', '', true);
  INSERT INTO public.quote_conversion_history(quote_id, previous_status, new_status, note, changed_by, changed_by_email)
  VALUES (_quote_id, prev, _new_status, nullif(left(trim(coalesce(_note,'')), 1000), ''), uid, mail);
  RETURN jsonb_build_object('changed', true, 'status', _new_status, 'previous', prev);
END $$;
REVOKE ALL ON FUNCTION public.set_quote_conversion(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_quote_conversion(uuid, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.filtered_reporting_quotes(filters jsonb DEFAULT '{}'::jsonb)
 RETURNS SETOF quotes LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$ SELECT q.* FROM public.quotes q WHERE public.is_operator(auth.uid()) AND (coalesce(filters->>'status','all')='all' OR q.status::text=filters->>'status') AND (coalesce(filters->>'priority','all')='all' OR q.priority::text=filters->>'priority') AND (coalesce(filters->>'insurance','all')='all' OR q.insurance_method=filters->>'insurance') AND (coalesce(filters->>'service','all')='all' OR q.requested_service=filters->>'service') AND (coalesce(filters->>'conversion','all')='all' OR q.conversion_status=filters->>'conversion') AND (coalesce(filters->>'search','')='' OR strpos(lower(concat_ws(' ',q.public_reference,q.customer_name,q.customer_phone,q.customer_email,q.vehicle_make,q.vehicle_model)),lower(filters->>'search'))>0) AND (coalesce(jsonb_array_length(filters->'months'),0)=0 OR to_char(q.created_at AT TIME ZONE 'America/Regina','YYYY-MM') IN (SELECT jsonb_array_elements_text(filters->'months'))) AND (nullif(filters->>'startDate','') IS NULL OR q.created_at>= (nullif(filters->>'startDate','')::date::timestamp AT TIME ZONE 'America/Regina')) AND (nullif(filters->>'endDate','') IS NULL OR q.created_at< ((nullif(filters->>'endDate','')::date+1)::timestamp AT TIME ZONE 'America/Regina')) AND (coalesce(jsonb_array_length(filters->'regions'),0)=0 OR public.phone_region_code(q.customer_phone) IN (SELECT jsonb_array_elements_text(filters->'regions'))); $function$;

CREATE OR REPLACE FUNCTION public.quote_reporting(filters jsonb DEFAULT '{}'::jsonb, report_mode text DEFAULT 'list'::text, row_offset integer DEFAULT 0, row_limit integer DEFAULT 25, selected_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'public'
AS $function$ DECLARE result jsonb; BEGIN
IF NOT public.is_operator(auth.uid()) THEN RAISE EXCEPTION 'Dashboard access required'; END IF;
IF report_mode='analytics' THEN
WITH filtered AS MATERIALIZED (SELECT * FROM public.filtered_reporting_quotes(filters)), base AS MATERIALIZED (SELECT * FROM public.filtered_reporting_quotes(filters-'months'-'startDate'-'endDate')),
monthly AS (SELECT to_char(created_at AT TIME ZONE 'America/Regina','YYYY-MM') AS bucket,count(*) AS n,count(*) FILTER (WHERE status<>'spam') AS valid,count(*) FILTER (WHERE status<>'spam' AND conversion_status='converted') AS converted FROM filtered GROUP BY 1), previous_monthly AS (SELECT to_char(created_at AT TIME ZONE 'America/Regina','YYYY-MM') AS bucket,count(*) AS n FROM base GROUP BY 1),
months AS (SELECT bucket FROM monthly UNION SELECT jsonb_array_elements_text(filters->'months') UNION SELECT to_char(d,'YYYY-MM') FROM generate_series(date_trunc('month',nullif(filters->>'startDate','')::date),date_trunc('month',nullif(filters->>'endDate','')::date),interval '1 month') d),
trend AS (SELECT m.bucket AS "month",coalesce(c.n,0) AS count,coalesce(p.n,0) AS previous,CASE WHEN coalesce(p.n,0)=0 THEN NULL ELSE round((coalesce(c.n,0)-p.n)*100.0/p.n,1) END AS change,coalesce(c.valid,0) AS valid,coalesce(c.converted,0) AS converted,CASE WHEN coalesce(c.valid,0)=0 THEN NULL ELSE round(c.converted*100.0/c.valid,1) END AS "conversionRate" FROM months m LEFT JOIN monthly c ON c.bucket=m.bucket LEFT JOIN previous_monthly p ON p.bucket=to_char(to_date(m.bucket||'-01','YYYY-MM-DD')-interval '1 month','YYYY-MM'))
SELECT jsonb_build_object('total',(SELECT count(*) FROM filtered),'uniqueCustomers',(SELECT count(DISTINCT coalesce(nullif(lower(trim(customer_email)),''),nullif(regexp_replace(customer_phone,'[^0-9]','','g'),''),'quote:'||id::text)) FROM filtered),'newCount',(SELECT count(*) FROM filtered WHERE status='new'),'urgent',(SELECT count(*) FROM filtered WHERE priority='urgent'),'lastSevenDays',(SELECT count(*) FROM filtered WHERE created_at>=now()-interval '7 days'),
'conversion',(SELECT jsonb_build_object('valid',count(*) FILTER (WHERE status<>'spam'),'excludedSpam',count(*) FILTER (WHERE status='spam'),'pending',count(*) FILTER (WHERE status<>'spam' AND conversion_status='pending'),'converted',count(*) FILTER (WHERE status<>'spam' AND conversion_status='converted'),'notConverted',count(*) FILTER (WHERE status<>'spam' AND conversion_status='not_converted'),'suggestedConverted',count(*) FILTER (WHERE status='completed' AND conversion_status='pending'),'suggestedNotConverted',count(*) FILTER (WHERE status='lost' AND conversion_status='pending'),'rate',CASE WHEN count(*) FILTER (WHERE status<>'spam')=0 THEN NULL ELSE round(count(*) FILTER (WHERE status<>'spam' AND conversion_status='converted')*100.0/count(*) FILTER (WHERE status<>'spam'),1) END) FROM filtered),
'availableMonths',coalesce((SELECT jsonb_agg(bucket ORDER BY bucket DESC) FROM (SELECT DISTINCT to_char(created_at AT TIME ZONE 'America/Regina','YYYY-MM') AS bucket FROM public.quotes) a),'[]'::jsonb),'services',coalesce((SELECT jsonb_agg(service ORDER BY service) FROM (SELECT DISTINCT requested_service AS service FROM public.quotes WHERE nullif(requested_service,'') IS NOT NULL) s),'[]'::jsonb),'statuses',coalesce((SELECT jsonb_agg(s) FROM (SELECT status::text AS label,count(*) AS count FROM filtered GROUP BY status ORDER BY status) s),'[]'::jsonb),'serviceBreakdown',coalesce((SELECT jsonb_agg(s) FROM (SELECT coalesce(nullif(requested_service,''),'Not specified') AS label,count(*) AS count FROM filtered GROUP BY 1 ORDER BY 2 DESC) s),'[]'::jsonb),'trend',coalesce((SELECT jsonb_agg(t ORDER BY "month") FROM trend t),'[]'::jsonb),'regionBreakdown',coalesce((SELECT jsonb_agg(s ORDER BY s.count DESC) FROM (SELECT public.phone_region_code(customer_phone) AS label,count(*) AS count,count(DISTINCT coalesce(nullif(lower(trim(customer_email)),''),nullif(regexp_replace(customer_phone,'[^0-9]','','g'),''),'quote:'||id::text)) AS customers FROM filtered GROUP BY 1) s),'[]'::jsonb)) INTO result;
ELSE
WITH filtered AS MATERIALIZED (SELECT * FROM public.filtered_reporting_quotes(filters) WHERE selected_ids IS NULL OR id=ANY(selected_ids)),page AS (SELECT id,public_reference,created_at,status,priority,conversion_status,customer_name,customer_phone,customer_email,glass_area,requested_service,insurance_method,vehicle_year,vehicle_make,vehicle_model,service_address,service_location_type,insurance_details,utm_source,utm_medium,utm_campaign,utm_content,utm_term,landing_page,referrer,adas_required_review,public.phone_region_code(customer_phone) AS phone_region FROM filtered ORDER BY CASE WHEN filters->>'sort'='priority' THEN priority END ASC,CASE WHEN filters->>'sort'='oldest' THEN created_at END ASC,CASE WHEN coalesce(filters->>'sort','newest')<>'oldest' THEN created_at END DESC,id LIMIT least(greatest(row_limit,1),500) OFFSET greatest(row_offset,0)) SELECT jsonb_build_object('rows',coalesce((SELECT jsonb_agg(p) FROM page p),'[]'::jsonb),'total',(SELECT count(*) FROM filtered)) INTO result;
END IF; RETURN result; END; $function$;