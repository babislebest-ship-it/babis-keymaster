import { createFileRoute } from "@tanstack/react-router";
import { json, verifyApiKey } from "@/lib/mobile-api.server";

export const Route = createFileRoute("/api/public/mobile/bans")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const denied = await verifyApiKey(request);
        if (denied) return denied;

        const url = new URL(request.url);
        const userId = (url.searchParams.get("user_id") ?? "").trim();
        const username = (url.searchParams.get("username") ?? "").trim();
        if (!userId && !username) {
          return json({ error: "Provide ?user_id= or ?username=." }, 400);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;

        const queries = [];
        if (userId) {
          queries.push(
            db
              .from("player_bans")
              .select("id, scope, script_id, player_user_id, player_name, reason, appeal_url, expires_at, created_at")
              .eq("is_active", true)
              .not("player_user_id", "is", null)
              .eq("player_user_id", userId)
          );
        }
        if (username) {
          queries.push(
            db
              .from("player_bans")
              .select("id, scope, script_id, player_user_id, player_name, reason, appeal_url, expires_at, created_at")
              .eq("is_active", true)
              .not("player_name", "is", null)
              .eq("player_name", username)
          );
        }

        const results = await Promise.all(queries);
        const now = Date.now();
        const seen = new Set<string>();
        const bans: Record<string, unknown>[] = [];
        for (const res of results) {
          for (const row of (res.data ?? []) as Record<string, unknown>[]) {
            if (row.expires_at && new Date(row.expires_at as string).getTime() <= now) continue;
            const id = String(row.id);
            if (seen.has(id)) continue;
            seen.add(id);
            bans.push(row);
          }
        }

        return json({ banned: bans.length > 0, bans });
      },
    },
  },
});
