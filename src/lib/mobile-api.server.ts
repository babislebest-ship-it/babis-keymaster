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

const REMOTE_MOBILE_PATHS = [
  "/api/public/mobile/login",
  "/api/public/mobile/me",
  "/api/public/mobile/shop",
] as const;

export type RemoteMobilePath = (typeof REMOTE_MOBILE_PATHS)[number];

/** Makes a server-only request to the configured Keymaster API. */
export async function fetchKeymasterApi(
  request: Request,
  path: RemoteMobilePath,
  init: { method: "GET" | "POST"; body?: string; forwardAuthorization?: boolean },
): Promise<Response> {
  const apiKey = process.env["KEYMASTER_API_KEY"];
  if (!apiKey) return json({ error: "The Keymaster API is not configured on this server." }, 503);

  let baseUrl: URL;
  try {
    baseUrl = new URL(process.env["KEYMASTER_API_BASE_URL"] || "https://babis-keymaster.lovable.app");
  } catch {
    return json({ error: "The Keymaster API base URL is invalid." }, 503);
  }
  if (
    baseUrl.protocol !== "https:" ||
    baseUrl.username ||
    baseUrl.password ||
    baseUrl.search ||
    baseUrl.hash ||
    (baseUrl.pathname !== "/" && baseUrl.pathname !== "")
  ) {
    return json({ error: "The Keymaster API base URL must be an HTTPS origin." }, 503);
  }
  if (new URL(request.url).origin === baseUrl.origin) {
    return json(
      { error: "The Keymaster API proxy and upstream must use different origins." },
      503,
    );
  }

  const headers = new Headers({ Accept: "application/json", "x-api-key": apiKey });
  if (init.body) headers.set("Content-Type", "application/json");
  if (init.forwardAuthorization) {
    const authorization = request.headers.get("Authorization");
    if (!authorization || !/^Bearer\s+\S+$/i.test(authorization)) {
      return json({ error: "A bearer access token is required." }, 401);
    }
    headers.set("Authorization", authorization);
  }

  try {
    const response = await fetch(new URL(path, baseUrl), {
      method: init.method,
      headers,
      body: init.body,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      const status = response.status >= 500 ? 502 : response.status;
      return json(
        {
          error:
            response.status >= 500
              ? "The Keymaster API is temporarily unavailable."
              : "The Keymaster API rejected the request.",
        },
        status,
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return json({ error: "The Keymaster API returned an invalid response." }, 502);
    }
    return response;
  } catch {
    return json({ error: "The Keymaster API could not be reached." }, 502);
  }
}
