CREATE OR REPLACE FUNCTION public.phone_region_code(phone text) RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public' AS $f$
DECLARE t text; d text; npa text;
BEGIN
  t := btrim(regexp_replace(coalesce(phone,''), '\s*(ext\.?|x|#)\s*\d*$', '', 'i'));
  IF t = '' THEN RETURN 'NONE'; END IF;
  d := regexp_replace(t, '\D', '', 'g');
  IF t ~ '^(\+|011)' THEN
    IF left(t,3) = '011' THEN d := substr(d,4); END IF;
    IF NOT (length(d)=11 AND left(d,1)='1') THEN RETURN CASE WHEN length(d)>=7 THEN 'INTERNATIONAL' ELSE 'INVALID' END; END IF;
  END IF;
  IF length(d)=11 AND left(d,1)='1' THEN d := substr(d,2); END IF;
  IF d !~ '^[2-9][0-9]{2}[2-9][0-9]{6}$' THEN RETURN 'INVALID'; END IF;
  npa := left(d,3);
  RETURN CASE WHEN npa IN ('800','833','844','855','866','877','888') THEN 'TOLL_FREE'
    WHEN npa IN ('600','622','633','644','655','677','688') THEN 'CA_NON_GEO'
    WHEN npa IN ('368','403','587','780','825') THEN 'AB'
    WHEN npa IN ('236','250','257','604','672','778') THEN 'BC'
    WHEN npa IN ('204','431','584') THEN 'MB'
    WHEN npa IN ('428','506') THEN 'NB'
    WHEN npa IN ('709','879') THEN 'NL'
    WHEN npa IN ('226','249','289','343','365','382','416','437','519','548','613','647','683','705','742','753','807','905','942') THEN 'ON'
    WHEN npa IN ('263','354','367','418','438','450','468','514','579','581','819','873') THEN 'QC'
    WHEN npa IN ('306','474','639') THEN 'SK'
    WHEN npa IN ('782','902') THEN 'NS-PE'
    WHEN npa IN ('867') THEN 'TERR'
    ELSE 'OTHER_NANP' END;
END $f$;

GRANT EXECUTE ON FUNCTION public.phone_region_code(text) TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.filtered_reporting_quotes(filters jsonb DEFAULT '{}'::jsonb)
 RETURNS SETOF quotes
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$ SELECT q.* FROM public.quotes q WHERE public.is_operator(auth.uid()) AND (coalesce(filters->>'status','all')='all' OR q.status::text=filters->>'status') AND (coalesce(filters->>'priority','all')='all' OR q.priority::text=filters->>'priority') AND (coalesce(filters->>'insurance','all')='all' OR q.insurance_method=filters->>'insurance') AND (coalesce(filters->>'service','all')='all' OR q.requested_service=filters->>'service') AND (coalesce(filters->>'search','')='' OR strpos(lower(concat_ws(' ',q.public_reference,q.customer_name,q.customer_phone,q.customer_email,q.vehicle_make,q.vehicle_model)),lower(filters->>'search'))>0) AND (coalesce(jsonb_array_length(filters->'months'),0)=0 OR to_char(q.created_at AT TIME ZONE 'America/Regina','YYYY-MM') IN (SELECT jsonb_array_elements_text(filters->'months'))) AND (nullif(filters->>'startDate','') IS NULL OR q.created_at>= (nullif(filters->>'startDate','')::date::timestamp AT TIME ZONE 'America/Regina')) AND (nullif(filters->>'endDate','') IS NULL OR q.created_at< ((nullif(filters->>'endDate','')::date+1)::timestamp AT TIME ZONE 'America/Regina')) AND (coalesce(jsonb_array_length(filters->'regions'),0)=0 OR public.phone_region_code(q.customer_phone) IN (SELECT jsonb_array_elements_text(filters->'regions'))); $function$;
CREATE OR REPLACE FUNCTION public.quote_reporting(filters jsonb DEFAULT '{}'::jsonb, report_mode text DEFAULT 'list'::text, row_offset integer DEFAULT 0, row_limit integer DEFAULT 25, selected_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$ DECLARE result jsonb; BEGIN
IF NOT public.is_operator(auth.uid()) THEN RAISE EXCEPTION 'Dashboard access required'; END IF;
IF report_mode='analytics' THEN
WITH filtered AS MATERIALIZED (SELECT * FROM public.filtered_reporting_quotes(filters)), base AS MATERIALIZED (SELECT * FROM public.filtered_reporting_quotes(filters-'months'-'startDate'-'endDate')),
monthly AS (SELECT to_char(created_at AT TIME ZONE 'America/Regina','YYYY-MM') AS bucket,count(*) AS n FROM filtered GROUP BY 1), previous_monthly AS (SELECT to_char(created_at AT TIME ZONE 'America/Regina','YYYY-MM') AS bucket,count(*) AS n FROM base GROUP BY 1),
months AS (SELECT bucket FROM monthly UNION SELECT jsonb_array_elements_text(filters->'months') UNION SELECT to_char(d,'YYYY-MM') FROM generate_series(date_trunc('month',nullif(filters->>'startDate','')::date),date_trunc('month',nullif(filters->>'endDate','')::date),interval '1 month') d),
trend AS (SELECT m.bucket AS "month",coalesce(c.n,0) AS count,coalesce(p.n,0) AS previous,CASE WHEN coalesce(p.n,0)=0 THEN NULL ELSE round((coalesce(c.n,0)-p.n)*100.0/p.n,1) END AS change FROM months m LEFT JOIN monthly c ON c.bucket=m.bucket LEFT JOIN previous_monthly p ON p.bucket=to_char(to_date(m.bucket||'-01','YYYY-MM-DD')-interval '1 month','YYYY-MM'))
SELECT jsonb_build_object('total',(SELECT count(*) FROM filtered),'uniqueCustomers',(SELECT count(DISTINCT coalesce(nullif(lower(trim(customer_email)),''),nullif(regexp_replace(customer_phone,'[^0-9]','','g'),''),'quote:'||id::text)) FROM filtered),'newCount',(SELECT count(*) FROM filtered WHERE status='new'),'urgent',(SELECT count(*) FROM filtered WHERE priority='urgent'),'lastSevenDays',(SELECT count(*) FROM filtered WHERE created_at>=now()-interval '7 days'),'availableMonths',coalesce((SELECT jsonb_agg(bucket ORDER BY bucket DESC) FROM (SELECT DISTINCT to_char(created_at AT TIME ZONE 'America/Regina','YYYY-MM') AS bucket FROM public.quotes) a),'[]'::jsonb),'services',coalesce((SELECT jsonb_agg(service ORDER BY service) FROM (SELECT DISTINCT requested_service AS service FROM public.quotes WHERE nullif(requested_service,'') IS NOT NULL) s),'[]'::jsonb),'statuses',coalesce((SELECT jsonb_agg(s) FROM (SELECT status::text AS label,count(*) AS count FROM filtered GROUP BY status ORDER BY status) s),'[]'::jsonb),'serviceBreakdown',coalesce((SELECT jsonb_agg(s) FROM (SELECT coalesce(nullif(requested_service,''),'Not specified') AS label,count(*) AS count FROM filtered GROUP BY 1 ORDER BY 2 DESC) s),'[]'::jsonb),'trend',coalesce((SELECT jsonb_agg(t ORDER BY "month") FROM trend t),'[]'::jsonb),'regionBreakdown',coalesce((SELECT jsonb_agg(s ORDER BY s.count DESC) FROM (SELECT public.phone_region_code(customer_phone) AS label,count(*) AS count,count(DISTINCT coalesce(nullif(lower(trim(customer_email)),''),nullif(regexp_replace(customer_phone,'[^0-9]','','g'),''),'quote:'||id::text)) AS customers FROM filtered GROUP BY 1) s),'[]'::jsonb)) INTO result;
ELSE
WITH filtered AS MATERIALIZED (SELECT * FROM public.filtered_reporting_quotes(filters) WHERE selected_ids IS NULL OR id=ANY(selected_ids)),page AS (SELECT id,public_reference,created_at,status,priority,customer_name,customer_phone,customer_email,glass_area,requested_service,insurance_method,vehicle_year,vehicle_make,vehicle_model,service_address,service_location_type,insurance_details,utm_source,utm_medium,utm_campaign,utm_content,utm_term,landing_page,referrer,adas_required_review,public.phone_region_code(customer_phone) AS phone_region FROM filtered ORDER BY CASE WHEN filters->>'sort'='priority' THEN priority END ASC,CASE WHEN filters->>'sort'='oldest' THEN created_at END ASC,CASE WHEN coalesce(filters->>'sort','newest')<>'oldest' THEN created_at END DESC,id LIMIT least(greatest(row_limit,1),500) OFFSET greatest(row_offset,0)) SELECT jsonb_build_object('rows',coalesce((SELECT jsonb_agg(p) FROM page p),'[]'::jsonb),'total',(SELECT count(*) FROM filtered)) INTO result;
END IF; RETURN result; END; $function$;