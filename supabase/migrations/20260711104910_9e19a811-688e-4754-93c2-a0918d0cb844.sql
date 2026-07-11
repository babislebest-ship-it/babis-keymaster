CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
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

CREATE OR REPLACE FUNCTION private.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT private.has_role(_user_id, 'owner')
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

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_permission(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.has_permission(uuid, text) FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Managers can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own roles and managers can read all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Managers can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own permissions and managers can read all permissions" ON public.staff_permissions;
DROP POLICY IF EXISTS "Managers can manage staff permissions" ON public.staff_permissions;
DROP POLICY IF EXISTS "Script managers can manage scripts" ON public.scripts;
DROP POLICY IF EXISTS "License managers can manage licenses" ON public.script_licenses;
DROP POLICY IF EXISTS "Ban managers can manage bans" ON public.player_bans;
DROP POLICY IF EXISTS "Log viewers can read sessions" ON public.script_usage_sessions;
DROP POLICY IF EXISTS "Ban managers can update sessions" ON public.script_usage_sessions;
DROP POLICY IF EXISTS "Log viewers can read events" ON public.script_usage_events;

CREATE POLICY "Users can read their own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id OR private.has_permission(auth.uid(), 'users.manage'));

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id OR private.has_permission(auth.uid(), 'users.manage'))
WITH CHECK (auth.uid() = id OR private.has_permission(auth.uid(), 'users.manage'));

CREATE POLICY "Managers can delete profiles"
ON public.profiles FOR DELETE TO authenticated
USING (private.has_permission(auth.uid(), 'users.manage'));

CREATE POLICY "Users can read own roles and managers can read all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR private.has_permission(auth.uid(), 'users.manage'));

CREATE POLICY "Managers can manage roles"
ON public.user_roles FOR ALL TO authenticated
USING (private.has_permission(auth.uid(), 'users.manage'))
WITH CHECK (private.has_permission(auth.uid(), 'users.manage'));

CREATE POLICY "Users can read own permissions and managers can read all permissions"
ON public.staff_permissions FOR SELECT TO authenticated
USING (user_id = auth.uid() OR private.has_permission(auth.uid(), 'users.manage'));

CREATE POLICY "Managers can manage staff permissions"
ON public.staff_permissions FOR ALL TO authenticated
USING (private.has_permission(auth.uid(), 'users.manage'))
WITH CHECK (private.has_permission(auth.uid(), 'users.manage'));

CREATE POLICY "Script managers can manage scripts"
ON public.scripts FOR ALL TO authenticated
USING (private.has_permission(auth.uid(), 'scripts.manage'))
WITH CHECK (private.has_permission(auth.uid(), 'scripts.manage'));

CREATE POLICY "License managers can manage licenses"
ON public.script_licenses FOR ALL TO authenticated
USING (private.has_permission(auth.uid(), 'licenses.manage'))
WITH CHECK (private.has_permission(auth.uid(), 'licenses.manage'));

CREATE POLICY "Ban managers can manage bans"
ON public.player_bans FOR ALL TO authenticated
USING (private.has_permission(auth.uid(), 'bans.manage'))
WITH CHECK (private.has_permission(auth.uid(), 'bans.manage'));

CREATE POLICY "Log viewers can read sessions"
ON public.script_usage_sessions FOR SELECT TO authenticated
USING (private.has_permission(auth.uid(), 'logs.view') OR private.has_permission(auth.uid(), 'bans.manage'));

CREATE POLICY "Ban managers can update sessions"
ON public.script_usage_sessions FOR UPDATE TO authenticated
USING (private.has_permission(auth.uid(), 'bans.manage'))
WITH CHECK (private.has_permission(auth.uid(), 'bans.manage'));

CREATE POLICY "Log viewers can read events"
ON public.script_usage_events FOR SELECT TO authenticated
USING (private.has_permission(auth.uid(), 'logs.view') OR private.has_permission(auth.uid(), 'bans.manage'));

DROP FUNCTION public.has_role(uuid, public.app_role);
DROP FUNCTION public.has_permission(uuid, text);