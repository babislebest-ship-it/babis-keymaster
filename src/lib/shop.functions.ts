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
  const [items, plans, faq, videos, links, tabs, reviews, settings, scripts] = await Promise.all([
    db.from("shop_items").select("*").order("sort_order"),
    db.from("pricing_plans").select("*").order("sort_order"),
    db.from("site_faq").select("*").order("sort_order"),
    db.from("site_videos").select("*").order("sort_order"),
    db.from("site_links").select("*").order("sort_order"),
    db.from("site_tabs").select("*").order("sort_order"),
    db.from("site_reviews").select("*").order("created_at", { ascending: false }).limit(60),
    db.from("app_settings").select("discord_invite_url").limit(1).maybeSingle(),
    db.from("scripts").select("id,name,is_active,require_license").eq("is_active", true).eq("require_license", true).order("name"),
  ]);
  return {
    shopItems: items.data ?? [],
    plans: plans.data ?? [],
    faq: faq.data ?? [],
    videos: videos.data ?? [],
    links: links.data ?? [],
    tabs: tabs.data ?? [],
    reviews: reviews.data ?? [],
    scripts: (scripts.data ?? []).map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })),
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
        scriptId: z.string().uuid().nullable().optional(),
      }),
    )
    .min(1)
    .max(20),
  buyerName: z.string().trim().max(80).optional(),
  buyerEmail: z.string().trim().email().max(120).optional(),
  discordTag: z.string().trim().max(80).optional(),
});

type OrderLine = {
  kind: "shop_items" | "pricing_plans";
  itemId: string;
  name: string;
  unit: number;
  quantity: number;
  scriptId: string | null;
  scriptName: string | null;
  durationMinutes: number | null;
  allScripts?: boolean;
};

function generateLicenseKey() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const block = () =>
    Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map((n) => alphabet[n % alphabet.length])
      .join("");
  return `BABIS-${block()}-${block()}-${block()}`;
}

export const createPaypalOrder = createServerFn({ method: "POST" })
  .inputValidator((input) => cartSchema.parse(input))
  .handler(async ({ data }) => {
    const db = await admin();
    const currency = "EUR";
    const lines: OrderLine[] = [];

    for (const line of data.items) {
      const { data: row } = await db
        .from(line.kind)
        .select(
          line.kind === "shop_items"
            ? "id,title,price_cents,is_published"
            : "id,name,price_cents,is_published,license_duration_minutes,requires_script_choice",
        )
        .eq("id", line.id)
        .maybeSingle();
      if (!row || row.is_published === false) throw new Error("An item in your cart is no longer available.");
      const price = Number(row.price_cents ?? 0);
      if (price <= 0) throw new Error("This item is not purchasable online.");

      let scriptId: string | null = null;
      let scriptName: string | null = null;
      let allScripts = false;
      if (line.kind === "pricing_plans") {
        const mustChoose = row.requires_script_choice !== false;
        if (!mustChoose) {
          allScripts = true;
          scriptName = "All paid scripts";
        } else {
          if (!line.scriptId) throw new Error("Please choose the script for your premium plan.");
          const { data: script } = await db
            .from("scripts")
            .select("id,name,is_active,require_license")
            .eq("id", line.scriptId)
            .maybeSingle();
          if (!script || script.is_active === false || script.require_license === false)
            throw new Error("The selected script is not available.");
          scriptId = script.id;
          scriptName = script.name;
        }
      }

      lines.push({
        kind: line.kind,
        itemId: String(row.id),
        name: String(row.title ?? row.name ?? "Item").slice(0, 120),
        unit: price,
        quantity: line.quantity,
        scriptId,
        scriptName,
        allScripts,
        durationMinutes: line.kind === "pricing_plans" ? (row.license_duration_minutes ?? null) : null,
      });
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
              name: l.scriptName ? `${l.name} — ${l.scriptName}`.slice(0, 127) : l.name,
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

    // Automatic license delivery for paid premium plans.
    const { data: order } = await db
      .from("orders")
      .select("id,items,delivered_keys,buyer_name,discord_tag")
      .eq("paypal_order_id", data.orderId)
      .maybeSingle();

    const already = Array.isArray(order?.delivered_keys) ? order.delivered_keys : [];
    if (!order || already.length > 0) {
      return { ok: true, status, keys: already as Array<{ key: string; scriptName: string; planName: string }> };
    }

    const lines: OrderLine[] = Array.isArray(order.items) ? (order.items as OrderLine[]) : [];
    const keys: Array<{ key: string; scriptName: string; planName: string; expiresAt: string | null }> = [];

    for (const line of lines) {
      if (line.kind !== "pricing_plans") continue;
      const global = !line.scriptId && line.allScripts === true;
      if (!line.scriptId && !global) continue;
      const { data: script } = global
        ? await db
            .from("scripts")
            .select("id,owner_id,name")
            .eq("is_active", true)
            .eq("require_license", true)
            .order("created_at")
            .limit(1)
            .maybeSingle()
        : await db.from("scripts").select("id,owner_id,name").eq("id", line.scriptId).maybeSingle();
      if (!script) continue;
      for (let i = 0; i < Math.max(1, Number(line.quantity ?? 1)); i += 1) {
        const licenseKey = generateLicenseKey();
        const duration = line.durationMinutes ? Number(line.durationMinutes) : null;
        const expiresAt = duration ? new Date(Date.now() + duration * 60_000).toISOString() : null;
        const { error } = await db.from("script_licenses").insert({
          script_id: script.id,
          license_key: licenseKey,
          label: `${line.name} · ${order.discord_tag || order.buyer_name || "PayPal buyer"}`.slice(0, 120),
          status: "active",
          duration_minutes: duration,
          expires_at: expiresAt,
          max_users: 1,
          all_scripts: global,
          created_by: script.owner_id,
        });
        if (error) continue;
        keys.push({
          key: licenseKey,
          scriptName: global ? "All paid scripts" : script.name,
          planName: line.name,
          expiresAt,
        });
      }
    }

    if (keys.length > 0) {
      await db.from("orders").update({ delivered_keys: keys }).eq("id", order.id);
    }

    return { ok: true, status, keys };
  });


export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    await assertOwner(db, context.userId);
    const { data } = await db.from("orders").select("*").order("created_at", { ascending: false }).limit(50);
    return data ?? [];
  });

/* ------------------------------ Licenses ------------------------------ */

export const claimOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ paypalOrderId: z.string().trim().min(4).max(64) }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: order } = await db
      .from("orders")
      .select("id,user_id")
      .eq("paypal_order_id", data.paypalOrderId)
      .maybeSingle();
    if (!order) throw new Error("Order not found.");
    if (order.user_id && order.user_id !== context.userId) throw new Error("This order is already linked to another account.");
    if (!order.user_id) {
      const { error } = await db.from("orders").update({ user_id: context.userId }).eq("id", order.id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const listMyLicenses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    const { data: orders } = await db
      .from("orders")
      .select("id,paypal_order_id,status,delivered_keys,amount_cents,currency,created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);

    const rows: Array<{
      key: string;
      planName: string;
      scriptName: string;
      purchasedAt: string;
      status: string;
      expiresAt: string | null;
      usageCount: number;
      allScripts: boolean;
    }> = [];

    for (const order of orders ?? []) {
      const keys = Array.isArray(order.delivered_keys) ? order.delivered_keys : [];
      for (const entry of keys as Array<Record<string, any>>) {
        if (!entry?.key) continue;
        const { data: license } = await db
          .from("script_licenses")
          .select("status,expires_at,usage_count,all_scripts")
          .eq("license_key", entry.key)
          .maybeSingle();
        rows.push({
          key: String(entry.key),
          planName: String(entry.planName ?? "Premium"),
          scriptName: String(entry.scriptName ?? "Script"),
          purchasedAt: String(order.created_at),
          status: String(license?.status ?? "unknown"),
          expiresAt: (license?.expires_at ?? entry.expiresAt ?? null) as string | null,
          usageCount: Number(license?.usage_count ?? 0),
          allScripts: Boolean(license?.all_scripts),
        });
      }
    }

    return { licenses: rows, orders: orders ?? [] };
  });

export const resetLicenseUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ key: z.string().trim().min(4).max(64) }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: orders } = await db.from("orders").select("delivered_keys").eq("user_id", context.userId);
    const owns = (orders ?? []).some((o: any) =>
      (Array.isArray(o.delivered_keys) ? o.delivered_keys : []).some((k: any) => k?.key === data.key),
    );
    if (!owns) throw new Error("This license is not linked to your account.");
    const { data: license } = await db.from("script_licenses").select("id,status").eq("license_key", data.key).maybeSingle();
    if (!license) throw new Error("License not found.");
    if (license.status !== "active") throw new Error("Only active licenses can be reset.");
    await db.from("license_seats").delete().eq("license_id", license.id);
    const { error } = await db
      .from("script_licenses")
      .update({ bound_player_user_id: null, bound_player_name: null, seat_count: 0 })
      .eq("id", license.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------ Uploads ------------------------------- */

export const uploadShopImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        fileName: z.string().trim().min(1).max(120),
        contentType: z.string().trim().min(3).max(80),
        dataBase64: z.string().min(10).max(8_000_000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = await admin();
    await assertOwner(db, context.userId);
    if (!data.contentType.startsWith("image/")) throw new Error("Only image files are allowed.");
    const extension = (data.fileName.split(".").pop() ?? "png").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "png";
    const objectName = `${crypto.randomUUID()}.${extension}`;
    const binary = Uint8Array.from(atob(data.dataBase64), (c) => c.charCodeAt(0));
    const { error } = await db.storage.from("shop-images").upload(objectName, binary, {
      contentType: data.contentType,
      upsert: false,
    });
    if (error) throw new Error(error.message);
    return { url: `/api/public/shop-image/${objectName}` };
  });
