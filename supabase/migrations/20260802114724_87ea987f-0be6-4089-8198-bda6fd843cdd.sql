-- ENUMS ---------------------------------------------------------------
CREATE TYPE public.quote_status AS ENUM (
  'new','contacted','awaiting-information','estimating','quote-sent',
  'appointment-requested','booked','completed','lost','spam'
);
CREATE TYPE public.quote_priority AS ENUM ('urgent','high','normal','low');
CREATE TYPE public.app_role AS ENUM ('admin','staff');

-- ROLES ---------------------------------------------------------------
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','staff'));
$$;

CREATE POLICY "Staff can read roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- QUOTES ---------------------------------------------------------------
CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_reference text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  status public.quote_status NOT NULL DEFAULT 'new',
  priority public.quote_priority NOT NULL DEFAULT 'normal',
  glass_area text,
  requested_service text,
  damage_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  damage_cause text,
  insurance_method text,
  insurance_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  vehicle_year text,
  vehicle_make text,
  vehicle_model text,
  vehicle_trim text,
  vehicle_body_style text,
  vin text,
  licence_plate text,
  vehicle_features jsonb NOT NULL DEFAULT '{}'::jsonb,
  adas_required_review boolean NOT NULL DEFAULT false,
  service_location_type text,
  service_address jsonb NOT NULL DEFAULT '{}'::jsonb,
  preferred_urgency text,
  preferred_date date,
  preferred_time text,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  preferred_contact_method text,
  best_contact_time text,
  customer_notes text,
  contact_consent boolean NOT NULL DEFAULT false,
  marketing_consent boolean NOT NULL DEFAULT false,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  landing_page text,
  referrer text,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  internal_notes text,
  submitted_ip_hash text,
  submission_user_agent text
);
CREATE INDEX quotes_created_at_idx ON public.quotes (created_at DESC);
CREATE INDEX quotes_status_idx ON public.quotes (status);
CREATE INDEX quotes_priority_idx ON public.quotes (priority);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotes TO authenticated;
GRANT ALL ON public.quotes TO service_role;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read quotes" ON public.quotes
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update quotes" ON public.quotes
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Admins can delete quotes" ON public.quotes
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- FILES ----------------------------------------------------------------
CREATE TABLE public.quote_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  original_filename text NOT NULL,
  mime_type text NOT NULL,
  file_size integer NOT NULL,
  file_category text NOT NULL DEFAULT 'damage-photo',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX quote_files_quote_id_idx ON public.quote_files (quote_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_files TO authenticated;
GRANT ALL ON public.quote_files TO service_role;
ALTER TABLE public.quote_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read quote files" ON public.quote_files
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins can delete quote files" ON public.quote_files
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- STATUS HISTORY -------------------------------------------------------
CREATE TABLE public.quote_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  previous_status public.quote_status,
  new_status public.quote_status NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX quote_status_history_quote_id_idx ON public.quote_status_history (quote_id, created_at DESC);
GRANT SELECT, INSERT ON public.quote_status_history TO authenticated;
GRANT ALL ON public.quote_status_history TO service_role;
ALTER TABLE public.quote_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read history" ON public.quote_status_history
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert history" ON public.quote_status_history
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));

-- RATE LIMITING --------------------------------------------------------
CREATE TABLE public.quote_submission_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX quote_submission_log_idx ON public.quote_submission_log (ip_hash, created_at DESC);
GRANT ALL ON public.quote_submission_log TO service_role;
ALTER TABLE public.quote_submission_log ENABLE ROW LEVEL SECURITY;

-- TRIGGERS -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER quotes_set_updated_at BEFORE UPDATE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.log_quote_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.quote_status_history (quote_id, previous_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER quotes_log_status AFTER UPDATE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.log_quote_status_change();