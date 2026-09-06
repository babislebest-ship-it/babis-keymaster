import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/loader/$publicId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { buildLoaderSource, getAppealUrl, isBlockedLoaderClient } = await import("@/lib/loader-source.server");
        if (isBlockedLoaderClient(request.headers.get("user-agent") || "")) {
          return new Response("Forbidden", {
            status: 403,
            headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
          });
        }
        const origin = new URL(request.url).origin;
        const publicId = String((params as { publicId?: string }).publicId ?? "").replace(/[^a-zA-Z0-9_-]/g, "");

        // Fetch require_license so the loader UI can skip the key box when not needed.
        let requireLicense = true;
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: script } = await (supabaseAdmin as any)
            .from("scripts")
            .select("require_license")
            .eq("public_id", publicId)
            .eq("is_active", true)
            .maybeSingle();
          if (script) requireLicense = Boolean(script.require_license);
        } catch {}

        const source = buildLoaderSource({
          runUrl: `${origin}/api/public/run/${publicId}`,
          heartbeatUrl: `${origin}/api/public/heartbeat`,
          appealUrl: await getAppealUrl(),
          cacheFile: `babis_license_${publicId}.txt`,
          showKeyBox: requireLicense,
          alwaysAutoLaunch: false,
        });

        return new Response(source, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-store",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }),
    },
  },
});
