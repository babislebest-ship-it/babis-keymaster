import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleHelp,
  Copy,
  Home,
  Menu,
  Minus,
  Moon,
  Package,
  Pencil,
  Play,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Star,
  Sun,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  deleteReview,
  deleteSiteContent,
  saveReview,
  saveSiteContent,
} from "@/lib/shop.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Babis Hub — Shop and Account" },
      {
        name: "description",
        content: "Browse Babis Hub products, view product information and manage your account.",
      },
      { property: "og:title", content: "Babis Hub — Shop and Account" },
      {
        property: "og:description",
        content: "Browse Babis Hub products, view product information and manage your account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Storefront,
});

type Row = Record<string, any>;
type TableName =
  "shop_items" | "pricing_plans" | "site_faq" | "site_videos" | "site_links" | "site_tabs";

type FieldSpec = {
  key: string;
  label: string;
  type: "text" | "textarea" | "list" | "bool" | "number";
};

const FIELDS: Record<TableName, FieldSpec[]> = {
  shop_items: [
    { key: "title", label: "Product name", type: "text" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "features", label: "Features (one per line)", type: "list" },
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
    {
      key: "license_duration_minutes",
      label: "License duration in minutes (empty = lifetime)",
      type: "number",
    },
    {
      key: "requires_script_choice",
      label: "Buyer must choose one script (off = global key for every paid script)",
      type: "bool",
    },
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
    {
      key: "section_key",
      label: "Section (scripts, premium, videos, reviews, faq, social)",
      type: "text",
    },
    { key: "sort_order", label: "Position", type: "number" },
    { key: "is_published", label: "Visible in the menu", type: "bool" },
  ],
};

const DEFAULT_TABS = [
  { section_key: "scripts", label: "Products" },
  { section_key: "premium", label: "Premium" },
  { section_key: "videos", label: "Videos" },
  { section_key: "reviews", label: "Reviews" },
  { section_key: "faq", label: "FAQ" },
  { section_key: "social", label: "Social" },
];

const DEMO_SHOP_ITEMS: Row[] = [
  {
    id: "demo-keymaster-access",
    title: "Premium Access (Demo)",
    description:
      "A sample digital access product for trying the storefront and PayPal sandbox flow.",
    features: [
      "Sandbox checkout only",
      "Order history saved on this device",
      "No real license is issued",
    ],
    price_cents: 499,
    price_label: "€4.99",
    currency: "EUR",
    badge: "Demo",
    is_published: true,
  },
  {
    id: "demo-priority-support",
    title: "Priority Support (Demo)",
    description:
      "A sample service listing to preview the mobile product-detail and cart experience.",
    features: ["Demonstration product", "Safe to test with a PayPal sandbox account"],
    price_cents: 299,
    price_label: "€2.99",
    currency: "EUR",
    badge: "Demo",
    is_published: true,
  },
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
type DeliveredKey = {
  key: string;
  scriptName: string;
  planName: string;
  expiresAt?: string | null;
};
type LocalOrder = {
  id: string;
  status: "COMPLETED" | "CANCELLED" | "FAILED";
  createdAt: string;
  amountCents: number;
  items: CartLine[];
};

type PaypalOrderActions = {
  order: {
    create: (order: Record<string, unknown>) => Promise<string>;
    capture: () => Promise<{ status: string }>;
  };
};

declare global {
  interface Window {
    paypal?: {
      Buttons: (options: {
        style: { layout: "vertical"; shape: "rect"; color: "gold" };
        createOrder: (_data: unknown, actions: PaypalOrderActions) => Promise<string>;
        onApprove: (data: { orderID: string }, actions: PaypalOrderActions) => Promise<void>;
        onCancel: (data: { orderID?: string }) => void;
        onError: (error: Error) => void;
      }) => {
        render: (container: HTMLElement) => Promise<void>;
        close: () => Promise<void>;
      };
    };
  }
}

const lineKey = (l: { id: string; scriptId?: string | null }) => `${l.id}:${l.scriptId ?? ""}`;

function Storefront() {
  const queryClient = useQueryClient();
  const saveContentFn = useServerFn(saveSiteContent);
  const deleteContentFn = useServerFn(deleteSiteContent);
  const saveReviewFn = useServerFn(saveReview);
  const deleteReviewFn = useServerFn(deleteReview);

  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [planPicker, setPlanPicker] = useState<Row | null>(null);
  const [deliveredKeys, setDeliveredKeys] = useState<DeliveredKey[] | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Row | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [orders, setOrders] = useState<LocalOrder[]>([]);

  const [editor, setEditor] = useState<{ table: TableName; row: Row } | null>(null);
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewBody, setReviewBody] = useState("");

  const content = useQuery({
    queryKey: ["site-content"],
    queryFn: async () => {
      const response = await fetch("/api/public/mobile/shop", {
        headers: { Accept: "application/json" },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Shop data is temporarily unavailable.");
      return {
        shopItems: result.items ?? [],
        plans: result.plans ?? [],
        faq: result.faq ?? [],
        videos: result.videos ?? [],
        links: result.links ?? [],
        tabs: result.tabs ?? [],
        reviews: [],
        scripts: [],
        discordInviteUrl: result.discord_invite_url ?? "",
      };
    },
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_e, session) =>
      setSignedIn(Boolean(session)),
    );
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("babis-cart");
      if (raw) setCart(JSON.parse(raw));
      const savedOrders = localStorage.getItem("babis-orders");
      if (savedOrders) setOrders(JSON.parse(savedOrders));
      setTheme(localStorage.getItem("babis-theme") === "light" ? "light" : "dark");
    } catch {
      toast.error("Saved shop data could not be loaded.");
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("babis-cart", JSON.stringify(cart));
    } catch {
      /* ignore */
    }
  }, [cart]);
  useEffect(() => {
    try {
      localStorage.setItem("babis-orders", JSON.stringify(orders));
    } catch {
      toast.error("Order history could not be saved on this device.");
    }
  }, [orders]);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
    try {
      localStorage.setItem("babis-theme", theme);
    } catch {
      toast.error("Theme preference could not be saved.");
    }
  }, [theme]);

  const data = content.data;
  const viewerId: string | undefined = undefined;

  const visible = (rows: Row[]) => rows.filter((r) => r.is_published !== false);
  const shopRows = data?.shopItems?.length
    ? data.shopItems
    : content.isError
      ? []
      : DEMO_SHOP_ITEMS;
  const scripts = visible(shopRows);
  const filteredScripts = scripts.filter((item: Row) =>
    `${item.title ?? ""} ${item.description ?? ""}`
      .toLowerCase()
      .includes(productSearch.toLowerCase().trim()),
  );
  const plans = visible(data?.plans ?? []).filter((plan) => plan.requires_script_choice !== true);
  const faq = visible(data?.faq ?? []);
  const videos = visible(data?.videos ?? []);
  const links = visible(data?.links ?? []);
  const reviews: Row[] = data?.reviews ?? [];
  const tabRows = visible(data?.tabs ?? []);
  const tabs = tabRows.length ? tabRows : DEFAULT_TABS;

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
    onError: (error) =>
      toast.error("Could not post the review", { description: (error as Error).message }),
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
      if (existing)
        return current.map((l) =>
          lineKey(l) === key ? { ...l, quantity: Math.min(20, l.quantity + 1) } : l,
        );
      return [...current, { ...line, quantity: 1 }];
    });
    setCartOpen(true);
    toast.success("Added to cart", {
      description: line.scriptName ? `${line.title} — ${line.scriptName}` : line.title,
    });
  }

  function scrollTo(key: string) {
    setMenuOpen(false);
    const el = document.getElementById(`section-${key}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const cartCount = cart.reduce((sum, l) => sum + l.quantity, 0);
  const cartTotal = cart.reduce((sum, l) => sum + l.quantity * l.priceCents, 0);
  const onSandboxPaid = useCallback((keys: DeliveredKey[], order: LocalOrder) => {
    setCart([]);
    setCartOpen(false);
    setOrders((current) => [order, ...current].slice(0, 30));
    if (keys.length > 0) setDeliveredKeys(keys);
  }, []);
  const onSandboxOrderStatus = useCallback((order: LocalOrder) => {
    setOrders((current) => [order, ...current].slice(0, 30));
  }, []);

  const OwnerBar = ({ table, row }: { table: TableName; row?: Row }) =>
    null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="aurora" aria-hidden="true" />

      <aside className="desktop-app-sidebar" aria-label="Main sidebar">
        <a className="desktop-sidebar-brand" href="/" aria-label="Babis Hub home">
          <img src="/app-icon.png" alt="" className="size-10 rounded-xl" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">Babis Hub</span>
            <span className="block text-xs text-sidebar-foreground/60">Store &amp; account</span>
          </span>
        </a>
        <div className="desktop-sidebar-label">Browse</div>
        <nav className="desktop-sidebar-links" aria-label="Store sections">
          {tabs.map((tab: Row, index: number) => {
            const Icon = [ShoppingBag, Sparkles, Play, Star, CircleHelp, Home][index % 6];
            return (
              <button
                key={tab.id ?? tab.section_key}
                type="button"
                className="desktop-sidebar-link"
                onClick={() => scrollTo(tab.section_key)}
              >
                <Icon className="size-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
          <button
            type="button"
            className="desktop-sidebar-link"
            onClick={() => scrollTo("orders")}
          >
            <Package className="size-4" />
            <span>Orders</span>
          </button>
        </nav>
        <div className="desktop-sidebar-spacer" />
        <div className="desktop-sidebar-actions">
          <button
            type="button"
            className="desktop-sidebar-link"
            onClick={() => (signedIn ? setAccountOpen(true) : setAuthOpen(true))}
          >
            <UserRound className="size-4" />
            <span>Account</span>
          </button>
          <button type="button" className="desktop-sidebar-link" onClick={() => setCartOpen(true)}>
            <ShoppingCart className="size-4" />
            <span>Shopping cart</span>
            {cartCount > 0 && <span className="desktop-sidebar-badge">{cartCount}</span>}
          </button>
          <div className="desktop-sidebar-status">
            <span className="size-2 rounded-full bg-emerald-400" />
            <span>Secure storefront</span>
          </div>
        </div>
      </aside>

      <header className="storefront-header sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-6">
          <button onClick={() => setMenuOpen(true)} className="menu-button" aria-label="Open menu">
            <Menu className="size-5" />
          </button>
          <div className="whitespace-nowrap text-sm font-semibold tracking-tight sm:text-lg">
            Babis <span className="text-primary">Hub</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              className="relative"
              onClick={() => setCartOpen(true)}
            >
              <ShoppingCart className="size-4" />
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </Button>
            {signedIn ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => setAccountOpen(true)}>
                  Account
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    queryClient.removeQueries({ queryKey: ["mobile-account"] });
                  }}
                >
                  Sign out
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => setAuthOpen(true)}>
                Sign in
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Slide-in menu */}
      <div
        className={`drawer-overlay ${menuOpen ? "is-open" : ""}`}
        onClick={() => setMenuOpen(false)}
      />
      <nav className={`drawer ${menuOpen ? "is-open" : ""}`} aria-hidden={!menuOpen}>
        <div className="flex items-center justify-between p-5">
          <div className="text-base font-semibold">Menu</div>
          <Button variant="ghost" size="icon" onClick={() => setMenuOpen(false)}>
            <X className="size-5" />
          </Button>
        </div>
        <div className="grid gap-1 px-3">
          {tabs.map((tab: Row, index: number) => (
            <div
              key={tab.id ?? tab.section_key}
              className="drawer-item"
              style={{ animationDelay: `${index * 45}ms` }}
            >
              <button
                onClick={() => scrollTo(tab.section_key)}
                className="flex-1 rounded-md px-3 py-3 text-left text-sm font-medium hover:bg-muted"
              >
                {tab.label}
              </button>
            </div>
          ))}
        </div>
      </nav>

      <main className="storefront-main relative mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        {/* Hero */}
        <section className="reveal py-16 text-center sm:py-24">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-1.5 text-xs text-muted-foreground">
            <span className="size-2 animate-pulse rounded-full bg-primary" /> Babis Hub shop
          </div>
          <h1 className="text-balance text-4xl font-semibold leading-tight sm:text-6xl">
            Discover products, <span className="text-primary">all in one place</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
            Browse the catalog, add products to your cart and manage your account securely.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" onClick={() => scrollTo("scripts")}>
              Browse scripts
            </Button>
            <Button size="lg" variant="outline" onClick={() => scrollTo("premium")}>
              See plans
            </Button>
          </div>
        </section>

        {/* Scripts */}
        <Section
          id="scripts"
          title="Products"
          subtitle="Browse available products and view their details."
          action={<OwnerBar table="shop_items" />}
        >
          <label className="mb-4 flex max-w-md items-center gap-2 rounded-lg border border-border bg-card px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Input
              value={productSearch}
              onChange={(event) => setProductSearch(event.target.value)}
              placeholder="Search products"
              aria-label="Search products"
              className="border-0 bg-transparent px-0 focus-visible:ring-0"
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            {filteredScripts.map((item, index) => (
              <article
                key={item.id}
                className="card-hover reveal app-panel rounded-xl p-5"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <button
                  className="block w-full text-left"
                  onClick={() => setSelectedProduct(item)}
                  aria-label={`View ${item.title} details`}
                >
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
                    <img
                      src={item.image_url}
                      alt={`${item.title} preview`}
                      loading="lazy"
                      className="mt-4 w-full rounded-lg border border-border object-cover"
                    />
                  )}
                </button>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-primary">
                    {item.price_label ||
                      (item.price_cents ? money(item.price_cents, item.currency) : "Free")}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.price_cents > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          addToCart({
                            kind: "shop_items",
                            id: item.id,
                            title: item.title,
                            priceCents: item.price_cents,
                          })
                        }
                      >
                        <ShoppingCart className="size-4" /> Add to cart
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setSelectedProduct(item)}>
                      Details <ArrowRight className="size-4" />
                    </Button>
                    <OwnerBar table="shop_items" row={item} />
                  </div>
                </div>
              </article>
            ))}
            {filteredScripts.length === 0 && (
              <Empty
                text={
                  content.isError
                    ? "Shop data could not be loaded. Please try again later."
                    : scripts.length
                      ? "No products match your search."
                      : "No products published yet."
                }
              />
            )}
          </div>
        </Section>

        <Section
          id="orders"
          title="Order history"
          subtitle="Sandbox purchases are saved on this device."
        >
          <div className="grid gap-3">
            {orders.map((order) => (
              <article
                key={order.id}
                className="app-panel flex flex-wrap items-center justify-between gap-3 rounded-xl p-4"
              >
                <div>
                  <div className="font-semibold">
                    {order.items.map((item) => `${item.title} × ${item.quantity}`).join(", ")}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {new Date(order.createdAt).toLocaleString()} · {order.id}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`badge-pill ${order.status === "COMPLETED" ? "" : "bg-muted text-muted-foreground"}`}
                  >
                    {order.status}
                  </span>
                  <span className="font-semibold">{money(order.amountCents)}</span>
                </div>
              </article>
            ))}
            {orders.length === 0 && (
              <Empty text="Your completed and cancelled sandbox orders will appear here." />
            )}
          </div>
        </Section>

        {/* Premium */}
        <Section
          id="premium"
          title="Premium plans"
          subtitle="Browse additional plans available from the shop."
          action={<OwnerBar table="pricing_plans" />}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan, index) => (
              <article
                key={plan.id}
                className={`card-hover reveal app-panel relative rounded-xl p-5 ${plan.highlight ? "ring-2 ring-primary" : ""}`}
                style={{ animationDelay: `${index * 70}ms` }}
              >
                {plan.highlight && (
                  <span className="badge-pill absolute -top-3 left-5">Most popular</span>
                )}
                <div className="text-3xl">{plan.emoji}</div>
                <h3 className="mt-2 text-lg font-semibold">{plan.name}</h3>
                <div className="mt-1 text-2xl font-semibold text-primary">
                  {plan.price_label || money(plan.price_cents, plan.currency)}
                </div>
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
                  onClick={() => {
                    if (plan.requires_script_choice === false) {
                      addToCart({
                        kind: "pricing_plans",
                        id: plan.id,
                        title: plan.name,
                        priceCents: plan.price_cents,
                        scriptId: null,
                        scriptName: "All paid scripts",
                      });
                      return;
                    }
                    setPlanPicker(plan);
                  }}
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
        <Section
          id="videos"
          title="Showcases"
          subtitle="See the scripts in action."
          action={<OwnerBar table="site_videos" />}
        >
          <div className="grid gap-4 md:grid-cols-2">
            {videos.map((video, index) => (
              <article
                key={video.id}
                className="reveal app-panel overflow-hidden rounded-xl"
                style={{ animationDelay: `${index * 70}ms` }}
              >
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
                <article
                  key={review.id}
                  className="reveal app-panel rounded-xl p-4"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold">{review.author_name}</div>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={`size-4 ${n <= review.rating ? "fill-primary text-primary" : "text-muted-foreground"}`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{review.body}</p>
                  {review.user_id === viewerId && (
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
                        <Star
                          className={`size-6 transition ${n <= reviewRating ? "fill-primary text-primary" : "text-muted-foreground"}`}
                        />
                      </button>
                    ))}
                  </div>
                  <Textarea
                    className="mt-3"
                    rows={4}
                    value={reviewBody}
                    onChange={(e) => setReviewBody(e.target.value)}
                    placeholder="What did you think?"
                  />
                  <Button
                    className="mt-3 w-full"
                    disabled={reviewBody.trim().length < 3 || reviewMutation.isPending}
                    onClick={() => reviewMutation.mutate()}
                  >
                    Post review
                  </Button>
                </>
              ) : (
                <>
                  <p className="mt-2 text-sm text-muted-foreground">
                    You need an account to post a review.
                  </p>
                  <Button className="mt-3 w-full" onClick={() => setAuthOpen(true)}>
                    Create an account
                  </Button>
                </>
              )}
            </div>
          </div>
        </Section>

        {/* FAQ */}
        <Section
          id="faq"
          title="FAQ"
          subtitle="Everything you need to know."
          action={<OwnerBar table="site_faq" />}
        >
          <div className="grid gap-2">
            {faq.map((entry) => {
              const open = openFaq === entry.id;
              return (
                <div key={entry.id} className="app-panel overflow-hidden rounded-xl">
                  <button
                    className="flex w-full items-center justify-between gap-3 p-4 text-left"
                    onClick={() => setOpenFaq(open ? null : entry.id)}
                  >
                    <span className="font-medium">{entry.question}</span>
                    <ChevronDown
                      className={`size-4 shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
                    />
                  </button>
                  <div className={`faq-body ${open ? "is-open" : ""}`}>
                    <p className="px-4 pb-4 text-sm text-muted-foreground">{entry.answer}</p>
                  </div>
                </div>
              );
            })}
            {faq.length === 0 && <Empty text="No questions yet." />}
          </div>
        </Section>

        {/* Social */}
        <Section
          id="social"
          title="Social media"
          subtitle="Follow Babis everywhere."
          action={<OwnerBar table="site_links" />}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {links.map((link, index) => (
              <article
                key={link.id}
                className="card-hover reveal app-panel rounded-xl p-4"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className="text-xs uppercase tracking-wide text-primary">{link.platform}</div>
                <h3 className="mt-1 font-semibold">{link.label}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{link.description}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <a href={link.url} target="_blank" rel="noreferrer noopener">
                      Open
                    </a>
                  </Button>
                  <OwnerBar table="site_links" row={link} />
                </div>
              </article>
            ))}
            {links.length === 0 && <Empty text="No links yet." />}
          </div>
        </Section>
      </main>

      <footer className="storefront-footer border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Babis Hub ·{" "}
        <Link to="/auth" className="hover:text-foreground">
          Staff login
        </Link>
      </footer>

      <nav className="mobile-bottom-nav" aria-label="Main navigation">
        {[
          { label: "Home", icon: Home, action: () => scrollTo("scripts") },
          { label: "Shop", icon: ShoppingBag, action: () => scrollTo("premium") },
          { label: "Orders", icon: Package, action: () => scrollTo("orders") },
          {
            label: "Account",
            icon: UserRound,
            action: () => (signedIn ? setAccountOpen(true) : setAuthOpen(true)),
          },
        ].map(({ label, icon: Icon, action }) => (
          <button key={label} type="button" onClick={action} className="mobile-nav-item">
            <Icon className="size-5" />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        total={cartTotal}
        setCart={setCart}
        onPaid={onSandboxPaid}
        onOrderStatus={onSandboxOrderStatus}
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

      {deliveredKeys && (
        <KeysDialog keys={deliveredKeys} onClose={() => setDeliveredKeys(null)} onCopy={copyText} />
      )}

      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
      <AccountDialog open={accountOpen} onClose={() => setAccountOpen(false)} />

      {selectedProduct && (
        <Dialog open onOpenChange={(open) => !open && setSelectedProduct(null)}>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedProduct.title}</DialogTitle>
              <DialogDescription>
                {selectedProduct.description || "Product details"}
              </DialogDescription>
            </DialogHeader>
            {selectedProduct.image_url && (
              <img
                src={selectedProduct.image_url}
                alt={`${selectedProduct.title} preview`}
                className="max-h-64 w-full rounded-lg border border-border object-cover"
              />
            )}
            {Array.isArray(selectedProduct.features) && (
              <ul className="grid gap-2 text-sm">
                {selectedProduct.features.map((feature: string) => (
                  <li key={feature} className="flex gap-2 text-muted-foreground">
                    <Check className="size-4 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-center justify-between gap-3">
              <span className="text-lg font-semibold text-primary">
                {selectedProduct.price_label ||
                  (selectedProduct.price_cents
                    ? money(selectedProduct.price_cents, selectedProduct.currency)
                    : "Free")}
              </span>
              {selectedProduct.price_cents > 0 && (
                <Button
                  onClick={() => {
                    addToCart({
                      kind: "shop_items",
                      id: selectedProduct.id,
                      title: selectedProduct.title,
                      priceCents: selectedProduct.price_cents,
                    });
                    setSelectedProduct(null);
                  }}
                >
                  <ShoppingCart className="size-4" /> Add to cart
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {editor && (
        <EditorDialog
          table={editor.table}
          row={editor.row}
          onClose={() => setEditor(null)}
          onSave={(row) =>
            saveMutation.mutate({ table: editor.table, id: editor.row?.id ?? null, row })
          }
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
  return (
    <div className="app-panel rounded-xl p-6 text-center text-sm text-muted-foreground">{text}</div>
  );
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
      if (field.type === "list")
        payload[field.key] = String(value)
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
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
                <Textarea
                  rows={field.type === "list" ? 4 : 3}
                  value={form[field.key]}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                />
              ) : field.type === "bool" ? (
                <Switch
                  checked={Boolean(form[field.key])}
                  onCheckedChange={(v) => setForm({ ...form, [field.key]: v })}
                />
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail))
      return toast.error("Enter a valid email address.");
    if (password.length < 6 || password.length > 200)
      return toast.error("Password must be between 6 and 200 characters.");
    setBusy(true);
    try {
      const response = await fetch("/api/public/mobile/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email: cleanEmail, password }),
      });
      const result = (await response.json()) as {
        error?: string;
        access_token?: string;
        refresh_token?: string;
      };
      if (!response.ok || !result.access_token || !result.refresh_token) {
        throw new Error(result.error || "Sign in could not be completed.");
      }
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      });
      if (sessionError) throw sessionError;
      toast.success("Signed in");
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
          <DialogTitle>Sign in</DialogTitle>
          <DialogDescription>Sign in with your Babis Hub account email and password.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={submit}>
          <label className="grid gap-1 text-sm">
            Email
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label className="grid gap-1 text-sm">
            Password
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <Button type="submit" disabled={busy}>
            {busy ? "Please wait…" : "Sign in"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type MobileProfile = {
  username?: string;
  display_name: string | null;
};

type MobileOrder = {
  id: string;
  status: string;
  amount_cents: number;
  currency: string;
  created_at: string;
};

type MobileAccount = {
  user: { id: string | null; email: string | null };
  profile: MobileProfile | null;
  orders: MobileOrder[];
};

async function loadMobileAccount(): Promise<MobileAccount> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in to view your account.");

  const response = await fetch("/api/public/mobile/me", {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  const result = (await response.json()) as MobileAccount & { error?: string };
  if (!response.ok) throw new Error(result.error || "Account request failed.");
  return result;
}

function AccountDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const account = useQuery({
    queryKey: ["mobile-account"],
    enabled: open,
    queryFn: loadMobileAccount,
  });

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Your account</DialogTitle>
          <DialogDescription>View your profile and review purchases linked to your account.</DialogDescription>
        </DialogHeader>
        {account.isPending ? (
          <p className="text-sm text-muted-foreground">Loading account…</p>
        ) : account.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {account.error.message}
          </p>
        ) : (
          <div className="grid gap-6">
            <section className="grid gap-1 text-sm">
              <h3 className="font-semibold">Profile</h3>
              <p>{account.data.profile?.display_name || account.data.profile?.username || "Member"}</p>
              {account.data.user.email && (
                <p className="text-muted-foreground">{account.data.user.email}</p>
              )}
            </section>
            <section className="grid gap-2">
              <h3 className="font-semibold">Your orders</h3>
              {account.data.orders.map((order) => (
                <article
                  key={order.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
                >
                  <div>
                    <div className="font-medium">{order.status}</div>
                    <time className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString()}
                    </time>
                  </div>
                  <span className="font-semibold">{money(order.amount_cents, order.currency)}</span>
                </article>
              ))}
              {account.data.orders.length === 0 && (
                <p className="text-sm text-muted-foreground">No account-linked orders yet.</p>
              )}
            </section>
          </div>
        )}
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
  onOrderStatus,
}: {
  open: boolean;
  onClose: () => void;
  cart: CartLine[];
  total: number;
  setCart: React.Dispatch<React.SetStateAction<CartLine[]>>;
  onPaid: (keys: DeliveredKey[], order: LocalOrder) => void;
  onOrderStatus: (order: LocalOrder) => void;
}) {
  const buttonsRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState<{
    kind: "error" | "cancel";
    text: string;
  } | null>(null);
  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID as string | undefined;

  useEffect(() => {
    if (!open || !clientId || clientId === "YOUR_SANDBOX_CLIENT_ID") return;
    const existing = document.getElementById("paypal-sdk");
    if (existing) {
      setReady(true);
      return;
    }
    const script = document.createElement("script");
    script.id = "paypal-sdk";
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=EUR&components=buttons&enable-funding=card,paylater`;
    script.onload = () => setReady(true);
    script.onerror = () => {
      setCheckoutMessage({
        kind: "error",
        text: "PayPal could not be loaded. Check your sandbox client ID and connection.",
      });
      toast.error("PayPal could not be loaded");
    };
    document.body.appendChild(script);
  }, [open, clientId]);

  useEffect(() => {
    const paypal = window.paypal;
    if (!open || !ready || !paypal || !buttonsRef.current || cart.length === 0 || total <= 0)
      return;
    const container = buttonsRef.current;
    container.innerHTML = "";
    const instance = paypal.Buttons({
      style: { layout: "vertical", shape: "rect", color: "gold" },
      createOrder: (_data, actions) => {
        setCheckoutMessage(null);
        return actions.order.create({
          intent: "CAPTURE",
          purchase_units: [
            {
              description: cart
                .map((item) => item.title)
                .join(", ")
                .slice(0, 127),
              amount: {
                currency_code: "EUR",
                value: (total / 100).toFixed(2),
                breakdown: {
                  item_total: { currency_code: "EUR", value: (total / 100).toFixed(2) },
                },
              },
              items: cart.map((item) => ({
                name: item.title.slice(0, 127),
                quantity: String(item.quantity),
                unit_amount: { currency_code: "EUR", value: (item.priceCents / 100).toFixed(2) },
              })),
            },
          ],
        });
      },
      onApprove: async (payload, actions) => {
        const capture = await actions.order.capture();
        if (capture.status !== "COMPLETED") {
          const failedOrder: LocalOrder = {
            id: payload.orderID,
            status: "FAILED",
            createdAt: new Date().toISOString(),
            amountCents: total,
            items: [...cart],
          };
          onOrderStatus(failedOrder);
          setCheckoutMessage({
            kind: "error",
            text: `Payment was not completed (${capture.status}). You have not been charged.`,
          });
          return;
        }
        const completedOrder: LocalOrder = {
          id: payload.orderID,
          status: "COMPLETED",
          createdAt: new Date().toISOString(),
          amountCents: total,
          items: [...cart],
        };
        toast.success("Sandbox payment complete", {
          description: "The test order is saved in your local order history.",
        });
        onPaid([], completedOrder);
      },
      onCancel: (payload) => {
        const cancelledOrder: LocalOrder = {
          id: payload.orderID || `cancelled-${Date.now()}`,
          status: "CANCELLED",
          createdAt: new Date().toISOString(),
          amountCents: total,
          items: [...cart],
        };
        onOrderStatus(cancelledOrder);
        setCheckoutMessage({
          kind: "cancel",
          text: "Checkout was cancelled. Your cart is still here.",
        });
        toast.info("Checkout cancelled");
      },
      onError: (error) => {
        setCheckoutMessage({
          kind: "error",
          text: "Payment failed. No order was completed. Please try again.",
        });
        toast.error("Payment failed", { description: String(error?.message ?? error) });
      },
    });
    instance.render(container).catch((error: unknown) => {
      setCheckoutMessage({
        kind: "error",
        text: "PayPal checkout could not be started. Please try again.",
      });
      toast.error("PayPal checkout could not be started", {
        description: String((error as Error)?.message ?? error),
      });
    });
    return () => {
      void instance
        .close()
        .catch((error: unknown) => console.error("PayPal button cleanup failed", error));
    };
  }, [open, ready, cart, total, onPaid, onOrderStatus]);

  return (
    <>
      <div className={`drawer-overlay ${open ? "is-open" : ""}`} onClick={onClose} />
      <aside className={`cart-drawer ${open ? "is-open" : ""}`} aria-hidden={!open}>
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="font-semibold">Your cart</div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="size-5" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="grid gap-3 p-4">
            {cart.length === 0 && (
              <p className="text-sm text-muted-foreground">Your cart is empty.</p>
            )}
            {cart.map((line) => (
              <div key={lineKey(line)} className="rounded-lg border border-border bg-muted p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium">{line.title}</div>
                    {line.scriptName && (
                      <div className="text-xs text-muted-foreground">Script: {line.scriptName}</div>
                    )}
                  </div>
                  <button
                    onClick={() => setCart((c) => c.filter((l) => lineKey(l) !== lineKey(line)))}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="size-7"
                      onClick={() =>
                        setCart((c) =>
                          c.map((l) =>
                            lineKey(l) === lineKey(line)
                              ? { ...l, quantity: Math.max(1, l.quantity - 1) }
                              : l,
                          ),
                        )
                      }
                    >
                      <Minus className="size-3" />
                    </Button>
                    <span className="w-6 text-center text-sm">{line.quantity}</span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="size-7"
                      onClick={() =>
                        setCart((c) =>
                          c.map((l) =>
                            lineKey(l) === lineKey(line)
                              ? { ...l, quantity: Math.min(20, l.quantity + 1) }
                              : l,
                          ),
                        )
                      }
                    >
                      <Plus className="size-3" />
                    </Button>
                  </div>
                  <div className="text-sm font-semibold text-primary">
                    {money(line.priceCents * line.quantity)}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {cart.length > 0 && (
            <div className="border-t border-border p-4">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="text-lg font-semibold">{money(total)}</span>
              </div>
              {checkoutMessage && (
                <div
                  role="status"
                  className={`mt-3 rounded-lg border p-3 text-sm ${checkoutMessage.kind === "error" ? "border-destructive/50 text-destructive" : "border-border text-muted-foreground"}`}
                >
                  {checkoutMessage.text}
                </div>
              )}
              {clientId && clientId !== "YOUR_SANDBOX_CLIENT_ID" ? (
                ready ? (
                  <div ref={buttonsRef} className="mt-4" />
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">Loading PayPal sandbox…</p>
                )
              ) : (
                <div className="mt-4 rounded-lg border border-border bg-muted p-3 text-sm text-muted-foreground">
                  Set <code>VITE_PAYPAL_CLIENT_ID</code> to a PayPal <strong>sandbox</strong> client
                  ID to enable test checkout.
                </div>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                Sandbox testing only. Checkout is captured in the browser and orders stay on this
                device; no licenses are issued.
              </p>
              <p className="mt-2 text-xs font-medium text-destructive">
                Production payments are not enabled. Use a trusted backend to create and capture
                orders, validate prices, and fulfill purchases before going live.
              </p>
            </div>
          )}
        </div>
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
          <p className="text-sm text-muted-foreground">
            No script is available right now. Please come back later.
          </p>
        ) : (
          <div className="grid max-h-72 gap-2 overflow-y-auto">
            {scripts.map((script) => (
              <button
                key={script.id}
                type="button"
                onClick={() => setSelected(script.id)}
                className={`flex items-center justify-between rounded-lg border p-3 text-left text-sm transition ${
                  selected === script.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-muted"
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
          <DialogDescription>
            Keep them safe — paste a key in the loader window to unlock the script.
          </DialogDescription>
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
                {entry.expiresAt
                  ? `Valid until ${new Date(entry.expiresAt).toLocaleString()}`
                  : "Lifetime access"}
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
