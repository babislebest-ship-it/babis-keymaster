import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const initializeAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        username: z.string().trim().min(3).max(32).regex(/^[A-Za-z0-9_]+$/),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const userId = context.userId;
    const displayName = data.username;

    const { error: profileError } = await db.from("profiles").upsert({
      id: userId,
      username: data.username,
      display_name: displayName,
      account_status: "active",
    });
    if (profileError) throw new Error(profileError.message);

    const { count: ownerCount, error: countError } = await db
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "owner");
    if (countError) throw new Error(countError.message);

    const ownerClaim = (ownerCount ?? 0) === 0 && data.username.toLowerCase() === "babis";
    const role = ownerClaim ? "owner" : "member";

    const { error: roleError } = await db.from("user_roles").upsert(
      { user_id: userId, role },
      { onConflict: "user_id,role" },
    );
    if (roleError) throw new Error(roleError.message);

    if (ownerClaim) {
      const { error: permissionError } = await db.from("staff_permissions").upsert({
        user_id: userId,
        can_manage_scripts: true,
        can_manage_licenses: true,
        can_manage_bans: true,
        can_manage_users: true,
        can_view_logs: true,
      });
      if (permissionError) throw new Error(permissionError.message);
    }

    return { ok: true, role };
  });

export const getAccountState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const userId = context.userId;

    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (profileError) throw new Error(profileError.message);

    const { data: roles, error: rolesError } = await db
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (rolesError) throw new Error(rolesError.message);

    const { data: permissions, error: permissionError } = await db
      .from("staff_permissions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (permissionError) throw new Error(permissionError.message);

    const roleList = (roles ?? []).map((row: { role: string }) => row.role);
    return {
      profile,
      roles: roleList,
      permissions,
      isOwner: roleList.includes("owner"),
      isStaff: roleList.includes("staff"),
    };
  });

export const getDashboardData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const userId = context.userId;

    const { data: roles, error: rolesError } = await db
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (rolesError) throw new Error(rolesError.message);
    const roleList = (roles ?? []).map((row: { role: string }) => row.role);

    const { data: permissions, error: permissionError } = await db
      .from("staff_permissions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (permissionError) throw new Error(permissionError.message);

    const canAccess =
      roleList.includes("owner") ||
      roleList.includes("staff") ||
      Boolean(
        permissions?.can_manage_scripts ||
          permissions?.can_manage_licenses ||
          permissions?.can_manage_bans ||
          permissions?.can_manage_users ||
          permissions?.can_view_logs,
      );
    if (!canAccess) throw new Error("Your account does not have dashboard access yet.");

    const [profileResult, scriptsResult, licensesResult, bansResult, sessionsResult, eventsResult, usersResult, rolesResult, staffResult] =
      await Promise.all([
        db.from("profiles").select("*").eq("id", userId).maybeSingle(),
        db.from("scripts").select("*").order("updated_at", { ascending: false }),
        db.from("script_licenses").select("*").order("created_at", { ascending: false }),
        db.from("player_bans").select("*").order("created_at", { ascending: false }),
        db.from("script_usage_sessions").select("*").order("last_seen_at", { ascending: false }).limit(200),
        db.from("script_usage_events").select("*").order("created_at", { ascending: false }).limit(300),
        db.from("profiles").select("id,username,display_name,account_status,created_at,updated_at").order("created_at", { ascending: false }),
        db.from("user_roles").select("*").order("created_at", { ascending: false }),
        db.from("staff_permissions").select("*"),
      ]);

    for (const result of [profileResult, scriptsResult, licensesResult, bansResult, sessionsResult, eventsResult, usersResult, rolesResult, staffResult]) {
      if (result.error) throw new Error(result.error.message);
    }

    return {
      profile: profileResult.data,
      roles: roleList,
      permissions,
      scripts: scriptsResult.data ?? [],
      licenses: licensesResult.data ?? [],
      bans: bansResult.data ?? [],
      sessions: sessionsResult.data ?? [],
      events: eventsResult.data ?? [],
      users: usersResult.data ?? [],
      userRoles: rolesResult.data ?? [],
      staffPermissions: staffResult.data ?? [],
    };
  });

export const dashboardAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        type: z.string().trim().min(1).max(40),
        payload: z.record(z.unknown()).default({}),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const userId = context.userId;

    const { data: roleRows, error: rolesError } = await db
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (rolesError) throw new Error(rolesError.message);
    const roleList = (roleRows ?? []).map((row: { role: string }) => row.role);

    const { data: permissions, error: permissionError } = await db
      .from("staff_permissions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (permissionError) throw new Error(permissionError.message);

    const has = (permission: string) => {
      if (roleList.includes("owner")) return true;
      if (!roleList.includes("staff")) return false;
      if (permission === "scripts") return Boolean(permissions?.can_manage_scripts);
      if (permission === "licenses") return Boolean(permissions?.can_manage_licenses);
      if (permission === "bans") return Boolean(permissions?.can_manage_bans);
      if (permission === "users") return Boolean(permissions?.can_manage_users);
      if (permission === "logs") return Boolean(permissions?.can_view_logs);
      return false;
    };

    if (data.type === "saveScript") {
      if (!has("scripts")) throw new Error("Missing script management permission.");
      const payload = z
        .object({
          id: z.string().uuid().optional().nullable(),
          name: z.string().trim().min(1).max(80),
          description: z.string().trim().max(500).default(""),
          sourceCode: z.string().max(500000),
          requireLicense: z.boolean(),
          isActive: z.boolean(),
        })
        .parse(data.payload);

      if (payload.id) {
        const { data: updated, error } = await db
          .from("scripts")
          .update({
            name: payload.name,
            description: payload.description,
            source_code: payload.sourceCode,
            require_license: payload.requireLicense,
            is_active: payload.isActive,
            updated_by: userId,
          })
          .eq("id", payload.id)
          .select("*")
          .single();
        if (error) throw new Error(error.message);
        return { ok: true, script: updated };
      }

      const { data: created, error } = await db
        .from("scripts")
        .insert({
          owner_id: userId,
          created_by: userId,
          name: payload.name,
          description: payload.description,
          source_code: payload.sourceCode,
          require_license: payload.requireLicense,
          is_active: payload.isActive,
        })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return { ok: true, script: created };
    }

    if (data.type === "deleteScript") {
      if (!has("scripts")) throw new Error("Missing script management permission.");
      const payload = z.object({ id: z.string().uuid() }).parse(data.payload);
      const { error } = await db.from("scripts").delete().eq("id", payload.id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    if (data.type === "createLicense") {
      if (!has("licenses")) throw new Error("Missing license management permission.");
      const payload = z
        .object({
          scriptId: z.string().uuid(),
          label: z.string().trim().max(100).default(""),
          durationMinutes: z.number().int().positive().nullable().optional(),
        })
        .parse(data.payload);
      const key = `BABIS-${crypto.randomUUID().replaceAll("-", "").slice(0, 24).toUpperCase()}`;
      const expiresAt = payload.durationMinutes
        ? new Date(Date.now() + payload.durationMinutes * 60_000).toISOString()
        : null;
      const { data: license, error } = await db
        .from("script_licenses")
        .insert({
          script_id: payload.scriptId,
          license_key: key,
          label: payload.label,
          duration_minutes: payload.durationMinutes ?? null,
          expires_at: expiresAt,
          created_by: userId,
        })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return { ok: true, license };
    }

    if (data.type === "setLicenseStatus") {
      if (!has("licenses")) throw new Error("Missing license management permission.");
      const payload = z
        .object({
          id: z.string().uuid(),
          status: z.enum(["active", "revoked", "banned", "expired"]),
          reason: z.string().trim().max(300).optional().default(""),
        })
        .parse(data.payload);
      const update =
        payload.status === "revoked" || payload.status === "banned"
          ? { status: payload.status, revoked_by: userId, revoked_at: new Date().toISOString(), revoke_reason: payload.reason }
          : { status: payload.status, revoked_by: null, revoked_at: null, revoke_reason: null };
      const { error } = await db.from("script_licenses").update(update).eq("id", payload.id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    if (data.type === "addBan") {
      if (!has("bans")) throw new Error("Missing ban management permission.");
      const payload = z
        .object({
          scope: z.enum(["script", "global"]),
          scriptId: z.string().uuid().nullable().optional(),
          playerUserId: z.string().trim().max(80).optional().default(""),
          playerName: z.string().trim().max(80).optional().default(""),
          licenseId: z.string().uuid().nullable().optional(),
          reason: z.string().trim().min(1).max(300),
          expiresAt: z.string().datetime().nullable().optional(),
        })
        .parse(data.payload);
      const { error } = await db.from("player_bans").insert({
        scope: payload.scope,
        script_id: payload.scope === "script" ? payload.scriptId : null,
        player_user_id: payload.playerUserId || null,
        player_name: payload.playerName || null,
        license_id: payload.licenseId ?? null,
        reason: payload.reason,
        expires_at: payload.expiresAt ?? null,
        created_by: userId,
      });
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    if (data.type === "setBanActive") {
      if (!has("bans")) throw new Error("Missing ban management permission.");
      const payload = z.object({ id: z.string().uuid(), isActive: z.boolean() }).parse(data.payload);
      const { error } = await db.from("player_bans").update({ is_active: payload.isActive }).eq("id", payload.id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    if (data.type === "kickSession") {
      if (!has("bans")) throw new Error("Missing ban management permission.");
      const payload = z
        .object({ id: z.string().uuid(), reason: z.string().trim().min(1).max(300) })
        .parse(data.payload);
      const { data: session, error } = await db
        .from("script_usage_sessions")
        .update({ status: "kicked", kick_reason: payload.reason, ended_at: new Date().toISOString() })
        .eq("id", payload.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      await db.from("script_usage_events").insert({
        script_id: session.script_id,
        session_id: session.id,
        license_id: session.license_id,
        event_type: "kick_queued",
        player_user_id: session.player_user_id,
        player_name: session.player_name,
        message: payload.reason,
      });
      return { ok: true };
    }

    if (data.type === "upsertStaff") {
      if (!has("users")) throw new Error("Missing user management permission.");
      const payload = z
        .object({
          username: z.string().trim().min(3).max(32).regex(/^[A-Za-z0-9_]+$/),
          canManageScripts: z.boolean(),
          canManageLicenses: z.boolean(),
          canManageBans: z.boolean(),
          canManageUsers: z.boolean(),
          canViewLogs: z.boolean(),
        })
        .parse(data.payload);
      const { data: profile, error: profileError } = await db
        .from("profiles")
        .select("id")
        .ilike("username", payload.username)
        .maybeSingle();
      if (profileError) throw new Error(profileError.message);
      if (!profile) throw new Error("That user must sign up and create a profile before staff permissions can be assigned.");
      const targetUserId = profile.id;
      const { error: roleError } = await db.from("user_roles").upsert(
        { user_id: targetUserId, role: "staff" },
        { onConflict: "user_id,role" },
      );
      if (roleError) throw new Error(roleError.message);
      const { error: staffError } = await db.from("staff_permissions").upsert({
        user_id: targetUserId,
        can_manage_scripts: payload.canManageScripts,
        can_manage_licenses: payload.canManageLicenses,
        can_manage_bans: payload.canManageBans,
        can_manage_users: payload.canManageUsers,
        can_view_logs: payload.canViewLogs,
      });
      if (staffError) throw new Error(staffError.message);
      return { ok: true };
    }

    if (data.type === "removeStaff") {
      if (!has("users")) throw new Error("Missing user management permission.");
      const payload = z.object({ userId: z.string().uuid() }).parse(data.payload);
      const { error: permissionDeleteError } = await db
        .from("staff_permissions")
        .delete()
        .eq("user_id", payload.userId);
      if (permissionDeleteError) throw new Error(permissionDeleteError.message);
      const { error: roleDeleteError } = await db
        .from("user_roles")
        .delete()
        .eq("user_id", payload.userId)
        .eq("role", "staff");
      if (roleDeleteError) throw new Error(roleDeleteError.message);
      return { ok: true };
    }

    throw new Error("Unknown dashboard action.");
  });