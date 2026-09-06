import { createFileRoute } from "@tanstack/react-router";

/**
 * Universal loader: one loadstring for every game. It sends the current
 * PlaceId / GameId and the server picks the script linked to that Roblox game.
 */
export const Route = createFileRoute("/api/public/hub")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { buildLoaderSource, getAppealUrl, isBlockedLoaderClient } = await import("@/lib/loader-source.server");
        if (isBlockedLoaderClient(request.headers.get("user-agent") || "")) {
          return new Response("Forbidden", {
            status: 403,
            headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
          });
        }
        const origin = new URL(request.url).origin;

        const source = buildLoaderSource({
          runUrl: `${origin}/api/public/run/auto`,
          heartbeatUrl: `${origin}/api/public/heartbeat`,
          appealUrl: await getAppealUrl(),
          cacheFile: "babis_license_hub.txt",
          showKeyBox: true,
          alwaysAutoLaunch: true,
          initialStatus: "Detecting this game...",
        });

        return new Response(source, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-store",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }),
    },
  },
});
