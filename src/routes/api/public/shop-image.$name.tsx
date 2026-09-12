import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/shop-image/$name")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const name = String((params as { name: string }).name ?? "");
        if (!/^[A-Za-z0-9._-]{4,120}$/.test(name)) return new Response("Not found", { status: 404 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from("shop-images").download(name);
        if (error || !data) return new Response("Not found", { status: 404 });
        return new Response(await data.arrayBuffer(), {
          headers: {
            "Content-Type": data.type || "image/png",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
