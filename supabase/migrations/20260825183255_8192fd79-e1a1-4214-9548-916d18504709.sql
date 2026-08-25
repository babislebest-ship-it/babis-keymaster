
-- Explicitly remove any direct database access for anonymous/public clients.
REVOKE ALL ON public.scripts FROM anon;
REVOKE ALL ON public.player_bans FROM anon;
REVOKE ALL ON public.license_seats FROM anon;
REVOKE ALL ON public.script_licenses FROM anon;
REVOKE ALL ON public.script_usage_events FROM anon;
REVOKE ALL ON public.script_usage_sessions FROM anon;
REVOKE ALL ON public.player_history FROM anon;
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.staff_permissions FROM anon;
REVOKE ALL ON public.user_roles FROM anon;
REVOKE ALL ON public.app_settings FROM anon;
REVOKE ALL ON public.premium_licenses FROM anon;

-- Backend (server-side) ingestion keeps full access.
GRANT ALL ON public.scripts TO service_role;
GRANT ALL ON public.player_bans TO service_role;
GRANT ALL ON public.license_seats TO service_role;
GRANT ALL ON public.script_licenses TO service_role;
GRANT ALL ON public.script_usage_events TO service_role;
GRANT ALL ON public.script_usage_sessions TO service_role;
GRANT ALL ON public.player_history TO service_role;
GRANT ALL ON public.app_settings TO service_role;

-- Tighten license seat policy: require an authenticated staff user.
DROP POLICY IF EXISTS "License managers can manage seats" ON public.license_seats;
CREATE POLICY "License managers can manage seats"
ON public.license_seats
FOR ALL
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND private.has_permission(auth.uid(), 'licenses.manage')
  AND EXISTS (SELECT 1 FROM public.script_licenses sl WHERE sl.id = license_seats.license_id)
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND private.has_permission(auth.uid(), 'licenses.manage')
  AND EXISTS (SELECT 1 FROM public.script_licenses sl WHERE sl.id = license_seats.license_id)
);

-- Make the service-role-only write model explicit and deny client writes.
DROP POLICY IF EXISTS "No client inserts on usage events" ON public.script_usage_events;
CREATE POLICY "No client inserts on usage events"
ON public.script_usage_events
FOR INSERT
TO authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS "No client inserts on sessions" ON public.script_usage_sessions;
CREATE POLICY "No client inserts on sessions"
ON public.script_usage_sessions
FOR INSERT
TO authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS "No client deletes on sessions" ON public.script_usage_sessions;
CREATE POLICY "No client deletes on sessions"
ON public.script_usage_sessions
FOR DELETE
TO authenticated
USING (false);
