ALTER TABLE public.scripts ADD COLUMN is_for_sale boolean NOT NULL DEFAULT false;
ALTER TABLE public.scripts ADD COLUMN trial_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.scripts ADD COLUMN trial_minutes integer NOT NULL DEFAULT 10080;
UPDATE public.scripts SET is_for_sale = true WHERE require_license = true;

CREATE TABLE public.script_trials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id uuid NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  player_key text NOT NULL,
  player_name text,
  started_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (script_id, player_key)
);
GRANT ALL ON public.script_trials TO service_role;
ALTER TABLE public.script_trials ENABLE ROW LEVEL SECURITY;