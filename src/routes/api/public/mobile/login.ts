import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { fetchKeymasterApi, json } from "@/lib/mobile-api.server";

export const Route = createFileRoute("/api/public/mobile/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let raw: unknown = null;
        try {
          raw = await request.json();
        } catch {
          return json({ error: "Invalid JSON body." }, 400);
        }
        const parsed = z
          .object({ email: z.string().email(), password: z.string().min(6).max(200) })
          .safeParse(raw);
        if (!parsed.success) {
          return json({ error: "Email and password are required." }, 400);
        }

        const upstream = await fetchKeymasterApi(
          request,
          "/api/public/mobile/login",
          {
            method: "POST",
            body: JSON.stringify(parsed.data),
          },
        );
        let result: Record<string, unknown>;
        try {
          result = (await upstream.json()) as Record<string, unknown>;
        } catch {
          return json({ error: "The Keymaster API returned an invalid response." }, 502);
        }
        if (!upstream.ok) {
          const error =
            typeof result.error === "string" ? result.error : "Sign in could not be completed.";
          return json({ error }, upstream.status);
        }

        const user =
          result.user && typeof result.user === "object"
            ? (result.user as Record<string, unknown>)
            : {};
        if (
          typeof result.access_token !== "string" ||
          typeof result.refresh_token !== "string"
        ) {
          return json({ error: "The Keymaster API returned an invalid sign-in response." }, 502);
        }
        return json({
          access_token: result.access_token,
          refresh_token: result.refresh_token,
          expires_at: typeof result.expires_at === "number" ? result.expires_at : null,
          user: {
            id: typeof user.id === "string" ? user.id : null,
            email: typeof user.email === "string" ? user.email : parsed.data.email,
          },
        });
      },
    },
  },
});
