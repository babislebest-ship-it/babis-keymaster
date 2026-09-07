import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CONTENT_TABLES = [
  "shop_items",
  "pricing_plans",
  "site_faq",
  "site_videos",
  "site_links",
  "site_tabs",
] as const;

type ContentTable = (typeof CONTENT_TABLES)[number];

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const url = process.env["SUPABASE_URL"]!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: any, init: any) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  }) as any;
}

export const getSiteContent = createServerFn({ method: "GET" }).handler(async () => {
  const db = publicClient();
  const pick = async (table: string, order = "sort_order") =>
    (await db.from(table).select("*").order(order, { ascending: true })).data ?? [];

  const [items, plans, faq, videos, links, tabs, settings] = await Promise.all([
    pick("shop_items"),
    pick("pricing_plans"),
    pick("site_faq"),
    pick("site_videos"),
    pick("site_links"),
    pick("site_tabs"),
    db.from("app_settings").select("discord_invite_url").eq("id", "global").maybeSingle(),
  ]);
  const reviews =
    (await db.from("site_reviews").select("*").order("created_at", { ascending: false }).limit(50)).data ?? [];

  return {
    items,
    plans,
    faq,
    videos,
    links,
    tabs,
    reviews,
    discordInviteUrl: settings?.data?.discord_invite_url ?? "https://discord.gg/75auNNfmhS",
  };
});

export const getViewerState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("username, display_name")
      .eq("id", context.userId)
      .maybeSingle();
    return {
      userId: context.userId,
      isOwner: (roles ?? []).some((r: any) => r.role === "owner"),
      username: (profile as any)?.display_name || (profile as any)?.username || "Member",
    };
  });

const contentSchema = z.object({
  table: z.enum(CONTENT_TABLES),
  op: z.enum(["insert", "update", "delete"]),
  id: z.string().uuid().optional(),
  values: z.record(z.string(), z.any()).optional(),
});

async function assertOwner(context: any) {
  const { data: roles } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  if (!(roles ?? []).some((r: any) => r.role === "owner")) throw new Error("Owner access required");
}

export const saveSiteContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => contentSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertOwner(context);
    const db = context.supabase as any;
    const table = data.table as ContentTable;

    if (data.op === "delete") {
      if (!data.id) throw new Error("Missing id");
      const { error } = await db.from(table).delete().eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    if (data.op === "update") {
      if (!data.id) throw new Error("Missing id");
      const { error } = await db.from(table).update(data.values ?? {}).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    const { error } = await db.from(table).insert(data.values ?? {});
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        rating: z.number().int().min(1).max(5),
        body: z.string().trim().min(3).max(600),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("username, display_name")
      .eq("id", context.userId)
      .maybeSingle();
    const authorName = (profile as any)?.display_name || (profile as any)?.username || "Member";
    const { error } = await (context.supabase as any).from("site_reviews").upsert(
      {
        user_id: context.userId,
        author_name: authorName,
        rating: data.rating,
        body: data.body,
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).from("site_reviews").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const registerVisitor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ username: z.string().trim().min(3).max(32) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).from("profiles").upsert({
      id: context.userId,
      username: data.username,
      display_name: data.username,
      account_status: "active",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
