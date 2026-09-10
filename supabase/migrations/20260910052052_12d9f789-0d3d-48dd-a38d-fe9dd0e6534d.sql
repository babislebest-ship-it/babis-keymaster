ALTER TABLE public.pricing_plans ADD COLUMN IF NOT EXISTS license_duration_minutes integer;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_keys jsonb NOT NULL DEFAULT '[]'::jsonb;