import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, RotateCcw, KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { claimOrder, listMyLicenses, resetLicenseUser } from "@/lib/shop.functions";

export const Route = createFileRoute("/licenses")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "My Licenses · Babis Scripts" },
      { name: "description", content: "View your purchased Babis Scripts licenses, durations and reset the linked Roblox user." },
      { property: "og:title", content: "My Licenses · Babis Scripts" },
      { property: "og:description", content: "Manage your purchased script licenses." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LicensesPage,
});

function timeLeft(expiresAt: string | null) {
  if (!expiresAt) return "Lifetime";
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  return d > 0 ? `${d}d ${h}h left` : `${h}h ${Math.floor((ms % 3_600_000) / 60_000)}m left`;
}

function LicensesPage() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const list = useServerFn(listMyLicenses);
  const claim = useServerFn(claimOrder);
  const reset = useServerFn(resetLicenseUser);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(Boolean(s)));
    return () => data.subscription.unsubscribe();
  }, []);

  const query = useQuery({
    queryKey: ["my-licenses"],
    enabled: signedIn === true,
    queryFn: async () => {
      let ids: string[] = [];
      try { ids = JSON.parse(localStorage.getItem("babis-orders") || "[]"); } catch { /* ignore */ }
      const left: string[] = [];
      for (const id of ids) {
        try { await claim({ data: { paypalOrderId: id } }); } catch { left.push(id); }
      }
      localStorage.setItem("babis-orders", JSON.stringify(left));
      return list();
    },
  });

  const doReset = async (key: string) => {
    setBusy(key);
    try {
      await reset({ data: { key } });
      toast.success("User reset", { description: "You can now use this license with a new Roblox account." });
      query.refetch();
    } catch (e) {
      toast.error("Reset failed", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const licenses = (query.data as any)?.licenses ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-lg font-semibold">Babis <span className="text-primary">Scripts</span></Link>
          <Button variant="outline" size="sm" asChild><Link to="/">Back to shop</Link></Button>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">My licenses</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Everything you bought. Each license works for 1 Roblox user — reset it to switch to another account.
        </p>

        {signedIn === false && (
          <div className="rounded-xl border border-border p-8 text-center">
            <p className="mb-4">Sign in or create an account to see your licenses.</p>
            <Button asChild><Link to="/">Go to shop and sign in</Link></Button>
          </div>
        )}

        {signedIn && query.isLoading && <p className="text-muted-foreground">Loading…</p>}
        {signedIn && !query.isLoading && licenses.length === 0 && (
          <div className="rounded-xl border border-border p-8 text-center text-muted-foreground">
            No licenses yet. Purchases made while on this device are linked automatically after you sign in.
          </div>
        )}

        <div className="grid gap-4">
          {licenses.map((l: any) => (
            <div key={l.key} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <KeyRound className="size-4 text-primary" /> {l.planName}
                  </div>
                  <div className="text-sm text-muted-foreground">{l.allScripts ? "All paid scripts" : l.scriptName}</div>
                </div>
                <span className="rounded-full border border-border px-3 py-1 text-xs capitalize">{l.status}</span>
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-md bg-muted px-3 py-2 font-mono text-sm">
                <span className="flex-1 break-all">{l.key}</span>
                <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(l.key); toast.success("Key copied"); }}>
                  <Copy className="size-4" />
                </Button>
              </div>
              <div className="mt-4 grid gap-1 text-sm text-muted-foreground sm:grid-cols-3">
                <div>Duration: <span className="text-foreground">{timeLeft(l.expiresAt)}</span></div>
                <div>Purchased: <span className="text-foreground">{new Date(l.purchasedAt).toLocaleDateString()}</span></div>
                <div>Uses: <span className="text-foreground">{l.usageCount}</span></div>
              </div>
              <div className="mt-4">
                <Button variant="outline" size="sm" disabled={busy === l.key || l.status !== "active"} onClick={() => doReset(l.key)}>
                  <RotateCcw className="size-4" /> Reset user
                </Button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
