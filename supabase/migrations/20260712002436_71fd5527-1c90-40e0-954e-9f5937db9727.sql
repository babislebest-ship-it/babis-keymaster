
CREATE TABLE IF NOT EXISTS public.player_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_key text NOT NULL UNIQUE,
  player_user_id text,
  player_name text,
  executor_name text,
  ip_hash text,
  last_script_id uuid REFERENCES public.scripts(id) ON DELETE SET NULL,
  place_id text,
  job_id text,
  connection_count integer NOT NULL DEFAULT 1,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_history TO authenticated;
GRANT ALL ON public.player_history TO service_role;

ALTER TABLE public.player_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Log viewers read player history" ON public.player_history;
CREATE POLICY "Log viewers read player history" ON public.player_history
  FOR SELECT TO authenticated
  USING (private.has_permission(auth.uid(), 'logs.view') OR private.has_permission(auth.uid(), 'bans.manage'));

DROP TRIGGER IF EXISTS update_player_history_updated_at ON public.player_history;
CREATE TRIGGER update_player_history_updated_at
  BEFORE UPDATE ON public.player_history
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.script_usage_sessions ADD COLUMN IF NOT EXISTS pending_message text;
