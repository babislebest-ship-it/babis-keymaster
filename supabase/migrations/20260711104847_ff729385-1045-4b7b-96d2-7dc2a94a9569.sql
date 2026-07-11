CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('owner', 'staff', 'member');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'license_status') THEN
    CREATE TYPE public.license_status AS ENUM ('active', 'revoked', 'banned', 'expired');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ban_scope') THEN
    CREATE TYPE public.ban_scope AS ENUM ('script', 'global');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_status') THEN
    CREATE TYPE public.session_status AS ENUM ('active', 'ended', 'kicked', 'banned', 'error');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  username text NOT NULL,
  display_name text,
  account_status text NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_username_length CHECK (char_length(username) BETWEEN 3 AND 32),
  CONSTRAINT profiles_username_format CHECK (username ~ '^[A-Za-z0-9_]+$')
);
CREATE UNIQUE INDEX profiles_username_unique_lower ON public.profiles (lower(username));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.staff_permissions (
  user_id uuid PRIMARY KEY,
  can_manage_scripts boolean NOT NULL DEFAULT false,
  can_manage_licenses boolean NOT NULL DEFAULT false,
  can_manage_bans boolean NOT NULL DEFAULT false,
  can_manage_users boolean NOT NULL DEFAULT false,
  can_view_logs boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_permissions TO authenticated;
GRANT ALL ON public.staff_permissions TO service_role;
ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  source_code text NOT NULL DEFAULT '',
  require_license boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scripts_name_length CHECK (char_length(name) BETWEEN 1 AND 80),
  CONSTRAINT scripts_source_length CHECK (char_length(source_code) <= 500000)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scripts TO authenticated;
GRANT ALL ON public.scripts TO service_role;
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.script_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id uuid NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  license_key text NOT NULL UNIQUE,
  label text NOT NULL DEFAULT '',
  status public.license_status NOT NULL DEFAULT 'active',
  duration_minutes integer,
  expires_at timestamptz,
  first_used_at timestamptz,
  last_used_at timestamptz,
  usage_count integer NOT NULL DEFAULT 0,
  bound_player_user_id text,
  bound_player_name text,
  created_by uuid NOT NULL,
  revoked_by uuid,
  revoked_at timestamptz,
  revoke_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT license_key_length CHECK (char_length(license_key) BETWEEN 12 AND 120),
  CONSTRAINT license_duration_positive CHECK (duration_minutes IS NULL OR duration_minutes > 0)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.script_licenses TO authenticated;
GRANT ALL ON public.script_licenses TO service_role;
ALTER TABLE public.script_licenses ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.player_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope public.ban_scope NOT NULL DEFAULT 'script',
  script_id uuid REFERENCES public.scripts(id) ON DELETE CASCADE,
  player_user_id text,
  player_name text,
  license_id uuid REFERENCES public.script_licenses(id) ON DELETE SET NULL,
  ip_hash text,
  reason text NOT NULL DEFAULT 'No reason provided',
  appeal_url text NOT NULL DEFAULT 'https://discord.gg/tRA3yStbvq',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ban_scope_script_required CHECK ((scope = 'global' AND script_id IS NULL) OR (scope = 'script' AND script_id IS NOT NULL)),
  CONSTRAINT ban_target_required CHECK (player_user_id IS NOT NULL OR player_name IS NOT NULL OR license_id IS NOT NULL OR ip_hash IS NOT NULL)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_bans TO authenticated;
GRANT ALL ON public.player_bans TO service_role;
ALTER TABLE public.player_bans ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.script_usage_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id uuid NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  license_id uuid REFERENCES public.script_licenses(id) ON DELETE SET NULL,
  session_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18), 'hex'),
  player_user_id text,
  player_name text,
  place_id text,
  job_id text,
  executor_name text,
  ip_hash text,
  status public.session_status NOT NULL DEFAULT 'active',
  kick_reason text,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  total_seconds integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.script_usage_sessions TO authenticated;
GRANT ALL ON public.script_usage_sessions TO service_role;
ALTER TABLE public.script_usage_sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.script_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id uuid REFERENCES public.scripts(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.script_usage_sessions(id) ON DELETE SET NULL,
  license_id uuid REFERENCES public.script_licenses(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  player_user_id text,
  player_name text,
  message text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT usage_event_type_length CHECK (char_length(event_type) BETWEEN 1 AND 60)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.script_usage_events TO authenticated;
GRANT ALL ON public.script_usage_events TO service_role;
ALTER TABLE public.script_usage_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'owner')
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.staff_permissions sp ON sp.user_id = ur.user_id
      WHERE ur.user_id = _user_id
        AND ur.role = 'staff'
        AND (
          (_permission = 'scripts.manage' AND sp.can_manage_scripts)
          OR (_permission = 'licenses.manage' AND sp.can_manage_licenses)
          OR (_permission = 'bans.manage' AND sp.can_manage_bans)
          OR (_permission = 'users.manage' AND sp.can_manage_users)
          OR (_permission = 'logs.view' AND sp.can_view_logs)
        )
    );
$$;

CREATE POLICY "Users can create their own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can read their own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id OR public.has_permission(auth.uid(), 'users.manage'));

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id OR public.has_permission(auth.uid(), 'users.manage'))
WITH CHECK (auth.uid() = id OR public.has_permission(auth.uid(), 'users.manage'));

CREATE POLICY "Managers can delete profiles"
ON public.profiles FOR DELETE TO authenticated
USING (public.has_permission(auth.uid(), 'users.manage'));

CREATE POLICY "Users can read own roles and managers can read all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_permission(auth.uid(), 'users.manage'));

CREATE POLICY "Managers can manage roles"
ON public.user_roles FOR ALL TO authenticated
USING (public.has_permission(auth.uid(), 'users.manage'))
WITH CHECK (public.has_permission(auth.uid(), 'users.manage'));

CREATE POLICY "Users can read own permissions and managers can read all permissions"
ON public.staff_permissions FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_permission(auth.uid(), 'users.manage'));

CREATE POLICY "Managers can manage staff permissions"
ON public.staff_permissions FOR ALL TO authenticated
USING (public.has_permission(auth.uid(), 'users.manage'))
WITH CHECK (public.has_permission(auth.uid(), 'users.manage'));

CREATE POLICY "Script managers can manage scripts"
ON public.scripts FOR ALL TO authenticated
USING (public.has_permission(auth.uid(), 'scripts.manage'))
WITH CHECK (public.has_permission(auth.uid(), 'scripts.manage'));

CREATE POLICY "License managers can manage licenses"
ON public.script_licenses FOR ALL TO authenticated
USING (public.has_permission(auth.uid(), 'licenses.manage'))
WITH CHECK (public.has_permission(auth.uid(), 'licenses.manage'));

CREATE POLICY "Ban managers can manage bans"
ON public.player_bans FOR ALL TO authenticated
USING (public.has_permission(auth.uid(), 'bans.manage'))
WITH CHECK (public.has_permission(auth.uid(), 'bans.manage'));

CREATE POLICY "Log viewers can read sessions"
ON public.script_usage_sessions FOR SELECT TO authenticated
USING (public.has_permission(auth.uid(), 'logs.view') OR public.has_permission(auth.uid(), 'bans.manage'));

CREATE POLICY "Ban managers can update sessions"
ON public.script_usage_sessions FOR UPDATE TO authenticated
USING (public.has_permission(auth.uid(), 'bans.manage'))
WITH CHECK (public.has_permission(auth.uid(), 'bans.manage'));

CREATE POLICY "Log viewers can read events"
ON public.script_usage_events FOR SELECT TO authenticated
USING (public.has_permission(auth.uid(), 'logs.view') OR public.has_permission(auth.uid(), 'bans.manage'));

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_staff_permissions_updated_at BEFORE UPDATE ON public.staff_permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_scripts_updated_at BEFORE UPDATE ON public.scripts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_script_licenses_updated_at BEFORE UPDATE ON public.script_licenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_player_bans_updated_at BEFORE UPDATE ON public.player_bans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_script_usage_sessions_updated_at BEFORE UPDATE ON public.script_usage_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX scripts_public_id_idx ON public.scripts(public_id);
CREATE INDEX licenses_script_id_idx ON public.script_licenses(script_id);
CREATE INDEX licenses_status_idx ON public.script_licenses(status);
CREATE INDEX bans_active_lookup_idx ON public.player_bans(is_active, scope, script_id, player_user_id, player_name, ip_hash);
CREATE INDEX sessions_script_status_idx ON public.script_usage_sessions(script_id, status, last_seen_at DESC);
CREATE INDEX events_script_created_idx ON public.script_usage_events(script_id, created_at DESC);