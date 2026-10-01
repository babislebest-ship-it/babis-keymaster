import { createFileRoute } from "@tanstack/react-router";
import { json, verifyApiKey } from "@/lib/mobile-api.server";

export const Route = createFileRoute("/api/public/mobile/scripts")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const denied = await verifyApiKey(request);
        if (denied) return denied;

        const url = new URL(request.url);
        const licenseKey = (url.searchParams.get("license_key") ?? "").trim() || null;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;

        const scriptsRes = await db
          .from("scripts")
          .select(
            "id, public_id, name, description, game_url, place_id, universe_id, require_license, updated_at"
          )
          .eq("is_active", true)
          .order("updated_at", { ascending: false });

        const scripts: Array<Record<string, unknown>> = scriptsRes.data ?? [];

        // A valid license key unlocks the source code of the scripts it covers.
        let validLicense: Record<string, unknown> | null = null;
        if (licenseKey) {
          const licRes = await db
            .from("script_licenses")
            .select("id, license_key, status, all_scripts, script_id, expires_at, max_users, seat_count")
            .eq("license_key", licenseKey)
            .maybeSingle();
          const lic = licRes.data as Record<string, unknown> | null;
          if (
            lic &&
            lic.status === "active" &&
            (!lic.expires_at || new Date(lic.expires_at as string).getTime() > Date.now())
          ) {
            validLicense = lic;
          }
        }

        const enriched = scripts.map((s) => {
          const free = s.require_license === false;
          const covered =
            validLicense &&
            (validLicense.all_scripts === true || validLicense.script_id === s.id);
          if (free || covered) {
            return { ...s, source_available: true };
          }
          const { source_available, ...rest } = { source_available: false, ...s } as Record<
            string,
            unknown
          >;
          return { ...rest, source_available };
        });

        return json({
          scripts: enriched,
          license_valid: Boolean(validLicense),
        });
      },
    },
  },
});
