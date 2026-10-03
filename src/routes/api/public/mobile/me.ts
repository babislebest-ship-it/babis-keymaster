import { createFileRoute } from "@tanstack/react-router";
import { fetchKeymasterApi, json } from "@/lib/mobile-api.server";

export const Route = createFileRoute("/api/public/mobile/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const upstream = await fetchKeymasterApi(request, "/api/public/mobile/me", {
          method: "GET",
          forwardAuthorization: true,
        });
        let result: Record<string, unknown>;
        try {
          result = (await upstream.json()) as Record<string, unknown>;
        } catch {
          return json({ error: "The Keymaster API returned an invalid response." }, 502);
        }
        if (!upstream.ok) {
          const error =
            typeof result.error === "string" ? result.error : "Account data is unavailable.";
          return json({ error }, upstream.status);
        }

        const user =
          result.user && typeof result.user === "object"
            ? (result.user as Record<string, unknown>)
            : {};
        const profile =
          result.profile && typeof result.profile === "object"
            ? (result.profile as Record<string, unknown>)
            : null;
        const orders = Array.isArray(result.orders)
          ? result.orders.map((value) => {
              const order =
                value && typeof value === "object" ? (value as Record<string, unknown>) : {};
              return {
                id: typeof order.id === "string" ? order.id : "",
                status: typeof order.status === "string" ? order.status : "unknown",
                amount_cents: typeof order.amount_cents === "number" ? order.amount_cents : 0,
                currency: typeof order.currency === "string" ? order.currency : "EUR",
                created_at: typeof order.created_at === "string" ? order.created_at : "",
              };
            })
          : [];

        return json({
          user: {
            id: typeof user.id === "string" ? user.id : null,
            email: typeof user.email === "string" ? user.email : null,
          },
          profile: profile
            ? {
                id: typeof profile.id === "string" ? profile.id : null,
                username: typeof profile.username === "string" ? profile.username : "",
                display_name:
                  typeof profile.display_name === "string" ? profile.display_name : null,
                created_at: typeof profile.created_at === "string" ? profile.created_at : null,
              }
            : null,
          orders,
        });
      },
    },
  },
});
