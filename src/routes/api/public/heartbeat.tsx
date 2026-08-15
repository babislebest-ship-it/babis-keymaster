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

        const { findMatchingBan } = await import("@/lib/ban-match.server");
        const { data: candidateBans, error: banError } = await db
          .from("player_bans")
          .select("*")
          .eq("is_active", true)
          .in("scope", ["global", "script"])
          .limit(1000);
        if (banError) return reply({ ok: false, message: banError.message }, 500);

        const matchedBan = findMatchingBan(candidateBans, {
          scriptId: session.script_id,
          playerUserId: session.player_user_id,
          playerName: session.player_name,
          licenseId: session.license_id,
          ipHash: session.ip_hash,
        });
        if (matchedBan) {
          await db
            .from("script_usage_sessions")
            .update({ status: "banned", kick_reason: matchedBan.reason, ended_at: new Date().toISOString() })
            .eq("id", session.id);
          return reply({ ok: true, action: "kick", reason: matchedBan.reason });
        }

        const pendingMessage = session.pending_message as string | null;
        await db
          .from("script_usage_sessions")
          .update({
            last_seen_at: new Date().toISOString(),
            total_seconds: Math.max(0, Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000)),
            pending_message: null,
          })
          .eq("id", session.id);

        return reply({ ok: true, action: "continue", message: pendingMessage || null });
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