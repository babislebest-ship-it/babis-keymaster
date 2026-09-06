ALTER TABLE public.scripts
  ADD COLUMN IF NOT EXISTS game_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS place_id text,
  ADD COLUMN IF NOT EXISTS universe_id text;

CREATE INDEX IF NOT EXISTS scripts_place_id_idx ON public.scripts (place_id) WHERE place_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS scripts_universe_id_idx ON public.scripts (universe_id) WHERE universe_id IS NOT NULL;