import { createFileRoute } from "@tanstack/react-router";
import { extractBearer, getAuthedUser, json, verifyApiKey } from "@/lib/mobile-api.server";

export const Route = createFileRoute("/api/public/mobile/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const denied = await verifyApiKey(request);
        if (denied) return denied;

        const token = extractBearer(request);
        if (!token) return json({ error: "Missing access token." }, 401);
        const user = await getAuthedUser(token);
        if (!user) return json({ error: "Session expired. Sign in again." }, 401);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;

        const [profileRes, ordersRes] = await Promise.all([
          db.from("profiles").select("*").eq("id", user.id).maybeSingle(),
          db
            .from("orders")
            .select("id, status, items, amount_cents, currency, delivered_keys, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(50),
        ]);

        return json({
          user: { id: user.id, email: user.email },
          profile: profileRes.data ?? null,
          orders: ordersRes.data ?? [],
        });
      },
    },
  },
});
