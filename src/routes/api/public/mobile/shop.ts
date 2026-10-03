import { createFileRoute } from "@tanstack/react-router";
import { fetchKeymasterApi, json } from "@/lib/mobile-api.server";

type ShopRow = Record<string, unknown>;

function publicRows(value: unknown, fields: readonly string[]): ShopRow[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const row = entry as ShopRow;
    return [
      Object.fromEntries(fields.filter((field) => field in row).map((field) => [field, row[field]])),
    ];
  });
}

function publicValue(value: unknown, fields: readonly string[]): ShopRow | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as ShopRow;
  return Object.fromEntries(fields.filter((field) => field in row).map((field) => [field, row[field]]));
}

export const Route = createFileRoute("/api/public/mobile/shop")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const upstream = await fetchKeymasterApi(request, "/api/public/mobile/shop", {
          method: "GET",
        });
        let result: Record<string, unknown>;
        try {
          result = (await upstream.json()) as Record<string, unknown>;
        } catch {
          return json({ error: "The Keymaster API returned an invalid response." }, 502);
        }
        if (!upstream.ok) {
          const error =
            typeof result.error === "string" ? result.error : "Shop data is unavailable.";
          return json({ error }, upstream.status);
        }

        const settings = publicValue({ discord_invite_url: result.discord_invite_url }, [
          "discord_invite_url",
        ]);

        return json({
          items: publicRows(result.items, [
            "id", "title", "description", "features", "video_url", "image_url", "price_label",
            "price_cents", "currency", "badge", "sort_order", "is_published",
          ]),
          plans: publicRows(result.plans, [
            "id", "name", "price_label", "price_cents", "currency", "subtitle", "perks",
            "highlight", "emoji", "cta_label", "requires_script_choice", "sort_order",
            "is_published",
          ]),
          faq: publicRows(result.faq, ["id", "question", "answer", "sort_order"]),
          videos: publicRows(result.videos, ["id", "title", "description", "video_url", "sort_order"]),
          links: publicRows(result.links, ["id", "platform", "label", "description", "url", "sort_order"]),
          tabs: publicRows(result.tabs, ["id", "label", "section_key", "sort_order"]),
          discord_invite_url:
            typeof settings?.discord_invite_url === "string" ? settings.discord_invite_url : null,
        });
      },
    },
  },
});
