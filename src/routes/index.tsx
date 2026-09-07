import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronDown,
  Copy,
  Instagram,
  Link2,
  LogIn,
  MessageSquare,
  Menu,
  Pencil,
  Play,
  Plus,
  Shield,
  Star,
  Trash2,
  X,
  Youtube,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  deleteReview,
  getSiteContent,
  getViewerState,
  registerVisitor,
  saveReview,
  saveSiteContent,
} from "@/lib/shop.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Babis Script — Premium Roblox Scripts & Lifetime Keys" },
      {
        name: "description",
        content:
          "Babis Script premium shop: copy Roblox scripts in one click, browse features and videos, read player reviews and grab lifetime or weekly license keys.",
      },
      { property: "og:title", content: "Babis Script — Premium Roblox Scripts & Lifetime Keys" },
      {
        property: "og:description",
        content: "One-click script copies, premium license keys, videos, reviews and FAQ from the Babis Script team.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ShopPage,
});

type Row = Record<string, any>;

const SECTIONS: { key: string; label: string }[] = [
  { key: "scripts", label: "Scripts" },
  { key: "premium", label: "Premium" },
  { key: "videos", label: "Videos" },
  { key: "reviews", label: "Reviews" },
  { key: "faq", label: "FAQ" },
  { key: "social", label: "Social" },
];

const usernameToEmail = (u: string) => `${u.trim().toLowerCase()}@babis.local`;

function embedUrl(url: string) {
  if (!url) return "";
  const yt = url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([A-Za-z0-9_-]{6,})/);
  if (yt && /youtu/.test(url)) return `https://www.youtube.com/embed/${yt[1]}`;
  return url;
}

function ShopPage() {
  const queryClient = useQueryClient();
  const loadContent = useServerFn(getSiteContent);
  const loadViewer = useServerFn(getViewerState);
  const mutateContent = useServerFn(saveSiteContent);
  const submitReview = useServerFn(saveReview);
  const removeReview = useServerFn(deleteReview);
  const register = useServerFn(registerVisitor);

  const [menuOpen, setMenuOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const [form, setForm] = useState({ username: "", password: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [reviewDraft, setReviewDraft] = useState({ rating: 5, body: "" });
  const [editor, setEditor] = useState<{ table: string; row: Row | null } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(Boolean(session));
      queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient]);

  const content = useQuery({ queryKey: ["site-content"], queryFn: () => loadContent() });
  const viewer = useQuery({
    queryKey: ["viewer", signedIn],
    queryFn: () => loadViewer(),
    enabled: signedIn,
    retry: false,
  });

  const data = (content.data ?? {}) as Row;
  const items: Row[] = data.items ?? [];
  const plans: Row[] = data.plans ?? [];
  const faq: Row[] = data.faq ?? [];
  const videos: Row[] = data.videos ?? [];
  const links: Row[] = data.links ?? [];
  const reviews: Row[] = data.reviews ?? [];
  const tabs: Row[] = (data.tabs ?? []).filter((t: Row) => t.is_published);
  const discord: string = data.discordInviteUrl ?? "https://discord.gg/75auNNfmhS";
  const isOwner = Boolean((viewer.data as Row | undefined)?.isOwner);
  const viewerId = (viewer.data as Row | undefined)?.userId as string | undefined;

  const navTabs = useMemo(
    () => (tabs.length ? tabs.map((t) => ({ key: t.section_key, label: t.label })) : SECTIONS),
    [tabs],
  );

  const save = useMutation({
    mutationFn: (payload: any) => mutateContent({ data: payload }),
    onSuccess: () => {
      toast.success("Saved");
      setEditor(null);
      queryClient.invalidateQueries({ queryKey: ["site-content"] });
    },
    onError: (error: any) => toast.error("Could not save", { description: error.message }),
  });

  async function copy(value: string, id: string) {
    if (!value) return toast.error("Nothing to copy yet");
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const area = document.createElement("textarea");
      area.value = value;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
    }
    setCopied(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied((c) => (c === id ? null : c)), 1600);
  }

  async function handleAuth(event: React.FormEvent) {
    event.preventDefault();
    const u = form.username.trim();
    if (u.length < 3) return toast.error("Username must be at least 3 characters");
    if (form.password.length < 6) return toast.error("Password must be at least 6 characters");
    if (authMode === "signup" && form.password !== form.confirm) return toast.error("Passwords do not match");
    setBusy(true);
    try {
      const email = usernameToEmail(u);
      if (authMode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password: form.password });
        if (error) throw error;
        await supabase.auth.signInWithPassword({ email, password: form.password });
        await register({ data: { username: u } });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: form.password });
        if (error) throw error;
      }
      toast.success(authMode === "signup" ? "Account created" : "Welcome back");
      setAuthOpen(false);
      setForm({ username: "", password: "", confirm: "" });
    } catch (error: any) {
      toast.error("Authentication failed", { description: error.message });
    } finally {
      setBusy(false);
    }
  }

  const reviewMutation = useMutation({
    mutationFn: () => submitReview({ data: { rating: reviewDraft.rating, body: reviewDraft.body.trim() } }),
    onSuccess: () => {
      toast.success("Review posted");
      setReviewDraft({ rating: 5, body: "" });
      queryClient.invalidateQueries({ queryKey: ["site-content"] });
    },
    onError: (error: any) => toast.error("Could not post review", { description: error.message }),
  });

  const reviewDelete = useMutation({
    mutationFn: (id: string) => removeReview({ data: { id } }),
    onSuccess: () => {
      toast.success("Review removed");
      queryClient.invalidateQueries({ queryKey: ["site-content"] });
    },
    onError: (error: any) => toast.error("Could not remove", { description: error.message }),
  });

  const averageRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length).toFixed(1)
    : "—";

  function scrollTo(key: string) {
    setMenuOpen(false);
    document.getElementById(key)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="shop-aurora" aria-hidden />

      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button
            className="hamburger group"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <span /><span /><span />
          </button>
          <div className="flex items-center gap-2 font-semibold tracking-tight">
            <Shield className="size-5 text-primary" />
            Babis Script
          </div>
          <div className="flex items-center gap-2">
            {signedIn ? (
              isOwner ? (
                <Button asChild size="sm" variant="outline">
                  <Link to="/panel">Panel</Link>
                </Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => supabase.auth.signOut()}>
                  Sign out
                </Button>
              )
            ) : (
              <Button size="sm" onClick={() => { setAuthMode("signup"); setAuthOpen(true); }}>
                <LogIn className="mr-1 size-4" /> Account
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Slide-in menu */}
      <div className={`shop-drawer-backdrop ${menuOpen ? "is-open" : ""}`} onClick={() => setMenuOpen(false)} />
      <nav className={`shop-drawer ${menuOpen ? "is-open" : ""}`}>
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-sm font-semibold text-muted-foreground">Menu</span>
          <button onClick={() => setMenuOpen(false)} aria-label="Close menu">
            <X className="size-5" />
          </button>
        </div>
        <div className="flex flex-col gap-1 px-3">
          {navTabs.map((tab, index) => (
            <button
              key={tab.key + index}
              className="shop-drawer-link"
              style={{ animationDelay: `${index * 45}ms` }}
              onClick={() => scrollTo(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {isOwner ? (
          <div className="mt-4 border-t border-border px-3 pt-4">
            <Button className="w-full" size="sm" variant="outline" onClick={() => { setMenuOpen(false); setEditor({ table: "site_tabs", row: null }); }}>
              <Plus className="mr-1 size-4" /> Add menu tab
            </Button>
          </div>
        ) : null}
      </nav>

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-4 pb-14 pt-16 text-center sm:px-6 sm:pt-24">
        <div className="reveal inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-1.5 text-xs text-muted-foreground">
          <span className="size-2 animate-pulse rounded-full bg-primary" /> Instant license delivery
        </div>
        <h1 className="reveal mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-6xl" style={{ animationDelay: "80ms" }}>
          Babis Script <span className="shop-gradient-text">Premium Shop</span>
        </h1>
        <p className="reveal mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg" style={{ animationDelay: "160ms" }}>
          Copy any script in one tap, unlock every premium feature with a license key, and join thousands of players on Discord.
        </p>
        <div className="reveal mt-8 flex flex-wrap justify-center gap-3" style={{ animationDelay: "240ms" }}>
          <Button size="lg" onClick={() => scrollTo("scripts")}>Browse scripts</Button>
          <Button size="lg" variant="outline" onClick={() => scrollTo("premium")}>See premium pricing</Button>
        </div>
      </section>

      {/* Scripts */}
      <Section id="scripts" title="Scripts" subtitle="Tap copy and paste it in your executor." onAdd={isOwner ? () => setEditor({ table: "shop_items", row: null }) : undefined}>
        {items.length === 0 ? <Empty text="No scripts published yet." /> : null}
        <div className="grid gap-5 md:grid-cols-2">
          {items.map((item, index) => (
            <article key={item.id} className="reveal shop-card" style={{ animationDelay: `${index * 60}ms` }}>
              {item.video_url ? (
                <div className="mb-4 aspect-video w-full overflow-hidden rounded-lg border border-border bg-muted">
                  <iframe src={embedUrl(item.video_url)} title={item.title} className="size-full" allowFullScreen loading="lazy" />
                </div>
              ) : null}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  {item.badge ? <span className="shop-badge">{item.badge}</span> : null}
                </div>
                {item.price_label ? <span className="text-sm font-semibold text-primary">{item.price_label}</span> : null}
              </div>
              {item.description ? <p className="mt-2 text-sm text-muted-foreground">{item.description}</p> : null}
              {(item.features ?? []).length ? (
                <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                  {(item.features as string[]).map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {f}
                    </li>
                  ))}
                </ul>
              ) : null}
              <Button className="mt-4 w-full" onClick={() => copy(item.loader_command, item.id)}>
                {copied === item.id ? <Check className="mr-1 size-4" /> : <Copy className="mr-1 size-4" />}
                {copied === item.id ? "Copied!" : "Copy script"}
              </Button>
              <OwnerRowActions owner={isOwner} onEdit={() => setEditor({ table: "shop_items", row: item })} onDelete={() => save.mutate({ table: "shop_items", op: "delete", id: item.id })} />
            </article>
          ))}
        </div>
      </Section>

      {/* Premium */}
      <Section id="premium" title="Premium" subtitle="Instant keys, delivered on Discord." onAdd={isOwner ? () => setEditor({ table: "pricing_plans", row: null }) : undefined}>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {plans.filter((p) => p.is_published || isOwner).map((plan, index) => (
            <article key={plan.id} className={`reveal shop-card ${plan.highlight ? "shop-card-highlight" : ""}`} style={{ animationDelay: `${index * 60}ms` }}>
              <div className="text-2xl">{plan.emoji}</div>
              <h3 className="mt-2 text-base font-semibold">{plan.name}</h3>
              <div className="mt-1 text-2xl font-bold text-primary">{plan.price_label}</div>
              <div className="text-xs text-muted-foreground">{plan.subtitle}</div>
              <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                {(plan.perks ?? []).map((perk: string) => (
                  <li key={perk} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {perk}
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-5 w-full" variant={plan.highlight ? "default" : "outline"}>
                <a href={plan.cta_url || discord} target="_blank" rel="noreferrer">{plan.cta_label || "Get it on Discord"}</a>
              </Button>
              <OwnerRowActions owner={isOwner} onEdit={() => setEditor({ table: "pricing_plans", row: plan })} onDelete={() => save.mutate({ table: "pricing_plans", op: "delete", id: plan.id })} />
            </article>
          ))}
        </div>
      </Section>

      {/* Videos */}
      <Section id="videos" title="Videos" subtitle="Showcases and tutorials." onAdd={isOwner ? () => setEditor({ table: "site_videos", row: null }) : undefined}>
        {videos.length === 0 ? <Empty text="No videos yet." /> : null}
        <div className="grid gap-5 md:grid-cols-2">
          {videos.map((video, index) => (
            <article key={video.id} className="reveal shop-card" style={{ animationDelay: `${index * 60}ms` }}>
              <div className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-muted">
                <iframe src={embedUrl(video.video_url)} title={video.title || "Video"} className="size-full" allowFullScreen loading="lazy" />
              </div>
              <h3 className="mt-3 flex items-center gap-2 text-base font-semibold"><Play className="size-4 text-primary" />{video.title}</h3>
              {video.description ? <p className="mt-1 text-sm text-muted-foreground">{video.description}</p> : null}
              <OwnerRowActions owner={isOwner} onEdit={() => setEditor({ table: "site_videos", row: video })} onDelete={() => save.mutate({ table: "site_videos", op: "delete", id: video.id })} />
            </article>
          ))}
        </div>
      </Section>

      {/* Reviews */}
      <Section id="reviews" title="Reviews" subtitle={`${reviews.length} review(s) · average ${averageRating}/5`}>
        <div className="shop-card mb-6">
          {signedIn ? (
            <>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setReviewDraft((d) => ({ ...d, rating: n }))} aria-label={`${n} stars`}>
                    <Star className={`size-6 transition-transform hover:scale-110 ${n <= reviewDraft.rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                  </button>
                ))}
              </div>
              <Textarea
                className="mt-3"
                rows={3}
                placeholder="Tell everyone what you think about Babis Script…"
                value={reviewDraft.body}
                onChange={(e) => setReviewDraft((d) => ({ ...d, body: e.target.value }))}
              />
              <Button className="mt-3" disabled={reviewMutation.isPending} onClick={() => reviewMutation.mutate()}>
                Post review
              </Button>
            </>
          ) : (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-muted-foreground">Create a free account to leave a review.</p>
              <Button onClick={() => { setAuthMode("signup"); setAuthOpen(true); }}>Create account</Button>
            </div>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {reviews.map((review, index) => (
            <article key={review.id} className="reveal shop-card" style={{ animationDelay: `${index * 40}ms` }}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{review.author_name}</span>
                <span className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`size-4 ${i < Number(review.rating) ? "fill-primary text-primary" : "text-muted-foreground/40"}`} />
                  ))}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{review.body}</p>
              {isOwner || review.user_id === viewerId ? (
                <button className="mt-3 inline-flex items-center gap-1 text-xs text-destructive" onClick={() => reviewDelete.mutate(review.id)}>
                  <Trash2 className="size-3" /> Delete
                </button>
              ) : null}
            </article>
          ))}
        </div>
      </Section>

      {/* FAQ */}
      <Section id="faq" title="FAQ" subtitle="Everything you need to know." onAdd={isOwner ? () => setEditor({ table: "site_faq", row: null }) : undefined}>
        {faq.length === 0 ? <Empty text="No questions yet." /> : null}
        <div className="space-y-3">
          {faq.map((entry, index) => (
            <div key={entry.id} className="reveal shop-card !p-0" style={{ animationDelay: `${index * 40}ms` }}>
              <button
                className="flex w-full items-center justify-between gap-3 p-5 text-left font-medium"
                onClick={() => setOpenFaq((c) => (c === entry.id ? null : entry.id))}
              >
                {entry.question}
                <ChevronDown className={`size-5 shrink-0 transition-transform duration-300 ${openFaq === entry.id ? "rotate-180 text-primary" : ""}`} />
              </button>
              <div className={`faq-answer ${openFaq === entry.id ? "is-open" : ""}`}>
                <div className="px-5 pb-5 text-sm text-muted-foreground">{entry.answer}</div>
              </div>
              <OwnerRowActions owner={isOwner} className="px-5 pb-4" onEdit={() => setEditor({ table: "site_faq", row: entry })} onDelete={() => save.mutate({ table: "site_faq", op: "delete", id: entry.id })} />
            </div>
          ))}
        </div>
      </Section>

      {/* Social */}
      <Section id="social" title="Social media" subtitle="Follow Babis Script everywhere." onAdd={isOwner ? () => setEditor({ table: "site_links", row: null }) : undefined}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((link, index) => {
            const Icon = link.platform === "youtube" ? Youtube : link.platform === "instagram" ? Instagram : link.platform === "discord" ? MessageSquare : Link2;
            return (
              <article key={link.id} className="reveal shop-card" style={{ animationDelay: `${index * 50}ms` }}>
                <a href={link.url} target="_blank" rel="noreferrer" className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="size-5" /></span>
                  <span>
                    <span className="block text-sm font-semibold">{link.label || link.platform}</span>
                    <span className="block text-xs text-muted-foreground">{link.description}</span>
                  </span>
                </a>
                <OwnerRowActions owner={isOwner} onEdit={() => setEditor({ table: "site_links", row: link })} onDelete={() => save.mutate({ table: "site_links", op: "delete", id: link.id })} />
              </article>
            );
          })}
          <a href={discord} target="_blank" rel="noreferrer" className="reveal shop-card flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><MessageSquare className="size-5" /></span>
            <span>
              <span className="block text-sm font-semibold">Discord</span>
              <span className="block text-xs text-muted-foreground">Buy keys and get support</span>
            </span>
          </a>
        </div>
      </Section>

      <footer className="border-t border-border/60 px-4 py-10 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Babis Script · <Link to="/auth" className="underline">Staff sign in</Link>
      </footer>

      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        mode={authMode}
        setMode={setAuthMode}
        form={form}
        setForm={setForm}
        busy={busy}
        onSubmit={handleAuth}
      />

      <ContentEditor
        editor={editor}
        onClose={() => setEditor(null)}
        onSave={(table, row, values) =>
          save.mutate(row ? { table, op: "update", id: row.id, values } : { table, op: "insert", values })
        }
      />
    </main>
  );
}

function Section({ id, title, subtitle, children, onAdd }: { id: string; title: string; subtitle?: string; children: React.ReactNode; onAdd?: () => void }) {
  return (
    <section id={id} className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 sm:px-6">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {onAdd ? (
          <Button size="sm" variant="outline" onClick={onAdd}>
            <Plus className="mr-1 size-4" /> Add
          </Button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{text}</p>;
}

function OwnerRowActions({ owner, onEdit, onDelete, className = "" }: { owner: boolean; onEdit: () => void; onDelete: () => void; className?: string }) {
  if (!owner) return null;
  return (
    <div className={`mt-3 flex gap-2 ${className}`}>
      <Button size="sm" variant="ghost" onClick={onEdit}><Pencil className="mr-1 size-3" /> Edit</Button>
      <Button size="sm" variant="ghost" onClick={onDelete}><Trash2 className="mr-1 size-3" /> Delete</Button>
    </div>
  );
}

const FIELDS: Record<string, { key: string; label: string; type?: "text" | "textarea" | "list" | "number" | "bool" }[]> = {
  shop_items: [
    { key: "title", label: "Script name" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "features", label: "Features (one per line)", type: "list" },
    { key: "loader_command", label: "Loader command", type: "textarea" },
    { key: "video_url", label: "Video URL" },
    { key: "price_label", label: "Price label" },
    { key: "badge", label: "Badge" },
    { key: "sort_order", label: "Order", type: "number" },
  ],
  pricing_plans: [
    { key: "emoji", label: "Emoji" },
    { key: "name", label: "Plan name" },
    { key: "price_label", label: "Price" },
    { key: "subtitle", label: "Subtitle" },
    { key: "perks", label: "Perks (one per line)", type: "list" },
    { key: "cta_label", label: "Button label" },
    { key: "cta_url", label: "Button link" },
    { key: "highlight", label: "Highlight (true/false)", type: "bool" },
    { key: "sort_order", label: "Order", type: "number" },
  ],
  site_faq: [
    { key: "question", label: "Question" },
    { key: "answer", label: "Answer", type: "textarea" },
    { key: "sort_order", label: "Order", type: "number" },
  ],
  site_videos: [
    { key: "title", label: "Title" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "video_url", label: "Video URL" },
    { key: "sort_order", label: "Order", type: "number" },
  ],
  site_links: [
    { key: "platform", label: "Platform (youtube / tiktok / instagram / discord / link)" },
    { key: "label", label: "Label" },
    { key: "description", label: "Description" },
    { key: "url", label: "URL" },
    { key: "sort_order", label: "Order", type: "number" },
  ],
  site_tabs: [
    { key: "label", label: "Tab label" },
    { key: "section_key", label: "Section (scripts / premium / videos / reviews / faq / social)" },
    { key: "sort_order", label: "Order", type: "number" },
  ],
};

function ContentEditor({
  editor,
  onClose,
  onSave,
}: {
  editor: { table: string; row: Row | null } | null;
  onClose: () => void;
  onSave: (table: string, row: Row | null, values: Row) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!editor) return;
    const fields = FIELDS[editor.table] ?? [];
    const next: Record<string, string> = {};
    for (const field of fields) {
      const raw = editor.row?.[field.key];
      next[field.key] = field.type === "list" ? (Array.isArray(raw) ? raw.join("\n") : "") : raw == null ? "" : String(raw);
    }
    setValues(next);
  }, [editor]);

  if (!editor) return null;
  const fields = FIELDS[editor.table] ?? [];

  function submit() {
    const payload: Row = {};
    for (const field of fields) {
      const value = values[field.key] ?? "";
      if (field.type === "list") payload[field.key] = value.split("\n").map((l) => l.trim()).filter(Boolean);
      else if (field.type === "number") payload[field.key] = Number(value) || 0;
      else if (field.type === "bool") payload[field.key] = value.trim().toLowerCase() === "true";
      else payload[field.key] = value;
    }
    onSave(editor!.table, editor!.row, payload);
  }

  return (
    <Dialog open onOpenChange={(open) => (!open ? onClose() : null)}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editor.row ? "Edit" : "Add"} · {editor.table.replace("_", " ")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {fields.map((field) => (
            <div key={field.key}>
              <label className="mb-1 block text-xs text-muted-foreground">{field.label}</label>
              {field.type === "textarea" || field.type === "list" ? (
                <Textarea rows={field.type === "list" ? 4 : 3} value={values[field.key] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))} />
              ) : (
                <Input value={values[field.key] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))} />
              )}
            </div>
          ))}
          <Button className="w-full" onClick={submit}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AuthDialog({
  open,
  onOpenChange,
  mode,
  setMode,
  form,
  setForm,
  busy,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "signin" | "signup";
  setMode: (mode: "signin" | "signup") => void;
  form: { username: string; password: string; confirm: string };
  setForm: React.Dispatch<React.SetStateAction<{ username: string; password: string; confirm: string }>>;
  busy: boolean;
  onSubmit: (event: React.FormEvent) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "signup" ? "Create your account" : "Sign in"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={onSubmit}>
          <Input placeholder="Username" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
          <Input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          {mode === "signup" ? (
            <Input type="password" placeholder="Confirm password" value={form.confirm} onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))} />
          ) : null}
          <Button className="w-full" type="submit" disabled={busy}>
            {mode === "signup" ? "Create account" : "Sign in"}
          </Button>
          <button type="button" className="w-full text-center text-xs text-muted-foreground underline" onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>
            {mode === "signup" ? "I already have an account" : "I need an account"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
