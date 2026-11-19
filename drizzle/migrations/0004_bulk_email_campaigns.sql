CREATE TABLE public.email_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  sender_name text NOT NULL DEFAULT 'Riverbend Autoglass Inc.',
  sender_email text,
  reply_to text,
  mailing_address text,
  google_review_url text,
  facebook_review_url text,
  test_recipients text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
INSERT INTO public.email_settings (id) VALUES (true);
GRANT SELECT, INSERT, UPDATE ON public.email_settings TO authenticated;
GRANT ALL ON public.email_settings TO service_role;
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Operators read email settings" ON public.email_settings FOR SELECT TO authenticated USING (public.is_operator(auth.uid()));
CREATE POLICY "Operators update email settings" ON public.email_settings FOR UPDATE TO authenticated USING (public.is_operator(auth.uid())) WITH CHECK (public.is_operator(auth.uid()));

CREATE TABLE public.email_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sender_name text, job_title text, company_name text DEFAULT 'Riverbend Autoglass Inc.',
  phone text, email text, website text, address text,
  facebook_url text, instagram_url text, custom_html text,
  show_logo boolean NOT NULL DEFAULT true,
  brand_color text NOT NULL DEFAULT '#0b2545',
  is_default boolean NOT NULL DEFAULT false,
  created_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX email_signatures_one_default ON public.email_signatures (is_default) WHERE is_default;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_signatures TO authenticated;
GRANT ALL ON public.email_signatures TO service_role;
ALTER TABLE public.email_signatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Operators manage signatures" ON public.email_signatures FOR ALL TO authenticated USING (public.is_operator(auth.uid())) WITH CHECK (public.is_operator(auth.uid()));

CREATE TABLE public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('google_review','facebook_review','seasonal','offer','follow_up','announcement')),
  subject text NOT NULL DEFAULT '', preview_text text NOT NULL DEFAULT '', body_html text NOT NULL DEFAULT '',
  created_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO authenticated;
GRANT ALL ON public.email_templates TO service_role;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Operators manage templates" ON public.email_templates FOR ALL TO authenticated USING (public.is_operator(auth.uid())) WITH CHECK (public.is_operator(auth.uid()));

CREATE TABLE public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  message_type text NOT NULL DEFAULT 'promotional' CHECK (message_type IN ('promotional','review_request','follow_up')),
  subject text NOT NULL DEFAULT '', preview_text text NOT NULL DEFAULT '', body_html text NOT NULL DEFAULT '',
  signature_id uuid REFERENCES public.email_signatures(id) ON DELETE SET NULL,
  audience jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','queued','sending','sent','partially_failed','failed','cancelled')),
  recipient_count integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  delivered_count integer,
  unsubscribed_count integer NOT NULL DEFAULT 0,
  last_test_at timestamptz, last_test_to text,
  created_by uuid, created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  confirmed_by uuid, confirmed_at timestamptz, sent_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_campaigns TO authenticated;
GRANT ALL ON public.email_campaigns TO service_role;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Operators manage campaigns" ON public.email_campaigns FOR ALL TO authenticated USING (public.is_operator(auth.uid())) WITH CHECK (public.is_operator(auth.uid()));

CREATE TABLE public.email_campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  email text NOT NULL,
  customer_name text, service_type text, lawful_basis text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sending','sent','delivered','failed','bounced','skipped_suppressed')),
  attempts integer NOT NULL DEFAULT 0,
  provider_message_id text, last_error text,
  unsubscribe_token text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now(), sent_at timestamptz,
  UNIQUE (campaign_id, email)
);
CREATE UNIQUE INDEX email_campaign_recipients_token ON public.email_campaign_recipients (unsubscribe_token);
GRANT SELECT ON public.email_campaign_recipients TO authenticated;
GRANT ALL ON public.email_campaign_recipients TO service_role;
ALTER TABLE public.email_campaign_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Operators read recipients" ON public.email_campaign_recipients FOR SELECT TO authenticated USING (public.is_operator(auth.uid()));

CREATE TABLE public.email_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  consent_type text NOT NULL CHECK (consent_type IN ('express','implied_purchase','implied_inquiry')),
  source text NOT NULL,
  consented_at timestamptz NOT NULL,
  expires_at timestamptz,
  evidence text,
  recorded_by uuid, recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX email_consents_email ON public.email_consents (lower(email));
GRANT SELECT, INSERT, DELETE ON public.email_consents TO authenticated;
GRANT ALL ON public.email_consents TO service_role;
ALTER TABLE public.email_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Operators read consents" ON public.email_consents FOR SELECT TO authenticated USING (public.is_operator(auth.uid()));
CREATE POLICY "Operators record consents" ON public.email_consents FOR INSERT TO authenticated WITH CHECK (public.is_operator(auth.uid()));
CREATE POLICY "Operators remove consents" ON public.email_consents FOR DELETE TO authenticated USING (public.is_operator(auth.uid()));

CREATE TABLE public.email_suppressions (
  email text PRIMARY KEY,
  reason text NOT NULL CHECK (reason IN ('unsubscribed','bounced','complaint','manual')),
  source text, campaign_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.email_suppressions TO authenticated;
GRANT ALL ON public.email_suppressions TO service_role;
ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Operators read suppressions" ON public.email_suppressions FOR SELECT TO authenticated USING (public.is_operator(auth.uid()));
CREATE POLICY "Operators add suppressions" ON public.email_suppressions FOR INSERT TO authenticated WITH CHECK (public.is_operator(auth.uid()));
CREATE POLICY "Admins remove suppressions" ON public.email_suppressions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER email_signatures_updated BEFORE UPDATE ON public.email_signatures FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER email_templates_updated BEFORE UPDATE ON public.email_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER email_campaigns_updated BEFORE UPDATE ON public.email_campaigns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();