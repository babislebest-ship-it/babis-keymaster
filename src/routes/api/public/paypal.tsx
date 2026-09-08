import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const apiBase = () =>
  process.env["PAYPAL_ENV"] === "sandbox" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";

async function token() {
  const id = process.env["PAYPAL_CLIENT_ID"]!;
  const secret = process.env["PAYPAL_CLIENT_SECRET"]!;
  const res = await fetch(`${apiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const json: any = await res.json();
  if (!json.access_token) throw new Error("PayPal authentication failed");
  return json.access_token as string;
}

const bodySchema = z.object({
  action: z.enum(["create", "capture"]),
  orderId: z.string().max(64).optional(),
  items: z
    .array(z.object({ id: z.string().max(64), title: z.string().max(120), quantity: z.number().int().min(1).max(10) }))
    .max(20)
    .optional(),
  email: z.string().email().max(160).optional(),
  discord: z.string().max(80).optional(),
});

export const Route = createFileRoute("/api/public/paypal")({
  server: {
    handlers: {
      GET: async () =>
        Response.json({
          clientId: process.env["PAYPAL_CLIENT_ID"] ?? "",
          env: process.env["PAYPAL_ENV"] === "sandbox" ? "sandbox" : "live",
        }),
      POST: async ({ request }) => {
        let data: z.infer<typeof bodySchema>;
        try {
          data = bodySchema.parse(await request.json());
        } catch {
          return new Response("Invalid request", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (data.action === "create") {
          const wanted = data.items ?? [];
          if (!wanted.length) return new Response("Empty cart", { status: 400 });

          const [{ data: shopRows }, { data: planRows }] = await Promise.all([
            supabaseAdmin.from("shop_items").select("id, title, price_cents, currency").eq("is_published", true),
            supabaseAdmin.from("pricing_plans").select("id, name, price_cents, currency").eq("is_published", true),
          ]);
          const catalog = new Map<string, { title: string; price: number }>();
          for (const row of (shopRows ?? []) as any[])
            catalog.set(row.id, { title: row.title, price: row.price_cents ?? 0 });
          for (const row of (planRows ?? []) as any[])
            catalog.set(row.id, { title: row.name, price: row.price_cents ?? 0 });

          const lines = wanted
            .map((item) => {
              const match = catalog.get(item.id);
              if (!match || match.price <= 0) return null;
              return { id: item.id, title: match.title, quantity: item.quantity, unit_cents: match.price };
            })
            .filter(Boolean) as { id: string; title: string; quantity: number; unit_cents: number }[];
          if (!lines.length) return new Response("No purchasable items", { status: 400 });

          const total = lines.reduce((sum, line) => sum + line.unit_cents * line.quantity, 0);
          const access = await token();
          const res = await fetch(`${apiBase()}/v2/checkout/orders`, {
            method: "POST",
            headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              intent: "CAPTURE",
              purchase_units: [
                {
                  amount: {
                    currency_code: "USD",
                    value: (total / 100).toFixed(2),
                    breakdown: { item_total: { currency_code: "USD", value: (total / 100).toFixed(2) } },
                  },
                  items: lines.map((line) => ({
                    name: line.title.slice(0, 127),
                    quantity: String(line.quantity),
                    unit_amount: { currency_code: "USD", value: (line.unit_cents / 100).toFixed(2) },
                  })),
                },
              ],
            }),
          });
          const order: any = await res.json();
          if (!order.id) return new Response("Could not start checkout", { status: 502 });

          await supabaseAdmin.from("orders").insert({
            paypal_order_id: order.id,
            status: "created",
            items: lines,
            amount_cents: total,
            buyer_email: data.email ?? null,
            discord_tag: data.discord ?? null,
          } as any);
          return Response.json({ id: order.id });
        }

        if (!data.orderId) return new Response("Missing order", { status: 400 });
        const access = await token();
        const res = await fetch(`${apiBase()}/v2/checkout/orders/${data.orderId}/capture`, {
          method: "POST",
          headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
        });
        const captured: any = await res.json();
        const paid = captured?.status === "COMPLETED";
        await supabaseAdmin
          .from("orders")
          .update({
            status: paid ? "paid" : String(captured?.status ?? "failed").toLowerCase(),
            buyer_email: captured?.payer?.email_address ?? data.email ?? null,
            buyer_name:
              [captured?.payer?.name?.given_name, captured?.payer?.name?.surname].filter(Boolean).join(" ") || null,
            discord_tag: data.discord ?? null,
          } as any)
          .eq("paypal_order_id", data.orderId);
        return Response.json({ status: paid ? "paid" : "failed" });
      },
    },
  },
});
