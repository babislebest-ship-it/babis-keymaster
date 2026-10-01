import { timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** JSON reply helper for the mobile API. */
export function json(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/**
 * Verifies the app-level `x-api-key` header against the MOBILE_API_KEY secret.
 * Returns a Response to send immediately, or null when the caller is valid.
 */
export async function verifyApiKey(request: Request): Promise<Response | null> {
  const expected = process.env["MOBILE_API_KEY"];
  if (!expected) {
    return json({ error: "Mobile API is not configured yet." }, 503);
  }
  const provided = request.headers.get("x-api-key") ?? "";
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return json({ error: "Invalid API key." }, 401);
  }
  return null;
}

/** Publishable-key client (used for sign-in only; opaque sb_ keys need the apikey shim). */
export function getPublishable() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

/** Validates a Supabase bearer access token and returns the user, or null. */
export async function getAuthedUser(accessToken: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
  if (error || !data?.user) return null;
  return data.user;
}

/** Extracts and validates the Bearer access token from a request. */
export function extractBearer(request: Request): string | null {
  const header = request.headers.get("Authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return null;
  const token = match[1].trim();
  return token.length > 20 ? token : null;
}
