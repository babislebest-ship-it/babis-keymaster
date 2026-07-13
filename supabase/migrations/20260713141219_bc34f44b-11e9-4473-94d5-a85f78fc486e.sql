
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS premium_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS loader_name text;

CREATE TABLE IF NOT EXISTS public.premium_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key text NOT NULL UNIQUE,
  label text NOT NULL DEFAULT '',
  duration_minutes integer NOT NULL,
  status text NOT NULL DEFAULT 'active',
  redeemed_by uuid,
  redeemed_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT premium_licenses_duration_positive CHECK (duration_minutes > 0),
  CONSTRAINT premium_licenses_status_check CHECK (status IN ('active','redeemed','revoked'))
);

GRANT ALL ON public.premium_licenses TO service_role;

ALTER TABLE public.premium_licenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service manages premium licenses" ON public.premium_licenses;
CREATE POLICY "service manages premium licenses" ON public.premium_licenses
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS update_premium_licenses_updated_at ON public.premium_licenses;
CREATE TRIGGER update_premium_licenses_updated_at
  BEFORE UPDATE ON public.premium_licenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
