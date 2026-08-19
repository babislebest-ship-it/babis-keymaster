CREATE TABLE IF NOT EXISTS public.app_settings (
  id text PRIMARY KEY DEFAULT 'global',
  discord_invite_url text NOT NULL DEFAULT 'https://discord.gg/75auNNfmhS',
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can read app settings" ON public.app_settings;
CREATE POLICY "Authenticated can read app settings" ON public.app_settings FOR SELECT TO authenticated USING (true);
INSERT INTO public.app_settings (id, discord_invite_url) VALUES ('global', 'https://discord.gg/75auNNfmhS') ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.player_bans ALTER COLUMN appeal_url SET DEFAULT 'https://discord.gg/75auNNfmhS';
UPDATE public.player_bans SET appeal_url = 'https://discord.gg/75auNNfmhS';