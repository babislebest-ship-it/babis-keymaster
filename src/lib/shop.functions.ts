import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TABLES = ["shop_items", "pricing_plans", "site_faq", "site_videos", "site_links", "site_tabs"] as const;
type TableName = (typeof TABLES)[number];

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

async function assertOwner(db: any, userId: string) {
  const { data } = await db.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r: { role: string }) => r.role);
  if (!roles.includes("owner")) throw new Error("Owner access required.");
}

export const getSiteContent = createServerFn({ method: "GET" }).handler(async () => {
  const db = await admin();
  const [items, plans, faq, videos, links, tabs, reviews, settings] = await Promise.all([
    db.from("shop_items").select("*").order("sort_order"),
    db.from("pricing_plans").select("*").order("sort_order"),
    db.from("site_faq").select("*").order("sort_order"),
    db.from("site_videos").select("*").order("sort_order"),
    db.from("site_links").select("*").order("sort_order"),
    db.from("site_tabs").select("*").order("sort_order"),
    db.from("site_reviews").select("*").order("created_at", { ascending: false }).limit(60),
    db.from("app_settings").select("discord_invite_url").limit(1).maybeSingle(),
  ]);
  return {
    shopItems: items.data ?? [],
    plans: plans.data ?? [],
    faq: faq.data ?? [],
    videos: videos.data ?? [],
    links: links.data ?? [],
    tabs: tabs.data ?? [],
    reviews: reviews.data ?? [],
    discordInviteUrl: settings.data?.discord_invite_url ?? "",
  };
});

export const getViewerState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    const userId = context.userId;
    const [{ data: profile }, { data: roles }] = await Promise.all([
      db.from("profiles").select("*").eq("id", userId).maybeSingle(),
      db.from("user_roles").select("role").eq("user_id", userId),
    ]);
    const roleList = (roles ?? []).map((r: { role: string }) => r.role);
    return {
      userId,
      profile,
      roles: roleList,
      isOwner: roleList.includes("owner"),
    };
  });

export const saveSiteContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        table: z.enum(TABLES),
        id: z.string().uuid().nullable().optional(),
        row: z.record(z.string(), z.any()),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = await admin();
    await assertOwner(db, context.userId);
    const table: TableName = data.table;
    const row = { ...data.row };
    delete row["id"];
    delete row["created_at"];
    delete row["updated_at"];
    if (data.id) {
      const { error } = await db.from(table).update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: inserted, error } = await db.from(table).insert(row).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, id: inserted.id };
  });

export const deleteSiteContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ table: z.enum(TABLES), id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await admin();
    await assertOwner(db, context.userId);
    const { error } = await db.from(data.table).delete().eq("id", data.id);
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
    const db = await admin();
    const { data: profile } = await db.from("profiles").select("username,display_name").eq("id", context.userId).maybeSingle();
    const { error } = await db.from("site_reviews").upsert(
      {
        user_id: context.userId,
        author_name: profile?.display_name || profile?.username || "Member",
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
    const db = await admin();
    const { data: roles } = await db.from("user_roles").select("role").eq("user_id", context.userId);
    const isOwner = (roles ?? []).some((r: { role: string }) => r.role === "owner");
    let query = db.from("site_reviews").delete().eq("id", data.id);
    if (!isOwner) query = query.eq("user_id", context.userId);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------- PayPal ------------------------------- */

const PAYPAL_API = "https://api-m.paypal.com";

async function paypalToken() {
  const id = process.env["PAYPAL_CLIENT_ID"];
  const secret = process.env["PAYPAL_CLIENT_SECRET"];
  if (!id || !secret) throw new Error("PayPal is not configured.");
  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error("PayPal authentication failed.");
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

export const getPaypalConfig = createServerFn({ method: "GET" }).handler(async () => ({
  clientId: process.env["PAYPAL_CLIENT_ID"] ?? "",
  currency: "EUR",
}));

const cartSchema = z.object({
  items: z
    .array(
      z.object({
        kind: z.enum(["shop_items", "pricing_plans"]),
        id: z.string().uuid(),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .min(1)
    .max(20),
  buyerName: z.string().trim().max(80).optional(),
  buyerEmail: z.string().trim().email().max(120).optional(),
  discordTag: z.string().trim().max(80).optional(),
});

export const createPaypalOrder = createServerFn({ method: "POST" })
  .inputValidator((input) => cartSchema.parse(input))
  .handler(async ({ data }) => {
    const db = await admin();
    const currency = "EUR";
    const lines: Array<{ name: string; unit: number; quantity: number }> = [];

    for (const line of data.items) {
      const { data: row } = await db
        .from(line.kind)
        .select(line.kind === "shop_items" ? "id,title,price_cents,is_published" : "id,name,price_cents,is_published")
        .eq("id", line.id)
        .maybeSingle();
      if (!row || row.is_published === false) throw new Error("An item in your cart is no longer available.");
      const price = Number(row.price_cents ?? 0);
      if (price <= 0) throw new Error("This item is not purchasable online.");
      lines.push({ name: String(row.title ?? row.name ?? "Item").slice(0, 120), unit: price, quantity: line.quantity });
    }

    const totalCents = lines.reduce((sum, l) => sum + l.unit * l.quantity, 0);
    const token = await paypalToken();
    const res = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: currency,
              value: (totalCents / 100).toFixed(2),
              breakdown: {
                item_total: { currency_code: currency, value: (totalCents / 100).toFixed(2) },
              },
            },
            items: lines.map((l) => ({
              name: l.name,
              quantity: String(l.quantity),
              unit_amount: { currency_code: currency, value: (l.unit / 100).toFixed(2) },
            })),
          },
        ],
      }),
    });
    const json = (await res.json()) as { id?: string; message?: string };
    if (!res.ok || !json.id) throw new Error(json.message || "Could not start the PayPal checkout.");

    await db.from("orders").insert({
      paypal_order_id: json.id,
      status: "created",
      buyer_email: data.buyerEmail ?? null,
      buyer_name: data.buyerName ?? null,
      discord_tag: data.discordTag ?? null,
      items: lines,
      amount_cents: totalCents,
      currency,
    });

    return { orderId: json.id, amountCents: totalCents, currency };
  });

export const capturePaypalOrder = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ orderId: z.string().trim().min(4).max(64) }).parse(input))
  .handler(async ({ data }) => {
    const db = await admin();
    const token = await paypalToken();
    const res = await fetch(`${PAYPAL_API}/v2/checkout/orders/${data.orderId}/capture`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    const json = (await res.json()) as any;
    const status = res.ok ? String(json.status ?? "COMPLETED").toLowerCase() : "failed";
    await db.from("orders").update({ status }).eq("paypal_order_id", data.orderId);
    if (!res.ok) throw new Error(json?.message || "Payment could not be completed.");
    return { ok: true, status };
  });

export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    await assertOwner(db, context.userId);
    const { data } = await db.from("orders").select("*").order("created_at", { ascending: false }).limit(50);
    return data ?? [];
  });
