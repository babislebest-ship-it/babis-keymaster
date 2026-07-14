ALTER TABLE public.player_history
  ADD COLUMN IF NOT EXISTS place_id TEXT,
  ADD COLUMN IF NOT EXISTS job_id TEXT,
  ADD COLUMN IF NOT EXISTS universe_id TEXT,
  ADD COLUMN IF NOT EXISTS root_place_id TEXT,
  ADD COLUMN IF NOT EXISTS presence_type SMALLINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS presence_last_location TEXT,
  ADD COLUMN IF NOT EXISTS presence_checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pending_message TEXT,
  ADD COLUMN IF NOT EXISTS pending_kick_reason TEXT;

CREATE INDEX IF NOT EXISTS player_history_user_id_idx ON public.player_history (player_user_id);
