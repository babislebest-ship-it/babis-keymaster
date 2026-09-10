import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronDown,
  Copy,
  Menu,
  Minus,
  Pencil,
  Plus,
  ShoppingCart,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  capturePaypalOrder,
  createPaypalOrder,
  deleteReview,
  deleteSiteContent,
  getPaypalConfig,
  getSiteContent,
  getViewerState,
  saveReview,
  saveSiteContent,
} from "@/lib/shop.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Babis Scripts — Premium Roblox Scripts & Keys" },
      {
        name: "description",
        content:
          "Copy Babis premium Roblox scripts in one click, watch showcases, read reviews and grab a premium subscription with PayPal, card, Apple Pay or Google Pay.",
      },
      { property: "og:title", content: "Babis Scripts — Premium Roblox Scripts & Keys" },
      {
        property: "og:description",
        content: "One-click script loaders, premium plans, showcases and reviews from the Babis community.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Storefront,
});

type Row = Record<string, any>;
type TableName = "shop_items" | "pricing_plans" | "site_faq" | "site_videos" | "site_links" | "site_tabs";

type FieldSpec = { key: string; label: string; type: "text" | "textarea" | "list" | "bool" | "number" };

const FIELDS: Record<TableName, FieldSpec[]> = {
  shop_items: [
    { key: "title", label: "Script name", type: "text" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "features", label: "Features (one per line)", type: "list" },
    { key: "loader_command", label: "Loader command", type: "textarea" },
    { key: "video_url", label: "Video link (optional)", type: "text" },
    { key: "image_url", label: "Image link (optional)", type: "text" },
    { key: "price_label", label: "Price label", type: "text" },
    { key: "price_cents", label: "Price in cents (0 = free)", type: "number" },
    { key: "badge", label: "Badge (optional)", type: "text" },
    { key: "sort_order", label: "Position", type: "number" },
    { key: "is_published", label: "Visible on the site", type: "bool" },
  ],
  pricing_plans: [
    { key: "name", label: "Plan name", type: "text" },
    { key: "emoji", label: "Emoji", type: "text" },
    { key: "price_label", label: "Price label", type: "text" },
    { key: "price_cents", label: "Price in cents", type: "number" },
    { key: "subtitle", label: "Subtitle", type: "text" },
    { key: "perks", label: "Perks (one per line)", type: "list" },
    { key: "license_duration_minutes", label: "License duration in minutes (empty = lifetime)", type: "number" },
    { key: "cta_label", label: "Button label", type: "text" },

    { key: "highlight", label: "Highlighted plan", type: "bool" },
    { key: "sort_order", label: "Position", type: "number" },
    { key: "is_published", label: "Visible on the site", type: "bool" },
  ],
  site_faq: [
    { key: "question", label: "Question", type: "text" },
    { key: "answer", label: "Answer", type: "textarea" },
    { key: "sort_order", label: "Position", type: "number" },
    { key: "is_published", label: "Visible on the site", type: "bool" },
  ],
  site_videos: [
    { key: "title", label: "Title", type: "text" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "video_url", label: "Video link (YouTube / TikTok)", type: "text" },
    { key: "sort_order", label: "Position", type: "number" },
    { key: "is_published", label: "Visible on the site", type: "bool" },
  ],
  site_links: [
    { key: "platform", label: "Platform (youtube, tiktok, instagram, discord…)", type: "text" },
    { key: "label", label: "Label", type: "text" },
    { key: "description", label: "Description", type: "text" },
    { key: "url", label: "Link", type: "text" },
    { key: "sort_order", label: "Position", type: "number" },
    { key: "is_published", label: "Visible on the site", type: "bool" },
  ],
  site_tabs: [
    { key: "label", label: "Menu label", type: "text" },
    { key: "section_key", label: "Section (scripts, premium, videos, reviews, faq, social)", type: "text" },
    { key: "sort_order", label: "Position", type: "number" },
    { key: "is_published", label: "Visible in the menu", type: "bool" },
  ],
};

const DEFAULT_TABS = [
  { section_key: "scripts", label: "Scripts" },
  { section_key: "premium", label: "Premium" },
  { section_key: "videos", label: "Videos" },
  { section_key: "reviews", label: "Reviews" },
  { section_key: "faq", label: "FAQ" },
  { section_key: "social", label: "Social" },
];

const money = (cents: number, currency = "EUR") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format((cents ?? 0) / 100);

function embedUrl(url: string) {
  if (!url) return "";
  const yt = url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([A-Za-z0-9_-]{6,})/);
  if (yt && url.includes("you")) return `https://www.youtube.com/embed/${yt[1]}`;
  return url;
}

type CartLine = {
  kind: "shop_items" | "pricing_plans";
  id: string;
  title: string;
  priceCents: number;
  quantity: number;
  scriptId?: string | null;
  scriptName?: string | null;
};
type DeliveredKey = { key: string; scriptName: string; planName: string; expiresAt?: string | null };

const lineKey = (l: { id: string; scriptId?: string | null }) => `${l.id}:${l.scriptId ?? ""}`;



function Storefront() {
  const queryClient = useQueryClient();
  const loadContent = useServerFn(getSiteContent);
  const loadViewer = useServerFn(getViewerState);
  const saveContentFn = useServerFn(saveSiteContent);
  const deleteContentFn = useServerFn(deleteSiteContent);
  const saveReviewFn = useServerFn(saveReview);
  const deleteReviewFn = useServerFn(deleteReview);

  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [planPicker, setPlanPicker] = useState<Row | null>(null);
  const [deliveredKeys, setDeliveredKeys] = useState<DeliveredKey[] | null>(null);

  const [editor, setEditor] = useState<{ table: TableName; row: Row } | null>(null);
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewBody, setReviewBody] = useState("");

  const content = useQuery({ queryKey: ["site-content"], queryFn: () => loadContent() });
  const viewer = useQuery({
    queryKey: ["viewer", signedIn],
    queryFn: () => loadViewer(),
    enabled: signedIn,
    retry: false,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(Boolean(session)));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("babis-cart");
      if (raw) setCart(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("babis-cart", JSON.stringify(cart));
    } catch { /* ignore */ }
  }, [cart]);

  const data = content.data as any;
  const isOwner = Boolean((viewer.data as any)?.isOwner);
  const viewerId = (viewer.data as any)?.userId as string | undefined;

  const visible = (rows: Row[]) => (isOwner ? rows : rows.filter((r) => r.is_published !== false));
  const scripts = visible(data?.shopItems ?? []);
  const plans = visible(data?.plans ?? []);
  const faq = visible(data?.faq ?? []);
  const videos = visible(data?.videos ?? []);
  const links = visible(data?.links ?? []);
  const reviews: Row[] = data?.reviews ?? [];
  const tabs = useMemo(() => {
    const rows = visible(data?.tabs ?? []);
    return rows.length ? rows : DEFAULT_TABS;
  }, [data, isOwner]);

  const saveMutation = useMutation({
    mutationFn: (payload: { table: TableName; id: string | null; row: Row }) =>
      saveContentFn({ data: { table: payload.table, id: payload.id, row: payload.row } }),
    onSuccess: () => {
      toast.success("Saved");
      setEditor(null);
      queryClient.invalidateQueries({ queryKey: ["site-content"] });
    },
    onError: (error) => toast.error("Could not save", { description: (error as Error).message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (payload: { table: TableName; id: string }) => deleteContentFn({ data: payload }),
    onSuccess: () => {
      toast.success("Deleted");
      queryClient.invalidateQueries({ queryKey: ["site-content"] });
    },
    onError: (error) => toast.error("Could not delete", { description: (error as Error).message }),
  });

  const reviewMutation = useMutation({
    mutationFn: () => saveReviewFn({ data: { rating: reviewRating, body: reviewBody.trim() } }),
    onSuccess: () => {
      toast.success("Thanks for your review!");
      setReviewBody("");
      queryClient.invalidateQueries({ queryKey: ["site-content"] });
    },
    onError: (error) => toast.error("Could not post the review", { description: (error as Error).message }),
  });

  async function copyText(label: string, value: string) {
    if (!value) return toast.error("Nothing to copy");
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
    toast.success(`${label} copied`);
  }

  function addToCart(line: Omit<CartLine, "quantity">) {
    setCart((current) => {
      const key = lineKey(line);
      const existing = current.find((l) => lineKey(l) === key);
      if (existing) return current.map((l) => (lineKey(l) === key ? { ...l, quantity: Math.min(20, l.quantity + 1) } : l));
      return [...current, { ...line, quantity: 1 }];
    });
    setCartOpen(true);
    toast.success("Added to cart", { description: line.scriptName ? `${line.title} — ${line.scriptName}` : line.title });
  }


  function scrollTo(key: string) {
    setMenuOpen(false);
    const el = document.getElementById(`section-${key}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const cartCount = cart.reduce((sum, l) => sum + l.quantity, 0);
  const cartTotal = cart.reduce((sum, l) => sum + l.quantity * l.priceCents, 0);

  const OwnerBar = ({ table, row }: { table: TableName; row?: Row }) =>
    isOwner ? (
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setEditor({ table, row: row ?? {} })}>
          <Pencil className="size-3.5" /> {row ? "Edit" : "Add"}
        </Button>
        {row?.id && (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              if (confirm("Delete this item?")) deleteMutation.mutate({ table, id: row.id });
            }}
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>
    ) : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="aurora" aria-hidden="true" />

      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button onClick={() => setMenuOpen(true)} className="menu-button" aria-label="Open menu">
            <Menu className="size-5" />
          </button>
          <div className="text-lg font-semibold tracking-tight">
            Babis <span className="text-primary">Scripts</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="relative" onClick={() => setCartOpen(true)}>
              <ShoppingCart className="size-4" />
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </Button>
            {signedIn ? (
              <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}>
                Sign out
              </Button>
            ) : (
              <Button size="sm" onClick={() => setAuthOpen(true)}>
                Sign in
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Slide-in menu */}
      <div className={`drawer-overlay ${menuOpen ? "is-open" : ""}`} onClick={() => setMenuOpen(false)} />
      <nav className={`drawer ${menuOpen ? "is-open" : ""}`} aria-hidden={!menuOpen}>
        <div className="flex items-center justify-between p-5">
          <div className="text-base font-semibold">Menu</div>
          <Button variant="ghost" size="icon" onClick={() => setMenuOpen(false)}>
            <X className="size-5" />
          </Button>
        </div>
        <div className="grid gap-1 px-3">
          {tabs.map((tab: Row, index: number) => (
            <div key={tab.id ?? tab.section_key} className="drawer-item" style={{ animationDelay: `${index * 45}ms` }}>
              <button onClick={() => scrollTo(tab.section_key)} className="flex-1 rounded-md px-3 py-3 text-left text-sm font-medium hover:bg-muted">
                {tab.label}
              </button>
              {isOwner && tab.id && (
                <button className="px-2 text-muted-foreground hover:text-foreground" onClick={() => setEditor({ table: "site_tabs", row: tab })}>
                  <Pencil className="size-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
        {isOwner && (
          <div className="mt-4 grid gap-2 px-5">
            <Button variant="outline" size="sm" onClick={() => setEditor({ table: "site_tabs", row: {} })}>
              <Plus className="size-4" /> Add menu tab
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/panel">Owner panel</Link>
            </Button>
          </div>
        )}
      </nav>

      <main className="relative mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        {/* Hero */}
        <section className="reveal py-16 text-center sm:py-24">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-1.5 text-xs text-muted-foreground">
            <span className="size-2 animate-pulse rounded-full bg-primary" /> Trusted Roblox script hub
          </div>
          <h1 className="text-balance text-4xl font-semibold leading-tight sm:text-6xl">
            Premium Roblox scripts, <span className="text-primary">one click away</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
            Copy a loader, grab a premium key, and get instant support. Undetected loaders, live moderation and fast updates.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" onClick={() => scrollTo("scripts")}>Browse scripts</Button>
            <Button size="lg" variant="outline" onClick={() => scrollTo("premium")}>See premium plans</Button>
          </div>
        </section>

        {/* Scripts */}
        <Section id="scripts" title="Scripts" subtitle="Copy the loader and paste it in your executor." action={<OwnerBar table="shop_items" />}>
          <div className="grid gap-4 md:grid-cols-2">
            {scripts.map((item, index) => (
              <article key={item.id} className="card-hover reveal app-panel rounded-xl p-5" style={{ animationDelay: `${index * 70}ms` }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{item.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  {item.badge && <span className="badge-pill">{item.badge}</span>}
                </div>
                {Array.isArray(item.features) && item.features.length > 0 && (
                  <ul className="mt-4 grid gap-1.5 text-sm">
                    {item.features.map((feature: string) => (
                      <li key={feature} className="flex items-start gap-2 text-muted-foreground">
                        <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {feature}
                      </li>
                    ))}
                  </ul>
                )}
                {item.image_url && (
                  <img src={item.image_url} alt={`${item.title} preview`} loading="lazy" className="mt-4 w-full rounded-lg border border-border object-cover" />
                )}
                {item.loader_command && (
                  <div className="mono-box mt-4 rounded-lg border border-border bg-muted p-3 font-mono text-xs text-muted-foreground">
                    {item.loader_command}
                  </div>
                )}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-primary">{item.price_label || (item.price_cents ? money(item.price_cents, item.currency) : "Free")}</div>
                  <div className="flex flex-wrap gap-2">
                    {item.loader_command && (
                      <Button size="sm" onClick={() => copyText("Loader", item.loader_command)}>
                        <Copy className="size-4" /> Copy loader
                      </Button>
                    )}
                    {item.price_cents > 0 && (
                      <Button size="sm" variant="outline" onClick={() => addToCart({ kind: "shop_items", id: item.id, title: item.title, priceCents: item.price_cents })}>
                        <ShoppingCart className="size-4" /> Add to cart
                      </Button>
                    )}
                    <OwnerBar table="shop_items" row={item} />
                  </div>
                </div>
              </article>
            ))}
            {scripts.length === 0 && <Empty text="No scripts published yet." />}
          </div>
        </Section>

        {/* Premium */}
        <Section id="premium" title="Premium plans" subtitle="Support the project and unlock every premium script." action={<OwnerBar table="pricing_plans" />}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan, index) => (
              <article
                key={plan.id}
                className={`card-hover reveal app-panel relative rounded-xl p-5 ${plan.highlight ? "ring-2 ring-primary" : ""}`}
                style={{ animationDelay: `${index * 70}ms` }}
              >
                {plan.highlight && <span className="badge-pill absolute -top-3 left-5">Most popular</span>}
                <div className="text-3xl">{plan.emoji}</div>
                <h3 className="mt-2 text-lg font-semibold">{plan.name}</h3>
                <div className="mt-1 text-2xl font-semibold text-primary">{plan.price_label || money(plan.price_cents, plan.currency)}</div>
                <p className="mt-1 text-sm text-muted-foreground">{plan.subtitle}</p>
                {Array.isArray(plan.perks) && (
                  <ul className="mt-4 grid gap-1.5 text-sm">
                    {plan.perks.map((perk: string) => (
                      <li key={perk} className="flex items-start gap-2 text-muted-foreground">
                        <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {perk}
                      </li>
                    ))}
                  </ul>
                )}
                <Button
                  className="mt-5 w-full"
                  variant={plan.highlight ? "default" : "outline"}
                  onClick={() => setPlanPicker(plan)}
                >
                  {plan.cta_label || "Buy now"}
                </Button>
                <div className="mt-3 flex justify-end">
                  <OwnerBar table="pricing_plans" row={plan} />
                </div>
              </article>
            ))}
            {plans.length === 0 && <Empty text="No plans published yet." />}
          </div>
        </Section>

        {/* Videos */}
        <Section id="videos" title="Showcases" subtitle="See the scripts in action." action={<OwnerBar table="site_videos" />}>
          <div className="grid gap-4 md:grid-cols-2">
            {videos.map((video, index) => (
              <article key={video.id} className="reveal app-panel overflow-hidden rounded-xl" style={{ animationDelay: `${index * 70}ms` }}>
                <div className="aspect-video w-full bg-muted">
                  <iframe
                    src={embedUrl(video.video_url)}
                    title={video.title}
                    loading="lazy"
                    allowFullScreen
                    className="size-full"
                  />
                </div>
                <div className="flex items-start justify-between gap-3 p-4">
                  <div>
                    <h3 className="font-semibold">{video.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{video.description}</p>
                  </div>
                  <OwnerBar table="site_videos" row={video} />
                </div>
              </article>
            ))}
            {videos.length === 0 && <Empty text="No videos yet." />}
          </div>
        </Section>

        {/* Reviews */}
        <Section id="reviews" title="Reviews" subtitle="Create an account to leave your review.">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="grid gap-3">
              {reviews.map((review, index) => (
                <article key={review.id} className="reveal app-panel rounded-xl p-4" style={{ animationDelay: `${index * 50}ms` }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold">{review.author_name}</div>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={`size-4 ${n <= review.rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                      ))}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{review.body}</p>
                  {(isOwner || review.user_id === viewerId) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-2"
                      onClick={() =>
                        deleteReviewFn({ data: { id: review.id } })
                          .then(() => queryClient.invalidateQueries({ queryKey: ["site-content"] }))
                          .catch((error: Error) => toast.error(error.message))
                      }
                    >
                      <Trash2 className="size-3.5" /> Delete
                    </Button>
                  )}
                </article>
              ))}
              {reviews.length === 0 && <Empty text="No reviews yet — be the first!" />}
            </div>
            <div className="app-panel h-fit rounded-xl p-4">
              <h3 className="font-semibold">Leave a review</h3>
              {signedIn ? (
                <>
                  <div className="mt-3 flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} onClick={() => setReviewRating(n)} aria-label={`${n} stars`}>
                        <Star className={`size-6 transition ${n <= reviewRating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                      </button>
                    ))}
                  </div>
                  <Textarea className="mt-3" rows={4} value={reviewBody} onChange={(e) => setReviewBody(e.target.value)} placeholder="What did you think?" />
                  <Button className="mt-3 w-full" disabled={reviewBody.trim().length < 3 || reviewMutation.isPending} onClick={() => reviewMutation.mutate()}>
                    Post review
                  </Button>
                </>
              ) : (
                <>
                  <p className="mt-2 text-sm text-muted-foreground">You need an account to post a review.</p>
                  <Button className="mt-3 w-full" onClick={() => setAuthOpen(true)}>Create an account</Button>
                </>
              )}
            </div>
          </div>
        </Section>

        {/* FAQ */}
        <Section id="faq" title="FAQ" subtitle="Everything you need to know." action={<OwnerBar table="site_faq" />}>
          <div className="grid gap-2">
            {faq.map((entry) => {
              const open = openFaq === entry.id;
              return (
                <div key={entry.id} className="app-panel overflow-hidden rounded-xl">
                  <button className="flex w-full items-center justify-between gap-3 p-4 text-left" onClick={() => setOpenFaq(open ? null : entry.id)}>
                    <span className="font-medium">{entry.question}</span>
                    <ChevronDown className={`size-4 shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
                  </button>
                  <div className={`faq-body ${open ? "is-open" : ""}`}>
                    <p className="px-4 pb-4 text-sm text-muted-foreground">{entry.answer}</p>
                    {isOwner && (
                      <div className="px-4 pb-4">
                        <OwnerBar table="site_faq" row={entry} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {faq.length === 0 && <Empty text="No questions yet." />}
          </div>
        </Section>

        {/* Social */}
        <Section id="social" title="Social media" subtitle="Follow Babis everywhere." action={<OwnerBar table="site_links" />}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {links.map((link, index) => (
              <article key={link.id} className="card-hover reveal app-panel rounded-xl p-4" style={{ animationDelay: `${index * 60}ms` }}>
                <div className="text-xs uppercase tracking-wide text-primary">{link.platform}</div>
                <h3 className="mt-1 font-semibold">{link.label}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{link.description}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <a href={link.url} target="_blank" rel="noreferrer noopener">Open</a>
                  </Button>
                  <OwnerBar table="site_links" row={link} />
                </div>
              </article>
            ))}
            {links.length === 0 && <Empty text="No links yet." />}
          </div>
        </Section>
      </main>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Babis Scripts · <Link to="/auth" className="hover:text-foreground">Staff login</Link>
      </footer>

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        total={cartTotal}
        setCart={setCart}
        onPaid={(keys) => {
          setCart([]);
          setCartOpen(false);
          if (keys.length > 0) setDeliveredKeys(keys);
        }}
      />

      {planPicker && (
        <PlanScriptDialog
          plan={planPicker}
          scripts={(data?.scripts ?? []) as Array<{ id: string; name: string }>}
          onClose={() => setPlanPicker(null)}
          onConfirm={(script) => {
            addToCart({
              kind: "pricing_plans",
              id: planPicker.id,
              title: planPicker.name,
              priceCents: planPicker.price_cents,
              scriptId: script.id,
              scriptName: script.name,
            });
            setPlanPicker(null);
          }}
        />
      )}

      {deliveredKeys && <KeysDialog keys={deliveredKeys} onClose={() => setDeliveredKeys(null)} onCopy={copyText} />}

      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />


      {editor && (
        <EditorDialog
          table={editor.table}
          row={editor.row}
          onClose={() => setEditor(null)}
          onSave={(row) => saveMutation.mutate({ table: editor.table, id: editor.row?.id ?? null, row })}
          saving={saveMutation.isPending}
        />
      )}
    </div>
  );
}

function Section({
  id,
  title,
  subtitle,
  action,
  children,
}: {
  id: string;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={`section-${id}`} className="scroll-mt-24 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold sm:text-3xl">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="app-panel rounded-xl p-6 text-center text-sm text-muted-foreground">{text}</div>;
}

function EditorDialog({
  table,
  row,
  onClose,
  onSave,
  saving,
}: {
  table: TableName;
  row: Row;
  onClose: () => void;
  onSave: (row: Row) => void;
  saving: boolean;
}) {
  const fields = FIELDS[table];
  const [form, setForm] = useState<Row>(() => {
    const initial: Row = {};
    for (const field of fields) {
      const value = row[field.key];
      if (field.type === "list") initial[field.key] = Array.isArray(value) ? value.join("\n") : "";
      else if (field.type === "bool") initial[field.key] = value ?? true;
      else if (field.type === "number") initial[field.key] = value ?? 0;
      else initial[field.key] = value ?? "";
    }
    return initial;
  });

  function submit() {
    const payload: Row = {};
    for (const field of fields) {
      const value = form[field.key];
      if (field.type === "list") payload[field.key] = String(value).split("\n").map((s) => s.trim()).filter(Boolean);
      else if (field.type === "number") payload[field.key] = Number(value) || 0;
      else if (field.type === "bool") payload[field.key] = Boolean(value);
      else payload[field.key] = String(value ?? "");
    }
    onSave(payload);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{row.id ? "Edit" : "Add"}</DialogTitle>
          <DialogDescription>Changes go live on the site immediately.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {fields.map((field) => (
            <label key={field.key} className="grid gap-1 text-sm">
              {field.label}
              {field.type === "textarea" || field.type === "list" ? (
                <Textarea rows={field.type === "list" ? 4 : 3} value={form[field.key]} onChange={(e) => setForm({ ...form, [field.key]: e.target.value })} />
              ) : field.type === "bool" ? (
                <Switch checked={Boolean(form[field.key])} onCheckedChange={(v) => setForm({ ...form, [field.key]: v })} />
              ) : (
                <Input
                  type={field.type === "number" ? "number" : "text"}
                  value={form[field.key]}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                />
              )}
            </label>
          ))}
        </div>
        <Button className="mt-2" onClick={submit} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function AuthDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const clean = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,32}$/.test(clean)) return toast.error("Username: 3-32 letters, numbers or _");
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    if (mode === "signup" && password !== confirm) return toast.error("Passwords do not match");
    setBusy(true);
    try {
      const email = `${clean}@babis.local`;
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/`, data: { username: clean } },
        });
        if (error) throw error;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      toast.success(mode === "signup" ? "Account created" : "Signed in");
      onClose();
    } catch (error) {
      toast.error("Failed", { description: (error as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{mode === "signup" ? "Create an account" : "Sign in"}</DialogTitle>
          <DialogDescription>Username and password only — no email needed.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={submit}>
          <label className="grid gap-1 text-sm">Username<Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" /></label>
          <label className="grid gap-1 text-sm">Password<Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></label>
          {mode === "signup" && (
            <label className="grid gap-1 text-sm">Confirm password<Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></label>
          )}
          <Button type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}</Button>
        </form>
        <Button variant="ghost" onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>
          {mode === "signup" ? "I already have an account" : "Create an account instead"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function CartDrawer({
  open,
  onClose,
  cart,
  total,
  setCart,
  onPaid,
}: {
  open: boolean;
  onClose: () => void;
  cart: CartLine[];
  total: number;
  setCart: React.Dispatch<React.SetStateAction<CartLine[]>>;
  onPaid: (keys: DeliveredKey[]) => void;
}) {
  const loadConfig = useServerFn(getPaypalConfig);
  const createOrder = useServerFn(createPaypalOrder);
  const captureOrder = useServerFn(capturePaypalOrder);
  const config = useQuery({ queryKey: ["paypal-config"], queryFn: () => loadConfig(), enabled: open });
  const buttonsRef = useRef<HTMLDivElement | null>(null);
  const [discordTag, setDiscordTag] = useState("");
  const [ready, setReady] = useState(false);

  const clientId = (config.data as any)?.clientId as string | undefined;

  useEffect(() => {
    if (!open || !clientId) return;
    const existing = document.getElementById("paypal-sdk");
    if (existing) {
      setReady(true);
      return;
    }
    const script = document.createElement("script");
    script.id = "paypal-sdk";
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=EUR&components=buttons&enable-funding=card,paylater`;
    script.onload = () => setReady(true);
    script.onerror = () => toast.error("PayPal could not be loaded");
    document.body.appendChild(script);
  }, [open, clientId]);

  useEffect(() => {
    const paypal = (window as any).paypal;
    if (!open || !ready || !paypal || !buttonsRef.current || cart.length === 0) return;
    const container = buttonsRef.current;
    container.innerHTML = "";
    const instance = paypal.Buttons({
      style: { layout: "vertical", shape: "rect", color: "gold" },
      createOrder: async () => {
        const result: any = await createOrder({
          data: {
            items: cart.map((l) => ({ kind: l.kind, id: l.id, quantity: l.quantity, scriptId: l.scriptId ?? null })),
            discordTag: discordTag.trim() || undefined,
          },
        });
        return result.orderId;
      },
      onApprove: async (payload: { orderID: string }) => {
        const result: any = await captureOrder({ data: { orderId: payload.orderID } });
        const keys: DeliveredKey[] = Array.isArray(result?.keys) ? result.keys : [];
        toast.success("Payment complete", {
          description: keys.length > 0 ? "Your license key is ready." : "Your order has been recorded.",
        });
        onPaid(keys);
      },

      onError: (error: unknown) => toast.error("Payment failed", { description: String((error as Error)?.message ?? error) }),
    });
    instance.render(container).catch(() => {});
    return () => {
      try {
        instance.close();
      } catch { /* ignore */ }
    };
  }, [open, ready, cart, discordTag, createOrder, captureOrder, onPaid]);

  return (
    <>
      <div className={`drawer-overlay ${open ? "is-open" : ""}`} onClick={onClose} />
      <aside className={`cart-drawer ${open ? "is-open" : ""}`} aria-hidden={!open}>
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="font-semibold">Your cart</div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="size-5" /></Button>
        </div>
        <div className="grid gap-3 overflow-y-auto p-4">
          {cart.length === 0 && <p className="text-sm text-muted-foreground">Your cart is empty.</p>}
          {cart.map((line) => (
            <div key={lineKey(line)} className="rounded-lg border border-border bg-muted p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">{line.title}</div>
                  {line.scriptName && <div className="text-xs text-muted-foreground">Script: {line.scriptName}</div>}
                </div>
                <button onClick={() => setCart((c) => c.filter((l) => lineKey(l) !== lineKey(line)))} className="text-muted-foreground hover:text-foreground">
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="outline" className="size-7" onClick={() => setCart((c) => c.map((l) => (lineKey(l) === lineKey(line) ? { ...l, quantity: Math.max(1, l.quantity - 1) } : l)))}>
                    <Minus className="size-3" />
                  </Button>
                  <span className="w-6 text-center text-sm">{line.quantity}</span>
                  <Button size="icon" variant="outline" className="size-7" onClick={() => setCart((c) => c.map((l) => (lineKey(l) === lineKey(line) ? { ...l, quantity: Math.min(20, l.quantity + 1) } : l)))}>
                    <Plus className="size-3" />
                  </Button>
                </div>
                <div className="text-sm font-semibold text-primary">{money(line.priceCents * line.quantity)}</div>
              </div>
            </div>

          ))}
        </div>
        {cart.length > 0 && (
          <div className="mt-auto border-t border-border p-4">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="text-lg font-semibold">{money(total)}</span>
            </div>
            <label className="grid gap-1 text-sm">
              Discord tag (for delivery)
              <Input value={discordTag} onChange={(e) => setDiscordTag(e.target.value)} placeholder="yourname" />
            </label>
            <div ref={buttonsRef} className="mt-4" />
            <p className="mt-3 text-xs text-muted-foreground">
              PayPal, credit/debit card, Apple Pay and Google Pay are offered when available on your device.
            </p>
          </div>
        )}
      </aside>
    </>
  );
}

function PlanScriptDialog({
  plan,
  scripts,
  onClose,
  onConfirm,
}: {
  plan: Row;
  scripts: Array<{ id: string; name: string }>;
  onClose: () => void;
  onConfirm: (script: { id: string; name: string }) => void;
}) {
  const [selected, setSelected] = useState<string>(scripts[0]?.id ?? "");
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Choose your script</DialogTitle>
          <DialogDescription>
            {plan.name} unlocks one script. Pick the script your license key will be created for.
          </DialogDescription>
        </DialogHeader>
        {scripts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No script is available right now. Please come back later.</p>
        ) : (
          <div className="grid max-h-72 gap-2 overflow-y-auto">
            {scripts.map((script) => (
              <button
                key={script.id}
                type="button"
                onClick={() => setSelected(script.id)}
                className={`flex items-center justify-between rounded-lg border p-3 text-left text-sm transition ${
                  selected === script.id ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                }`}
              >
                <span>{script.name}</span>
                {selected === script.id && <Check className="size-4 text-primary" />}
              </button>
            ))}
          </div>
        )}
        <Button
          className="w-full"
          disabled={!selected}
          onClick={() => {
            const script = scripts.find((s) => s.id === selected);
            if (script) onConfirm(script);
          }}
        >
          <ShoppingCart className="size-4" /> Add to cart
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function KeysDialog({
  keys,
  onClose,
  onCopy,
}: {
  keys: DeliveredKey[];
  onClose: () => void;
  onCopy: (label: string, value: string) => void;
}) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Your license keys</DialogTitle>
          <DialogDescription>Keep them safe — paste a key in the loader window to unlock the script.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {keys.map((entry) => (
            <div key={entry.key} className="rounded-lg border border-border bg-muted p-3">
              <div className="text-xs text-muted-foreground">
                {entry.planName} · {entry.scriptName}
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <code className="text-sm font-semibold">{entry.key}</code>
                <Button size="sm" variant="outline" onClick={() => onCopy("Key", entry.key)}>
                  <Copy className="size-3.5" /> Copy
                </Button>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {entry.expiresAt ? `Valid until ${new Date(entry.expiresAt).toLocaleString()}` : "Lifetime access"}
              </div>
            </div>
          ))}
        </div>
        <Button className="w-full" onClick={onClose}>
          Done
        </Button>
      </DialogContent>
    </Dialog>
  );
}
