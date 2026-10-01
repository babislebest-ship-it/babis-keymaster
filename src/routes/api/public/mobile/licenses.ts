import { createFileRoute } from "@tanstack/react-router";
import { json, verifyApiKey } from "@/lib/mobile-api.server";

export const Route = createFileRoute("/api/public/mobile/licenses")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const denied = await verifyApiKey(request);
        if (denied) return denied;

        const url = new URL(request.url);
        const key = (url.searchParams.get("key") ?? "").trim();
        if (key.length < 6 || key.length > 64) {
          return json({ error: "A license key is required (?key=...)." }, 400);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;

        const res = await db
          .from("script_licenses")
          .select(
            "id, license_key, label, status, all_scripts, script_id, expires_at, usage_count, max_users, seat_count, bound_player_user_id, bound_player_name, first_used_at, last_used_at, created_at"
          )
          .eq("license_key", key)
          .maybeSingle();

        const license = res.data as Record<string, unknown> | null;
        if (!license) return json({ error: "License not found." }, 404);

        const expired =
          license.status === "active" &&
          typeof license.expires_at === "string" &&
          new Date(license.expires_at).getTime() <= Date.now();

        let script: { id: unknown; name: unknown; public_id: unknown } | null = null;
        if (license.script_id) {
          const scriptRes = await db
            .from("scripts")
            .select("id, name, public_id")
            .eq("id", license.script_id)
            .maybeSingle();
          script = scriptRes.data ?? null;
        }

        return json({
          license: {
            ...license,
            is_expired: expired || license.status === "expired",
          },
          script,
        });
      },
    },
  },
});
