import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/api/public/run/$publicId")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const { createHash } = await import("crypto");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;

        const corsHeaders = {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          "Access-Control-Allow-Origin": "*",
        };
        const reply = (body: Record<string, unknown>, status = 200) =>
          Response.json(body, { status, headers: corsHeaders });

        let parsed: {
          licenseKey: string;
          playerUserId: string;
          playerName: string;
          placeId: string;
          jobId: string;
          executorName: string;
        };
        try {
          const body = await request.json();
          parsed = z
            .object({
              licenseKey: z.string().trim().max(160).optional().default(""),
              playerUserId: z.string().trim().max(80).optional().default(""),
              playerName: z.string().trim().max(80).optional().default(""),
              placeId: z.string().trim().max(80).optional().default(""),
              jobId: z.string().trim().max(120).optional().default(""),
              executorName: z.string().trim().max(80).optional().default(""),
            })
            .parse(body) as never;
        } catch {
          return reply({ ok: false, message: "Invalid launch request." }, 400);
        }

        const publicId = String((params as { publicId?: string }).publicId ?? "").replace(/[^a-zA-Z0-9_-]/g, "");
        const forwarded = request.headers.get("x-forwarded-for") ?? "";
        const ip = forwarded.split(",")[0]?.trim() || request.headers.get("cf-connecting-ip") || "unknown";
        const ipHash = createHash("sha256").update(`babis:${ip}`).digest("hex");

        const { data: script, error: scriptError } = await db
          .from("scripts")
          .select("*")
          .eq("public_id", publicId)
          .eq("is_active", true)
          .maybeSingle();
        if (scriptError) return reply({ ok: false, message: scriptError.message }, 500);
        if (!script) return reply({ ok: false, message: "Script not found or disabled." }, 404);

        const { findMatchingBan } = await import("@/lib/ban-match.server");
        const { data: candidateBans, error: banError } = await db
          .from("player_bans")
          .select("*")
          .eq("is_active", true)
          .in("scope", ["global", "script"])
          .limit(1000);
        if (banError) return reply({ ok: false, message: banError.message }, 500);
        const matchedBan = findMatchingBan(candidateBans, {
          scriptId: script.id,
          playerUserId: parsed.playerUserId,
          playerName: parsed.playerName,
          ipHash,
        });
        if (matchedBan) {
          await db.from("script_usage_events").insert({
            script_id: script.id,
            event_type: "blocked_ban",
            player_user_id: parsed.playerUserId || null,
            player_name: parsed.playerName || null,
            message: matchedBan.reason,
          });
          return reply({ ok: false, message: `Access blocked. ${matchedBan.reason} Appeal: ${matchedBan.appeal_url}` }, 403);
        }

        let license = null;
        if (script.require_license) {
          if (!parsed.licenseKey) return reply({ ok: false, message: "A license key is required." }, 401);
          const { data: licenseRow, error: licenseError } = await db
            .from("script_licenses")
            .select("*")
            .eq("script_id", script.id)
            .eq("license_key", parsed.licenseKey)
            .maybeSingle();
          if (licenseError) return reply({ ok: false, message: licenseError.message }, 500);
          if (!licenseRow) return reply({ ok: false, message: "Invalid license key." }, 401);
          if (licenseRow.status !== "active") return reply({ ok: false, message: `License is ${licenseRow.status}.` }, 403);
          if (licenseRow.expires_at && new Date(licenseRow.expires_at).getTime() < Date.now()) {
            await db.from("script_licenses").update({ status: "expired" }).eq("id", licenseRow.id);
            return reply({ ok: false, message: "License expired." }, 403);
          }
          if (licenseRow.bound_player_user_id && parsed.playerUserId && licenseRow.bound_player_user_id !== parsed.playerUserId) {
            return reply({ ok: false, message: "License is already bound to another player." }, 403);
          }
          license = licenseRow;
          await db
            .from("script_licenses")
            .update({
              first_used_at: licenseRow.first_used_at ?? new Date().toISOString(),
              last_used_at: new Date().toISOString(),
              usage_count: (licenseRow.usage_count ?? 0) + 1,
              bound_player_user_id: licenseRow.bound_player_user_id ?? (parsed.playerUserId || null),
              bound_player_name: licenseRow.bound_player_name ?? (parsed.playerName || null),
            })
            .eq("id", licenseRow.id);
        }

        // One person = one live session. Close any older active session for
        // the same player before opening a new one, so relaunching does not
        // stack duplicate entries in the live list.
        let staleSessionQuery = db
          .from("script_usage_sessions")
          .update({ status: "ended", ended_at: new Date().toISOString() })
          .eq("status", "active");
        // Use exactly one strongest identifier. Building a PostgREST `.or()`
        // expression from client strings could close unrelated live sessions.
        if (parsed.playerUserId) {
          staleSessionQuery = staleSessionQuery.eq("player_user_id", parsed.playerUserId);
        } else if (parsed.playerName) {
          staleSessionQuery = staleSessionQuery.ilike("player_name", parsed.playerName);
        } else {
          staleSessionQuery = staleSessionQuery.eq("ip_hash", ipHash);
        }
        await staleSessionQuery;

        const { data: session, error: sessionError } = await db
          .from("script_usage_sessions")
          .insert({
            script_id: script.id,
            license_id: license?.id ?? null,
            player_user_id: parsed.playerUserId || null,
            player_name: parsed.playerName || null,
            place_id: parsed.placeId || null,
            job_id: parsed.jobId || null,
            executor_name: parsed.executorName || null,
            ip_hash: ipHash,
          })
          .select("*")
          .single();
        if (sessionError) return reply({ ok: false, message: sessionError.message }, 500);

        await db.from("script_usage_events").insert({
          script_id: script.id,
          session_id: session.id,
          license_id: license?.id ?? null,
          event_type: "launch_allowed",
          player_user_id: parsed.playerUserId || null,
          player_name: parsed.playerName || null,
          message: "Launch authorized",
        });

        // Upsert player history (one row per real player)
        const { buildPlayerKey, findPlayerHistoryRow } = await import("@/lib/player-history.server");
        const identity = {
          playerUserId: parsed.playerUserId || null,
          playerName: parsed.playerName || null,
          ipHash,
        };
        const playerKey = buildPlayerKey(identity);
        let pendingMessage: string | null = null;
        {
          const existing = await findPlayerHistoryRow(db, identity);
          // If a kick was queued while offline, block launch now.
          if (existing?.pending_kick_reason) {
            const reason = existing.pending_kick_reason as string;
            await db
              .from("player_history")
              .update({ pending_kick_reason: null, last_seen_at: new Date().toISOString() })
              .eq("id", existing.id);
            await db
              .from("script_usage_sessions")
              .update({ status: "kicked", kick_reason: reason, ended_at: new Date().toISOString() })
              .eq("id", session.id);
            return reply({ ok: false, message: reason }, 403);
          }
          if (existing?.pending_message) {
            pendingMessage = existing.pending_message as string;
            await db.from("player_history").update({ pending_message: null }).eq("id", existing.id);
            await db.from("script_usage_sessions").update({ pending_message: pendingMessage }).eq("id", session.id);
          }
          if (existing) {
            // Merge any older duplicate rows for the same Roblox account.
            if (parsed.playerUserId) {
              await db
                .from("player_history")
                .delete()
                .eq("player_user_id", parsed.playerUserId)
                .neq("id", existing.id);
            }
            await db
              .from("player_history")
              .update({
                player_user_id: parsed.playerUserId || existing.player_user_id || null,
                player_name: parsed.playerName || existing.player_name || null,
                executor_name: parsed.executorName || existing.executor_name || null,
                ip_hash: ipHash,
                last_script_id: script.id,
                place_id: parsed.placeId || null,
                job_id: parsed.jobId || null,
                presence_type: 2,
                connection_count: (existing.connection_count ?? 0) + 1,
                last_seen_at: new Date().toISOString(),
              })
              .eq("id", existing.id);
          } else {
            await db.from("player_history").insert({
              player_key: playerKey,
              player_user_id: parsed.playerUserId || null,
              player_name: parsed.playerName || null,
              executor_name: parsed.executorName || null,
              ip_hash: ipHash,
              last_script_id: script.id,
              place_id: parsed.placeId || null,
              job_id: parsed.jobId || null,
              presence_type: 2,
            });
          }
        }

        return reply({ ok: true, source: script.source_code, sessionToken: session.session_token });
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