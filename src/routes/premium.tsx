import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Crown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { listMyPremiumScripts } from "@/lib/shop.functions";

export const Route = createFileRoute("/premium")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Premium Scripts · Babis Scripts" },
      { name: "description", content: "Access the premium Roblox scripts included in your purchased licenses." },
      { property: "og:title", content: "Premium Scripts · Babis Scripts" },
      { property: "og:description", content: "Your unlocked premium script loaders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PremiumPage,
});

function copy(label: string, text: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`));
}

function PremiumPage() {
  const list = useServerFn(listMyPremiumScripts);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
  }, []);
  const query = useQuery({ queryKey: ["premium-scripts"], queryFn: () => list(), enabled: signedIn === true });
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 py-10">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to shop</Link>
      <h1 className="mt-4 flex items-center gap-2 text-3xl font-bold"><Crown className="size-7 text-primary" /> Premium scripts</h1>
      <p className="mt-2 text-muted-foreground">Scripts unlocked by your licenses. Copy the loader, run it in your executor and enter your key.</p>

      {signedIn === false && (
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <p>Sign in to see your premium scripts.</p>
          <Button asChild className="mt-4"><Link to="/auth">Sign in</Link></Button>
        </div>
      )}
      {signedIn && query.isLoading && <p className="mt-8 text-muted-foreground">Loading…</p>}
      {signedIn && query.data && query.data.scripts.length === 0 && (
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <p>You don't have an active premium license yet.</p>
          <Button asChild className="mt-4"><Link to="/">Buy premium</Link></Button>
        </div>
      )}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {query.data?.scripts.map((s) => {
          const loader = `loadstring(game:HttpGet("${origin}/api/public/loader/${s.publicId}", true))()`;
          return (
            <div key={s.id} className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-lg font-semibold">{s.name}</h2>
              {s.description && <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>}
              <pre className="mt-3 overflow-x-auto rounded-md bg-muted p-3 text-xs">{loader}</pre>
              <p className="mt-2 text-xs text-muted-foreground">Key: <span className="font-mono">{s.licenseKey}</span>{s.expiresAt ? ` · expires ${new Date(s.expiresAt).toLocaleDateString()}` : " · Lifetime"}</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => copy("Loader", loader)}><Copy /> Copy loader</Button>
                <Button size="sm" variant="outline" onClick={() => copy("Key", s.licenseKey)}><Copy /> Copy key</Button>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
