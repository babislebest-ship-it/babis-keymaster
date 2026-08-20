ALTER TABLE public.script_licenses
  ADD COLUMN IF NOT EXISTS max_users integer,
  ADD COLUMN IF NOT EXISTS seat_count integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.license_seats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES public.script_licenses(id) ON DELETE CASCADE,
  player_key text NOT NULL,
  player_user_id text,
  player_name text,
  first_used_at timestamp with time zone NOT NULL DEFAULT now(),
  last_used_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (license_id, player_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.license_seats TO authenticated;
GRANT ALL ON public.license_seats TO service_role;

ALTER TABLE public.license_seats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "License managers can manage seats"
ON public.license_seats FOR ALL TO authenticated
USING (private.has_permission(auth.uid(), 'licenses.manage'))
WITH CHECK (private.has_permission(auth.uid(), 'licenses.manage'));