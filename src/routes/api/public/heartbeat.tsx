import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/api/public/heartbeat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;
        const headers = {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          "Access-Control-Allow-Origin": "*",
        };
        const reply = (body: Record<string, unknown>, status = 200) => Response.json(body, { status, headers });

        let sessionToken = "";
        try {
          const body = await request.json();
          sessionToken = z.object({ sessionToken: z.string().min(10).max(80) }).parse(body).sessionToken;
        } catch {
          return reply({ ok: false, message: "Invalid heartbeat." }, 400);
        }

        const { data: session, error: sessionError } = await db
          .from("script_usage_sessions")
          .select("*")
          .eq("session_token", sessionToken)
          .maybeSingle();
        if (sessionError) return reply({ ok: false, message: sessionError.message }, 500);
        if (!session) return reply({ ok: false, message: "Session not found." }, 404);

        if (session.status === "kicked" || session.status === "banned") {
          return reply({ ok: true, action: "kick", reason: session.kick_reason || "Access revoked" });
        }

        const { data: bans, error: banError } = await db
          .from("player_bans")
          .select("*")
          .eq("is_active", true)
          .or(`scope.eq.global,and(scope.eq.script,script_id.eq.${session.script_id})`)
          .or(
            [
              session.player_user_id ? `player_user_id.eq.${session.player_user_id}` : "player_user_id.is.null",
              session.player_name ? `player_name.eq.${session.player_name}` : "player_name.is.null",
              session.license_id ? `license_id.eq.${session.license_id}` : "license_id.is.null",
              session.ip_hash ? `ip_hash.eq.${session.ip_hash}` : "ip_hash.is.null",
            ].join(","),
          )
          .limit(1);
        if (banError) return reply({ ok: false, message: banError.message }, 500);

        if (bans?.length) {
          await db
            .from("script_usage_sessions")
            .update({ status: "banned", kick_reason: bans[0].reason, ended_at: new Date().toISOString() })
            .eq("id", session.id);
          return reply({ ok: true, action: "kick", reason: bans[0].reason });
        }

        await db
          .from("script_usage_sessions")
          .update({
            last_seen_at: new Date().toISOString(),
            total_seconds: Math.max(0, Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000)),
          })
          .eq("id", session.id);

        return reply({ ok: true, action: "continue" });
      },
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }),
    },
  },
});