import { createFileRoute } from "@tanstack/react-router";
import { json, verifyApiKey } from "@/lib/mobile-api.server";

export const Route = createFileRoute("/api/public/mobile/shop")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const denied = await verifyApiKey(request);
        if (denied) return denied;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;

        const [items, plans, faq, videos, links, tabs, settings] = await Promise.all([
          db
            .from("shop_items")
            .select("id, title, description, features, video_url, image_url, loader_command, price_label, price_cents, currency, badge, sort_order")
            .eq("is_published", true)
            .order("sort_order", { ascending: true }),
          db
            .from("pricing_plans")
            .select("id, name, price_label, price_cents, currency, subtitle, perks, highlight, emoji, cta_label, requires_script_choice, sort_order")
            .eq("is_published", true)
            .order("sort_order", { ascending: true }),
          db
            .from("site_faq")
            .select("id, question, answer, sort_order")
            .eq("is_published", true)
            .order("sort_order", { ascending: true }),
          db
            .from("site_videos")
            .select("id, title, description, video_url, sort_order")
            .eq("is_published", true)
            .order("sort_order", { ascending: true }),
          db
            .from("site_links")
            .select("id, platform, label, description, url, sort_order")
            .eq("is_published", true)
            .order("sort_order", { ascending: true }),
          db
            .from("site_tabs")
            .select("id, label, section_key, sort_order")
            .eq("is_published", true)
            .order("sort_order", { ascending: true }),
          db.from("app_settings").select("discord_invite_url").maybeSingle(),
        ]);

        return json({
          items: items.data ?? [],
          plans: plans.data ?? [],
          faq: faq.data ?? [],
          videos: videos.data ?? [],
          links: links.data ?? [],
          tabs: tabs.data ?? [],
          discord_invite_url: settings.data?.discord_invite_url ?? null,
        });
      },
    },
  },
});
