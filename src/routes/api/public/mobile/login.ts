import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { verifyApiKey, getPublishable, json } from "@/lib/mobile-api.server";

export const Route = createFileRoute("/api/public/mobile/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await verifyApiKey(request);
        if (denied) return denied;

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

        const db = getPublishable();
        const { data, error } = await db.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error || !data?.session || !data?.user) {
          return json({ error: "Invalid email or password." }, 401);
        }

        return json({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
          user: { id: data.user.id, email: data.user.email },
        });
      },
    },
  },
});
