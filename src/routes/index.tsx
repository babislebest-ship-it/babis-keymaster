import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Copy,
  Menu,
  Minus,
  Plus,
  ShoppingCart,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getSiteContent, saveReview } from "@/lib/shop.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Babis Script — Premium Roblox Scripts & Lifetime Access" },
      {
        name: "description",
        content:
          "Buy premium Babis Script access: one-click loaders, lifetime or weekly plans, instant delivery. Pay with PayPal, card, Apple Pay or Google Pay.",
      },
      { property: "og:title", content: "Babis Script — Premium Roblox Scripts" },
      {
        property: "og:description",
        content: "One-click script loaders, premium plans and instant checkout with PayPal, card, Apple Pay or Google Pay.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Shop,
});

type CartLine = { id: string; title: string; price_cents: number; quantity: number };

const SECTIONS = [
  { key: "scripts", label: "Scripts" },
  { key: "premium", label: "Premium" },
  { key: "videos", label: "Videos" },
  { key: "reviews", label: "Reviews" },
  { key: "faq", label: "FAQ" },
  { key: "social", label: "Social" },
];

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function embedUrl(url: string) {
  const yt = url.match(/(?:youtu\.be\/|v=)([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  return url;
}

function Shop() {
  const fetchContent = useServerFn(getSiteContent);
  const content = useQuery({ queryKey: ["site-content"], queryFn: () => fetchContent() });
  const data = content.data as any;

  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("babis-cart");
      if (saved) setCart(JSON.parse(saved));
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("babis-cart", JSON.stringify(cart));
    } catch {
      /* ignore */
    }
  }, [cart]);

  const items: any[] = (data?.items ?? []).filter((row: any) => row.is_published);
  const plans: any[] = (data?.plans ?? []).filter((row: any) => row.is_published);
  const faq: any[] = (data?.faq ?? []).filter((row: any) => row.is_published);
  const videos: any[] = (data?.videos ?? []).filter((row: any) => row.is_published);
  const links: any[] = (data?.links ?? []).filter((row: any) => row.is_published);
  const reviews: any[] = data?.reviews ?? [];
  const discord: string = data?.discordInviteUrl ?? "https://discord.gg/75auNNfmhS";

  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const cartTotal = cart.reduce((sum, line) => sum + line.quantity * line.price_cents, 0);

  function addToCart(id: string, title: string, price_cents: number) {
    if (!price_cents) {
      window.open(discord, "_blank");
      return;
    }
    setCart((current) => {
      const found = current.find((line) => line.id === id);
      if (found) return current.map((line) => (line.id === id ? { ...line, quantity: line.quantity + 1 } : line));
      return [...current, { id, title, price_cents, quantity: 1 }];
    });
    toast.success("Added to cart", { description: title });
    setCartOpen(true);
  }

  function setQuantity(id: string, delta: number) {
    setCart((current) =>
      current
        .map((line) => (line.id === id ? { ...line, quantity: line.quantity + delta } : line))
        .filter((line) => line.quantity > 0),
    );
  }

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Loader copied");
    } catch {
      toast.error("Copy failed — select the text manually");
    }
  }

  function goTo(key: string) {
    setMenuOpen(false);
    document.getElementById(key)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <button
            onClick={() => setMenuOpen(true)}
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition hover:border-primary hover:text-primary"
            aria-label="Open menu"
          >
            <Menu className="size-4" /> Menu
          </button>
          <div className="text-lg font-semibold tracking-tight">Babis Script</div>
          <button
            onClick={() => setCartOpen(true)}
            className="relative inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition hover:border-primary hover:text-primary"
            aria-label="Open cart"
          >
            <ShoppingCart className="size-4" />
            {cartCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                {cartCount}
              </span>
            ) : null}
          </button>
        </div>
      </header>

      {/* Slide-in menu */}
      <div
        className={`fixed inset-0 z-40 transition ${menuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <div className="absolute inset-0 bg-black/60" onClick={() => setMenuOpen(false)} />
        <nav
          className={`absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-border bg-sidebar p-5 transition-transform duration-300 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="mb-6 flex items-center justify-between">
            <span className="text-base font-semibold">Navigate</span>
            <Button variant="ghost" size="icon" onClick={() => setMenuOpen(false)}>
              <X />
            </Button>
          </div>
          <div className="grid gap-2">
            {SECTIONS.map((section) => (
              <button
                key={section.key}
                onClick={() => goTo(section.key)}
                className="rounded-md border border-sidebar-border bg-sidebar-accent px-4 py-3 text-left text-sm font-medium transition hover:border-primary hover:text-primary"
              >
                {section.label}
              </button>
            ))}
            <a href={discord} target="_blank" rel="noreferrer">
              <Button className="mt-3 w-full">Join Discord</Button>
            </a>
            <Link to="/auth" className="mt-1">
              <Button variant="outline" className="w-full">
                Sign in
              </Button>
            </Link>
          </div>
        </nav>
      </div>

      {/* Hero */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">Babis Script</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Premium Roblox scripts with one-click loaders, license keys and instant checkout.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" onClick={() => goTo("premium")}>
              See premium plans
            </Button>
            <Button size="lg" variant="outline" onClick={() => goTo("scripts")}>
              Browse scripts
            </Button>
          </div>
        </div>
      </section>

      {/* Scripts */}
      <Section id="scripts" title="Scripts" subtitle="Copy a loader in one click.">
        {items.length === 0 ? (
          <Empty text="No scripts published yet." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <article key={item.id} className="app-panel flex flex-col rounded-lg p-5 transition hover:-translate-y-1">
                {item.badge ? (
                  <span className="mb-3 w-fit rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    {item.badge}
                  </span>
                ) : null}
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                {item.video_url ? (
                  <div className="mt-4 aspect-video overflow-hidden rounded-md border border-border">
                    <iframe src={embedUrl(item.video_url)} title={item.title} className="size-full" allowFullScreen />
                  </div>
                ) : null}
                {(item.features ?? []).length ? (
                  <ul className="mt-4 grid gap-1 text-sm">
                    {(item.features ?? []).map((feature: string) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <span className="mr-auto text-sm font-semibold text-primary">
                    {item.price_cents ? money(item.price_cents) : item.price_label || "Free"}
                  </span>
                  {item.loader_command ? (
                    <Button variant="outline" size="sm" onClick={() => copyText(item.loader_command)}>
                      <Copy /> Copy loader
                    </Button>
                  ) : null}
                  <Button size="sm" onClick={() => addToCart(item.id, item.title, item.price_cents ?? 0)}>
                    {item.price_cents ? "Add to cart" : "Get on Discord"}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </Section>

      {/* Premium */}
      <Section id="premium" title="Premium" subtitle="Lifetime and timed access plans.">
        {plans.length === 0 ? (
          <Empty text="No plans published yet." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => (
              <article
                key={plan.id}
                className={`app-panel flex flex-col rounded-lg p-5 transition hover:-translate-y-1 ${plan.highlight ? "border-primary" : ""}`}
              >
                <div className="text-3xl">{plan.emoji}</div>
                <h3 className="mt-2 text-lg font-semibold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.subtitle}</p>
                <div className="mt-4 text-3xl font-semibold text-primary">
                  {plan.price_cents ? money(plan.price_cents) : plan.price_label}
                </div>
                <ul className="mt-4 grid flex-1 gap-1 text-sm">
                  {(plan.perks ?? []).map((perk: string) => (
                    <li key={perk} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
                <Button className="mt-5" onClick={() => addToCart(plan.id, plan.name, plan.price_cents ?? 0)}>
                  {plan.price_cents ? "Add to cart" : plan.cta_label || "Get it on Discord"}
                </Button>
              </article>
            ))}
          </div>
        )}
      </Section>

      {/* Videos */}
      <Section id="videos" title="Videos" subtitle="Showcases and tutorials.">
        {videos.length === 0 ? (
          <Empty text="No videos yet." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {videos.map((video) => (
              <div key={video.id} className="app-panel rounded-lg p-4">
                <div className="aspect-video overflow-hidden rounded-md border border-border">
                  <iframe src={embedUrl(video.video_url)} title={video.title} className="size-full" allowFullScreen />
                </div>
                <h3 className="mt-3 font-semibold">{video.title}</h3>
                <p className="text-sm text-muted-foreground">{video.description}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Reviews */}
      <Section id="reviews" title="Reviews" subtitle="What buyers say.">
        <ReviewBlock reviews={reviews} />
      </Section>

      {/* FAQ */}
      <Section id="faq" title="FAQ" subtitle="Everything you need to know.">
        {faq.length === 0 ? (
          <Empty text="No questions yet." />
        ) : (
          <div className="mx-auto grid max-w-3xl gap-3">
            {faq.map((entry) => {
              const open = openFaq === entry.id;
              return (
                <div key={entry.id} className="app-panel overflow-hidden rounded-lg">
                  <button
                    onClick={() => setOpenFaq(open ? null : entry.id)}
                    className="flex w-full items-center justify-between gap-3 p-4 text-left font-medium"
                  >
                    {entry.question}
                    <Plus className={`size-4 shrink-0 transition-transform duration-300 ${open ? "rotate-45" : ""}`} />
                  </button>
                  <div
                    className={`grid transition-all duration-300 ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                  >
                    <div className="overflow-hidden">
                      <p className="px-4 pb-4 text-sm text-muted-foreground">{entry.answer}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Social */}
      <Section id="social" title="Social" subtitle="Follow Babis Script.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {links.length === 0 ? (
            <a href={discord} target="_blank" rel="noreferrer" className="app-panel rounded-lg p-5 transition hover:-translate-y-1">
              <div className="font-semibold">Discord</div>
              <p className="text-sm text-muted-foreground">Join the community and get support.</p>
            </a>
          ) : (
            links.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="app-panel rounded-lg p-5 transition hover:-translate-y-1"
              >
                <div className="font-semibold">{link.label}</div>
                <p className="text-sm text-muted-foreground">{link.description}</p>
              </a>
            ))
          )}
        </div>
      </Section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Babis Script ·{" "}
        <Link to="/auth" className="underline">
          Staff sign in
        </Link>
      </footer>

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        total={cartTotal}
        onQuantity={setQuantity}
        onClear={() => setCart([])}
        onPaid={() => {
          setCart([]);
          setCartOpen(false);
        }}
        discord={discord}
      />
    </main>
  );
}

function Section({ id, title, subtitle, children }: { id: string; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section id={id} className="border-b border-border">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-semibold sm:text-3xl">{title}</h2>
        <p className="mb-8 mt-1 text-sm text-muted-foreground">{subtitle}</p>
        {children}
      </div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="app-panel rounded-lg p-8 text-center text-sm text-muted-foreground">{text}</div>;
}

function ReviewBlock({ reviews }: { reviews: any[] }) {
  const queryClient = useQueryClient();
  const submit = useServerFn(saveReview);
  const [signedIn, setSignedIn] = useState(false);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="grid gap-3">
        {reviews.length === 0 ? (
          <Empty text="No reviews yet — be the first." />
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="app-panel rounded-lg p-4">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{review.author_name}</span>
                <span className="flex">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={index}
                      className={`size-4 ${index < review.rating ? "fill-primary text-primary" : "text-muted-foreground"}`}
                    />
                  ))}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{review.body}</p>
            </div>
          ))
        )}
      </div>
      <div className="app-panel h-fit rounded-lg p-5">
        <h3 className="font-semibold">Leave a review</h3>
        {signedIn ? (
          <>
            <div className="mt-3 flex gap-1">
              {Array.from({ length: 5 }).map((_, index) => (
                <button key={index} onClick={() => setRating(index + 1)} aria-label={`${index + 1} stars`}>
                  <Star className={`size-6 ${index < rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                </button>
              ))}
            </div>
            <Textarea
              className="mt-3"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Tell others about your experience"
            />
            <Button
              className="mt-3 w-full"
              disabled={saving || body.trim().length < 3}
              onClick={async () => {
                setSaving(true);
                try {
                  await submit({ data: { rating, body: body.trim() } });
                  setBody("");
                  toast.success("Thanks for your review");
                  queryClient.invalidateQueries({ queryKey: ["site-content"] });
                } catch (error: any) {
                  toast.error("Could not save review", { description: error?.message });
                } finally {
                  setSaving(false);
                }
              }}
            >
              Publish review
            </Button>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">Create a free account to leave a review.</p>
            <Link to="/auth">
              <Button className="mt-3 w-full">Sign in / Create account</Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function CartDrawer({
  open,
  onClose,
  cart,
  total,
  onQuantity,
  onClear,
  onPaid,
  discord,
}: {
  open: boolean;
  onClose: () => void;
  cart: CartLine[];
  total: number;
  onQuantity: (id: string, delta: number) => void;
  onClear: () => void;
  onPaid: () => void;
  discord: string;
}) {
  const [email, setEmail] = useState("");
  const [discordTag, setDiscordTag] = useState("");
  const [sdkReady, setSdkReady] = useState(false);
  const buttonHost = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef({ cart, email, discordTag, onPaid });
  stateRef.current = { cart, email, discordTag, onPaid };

  useEffect(() => {
    if (!open || sdkReady) return;
    let cancelled = false;
    (async () => {
      const config = await fetch("/api/public/paypal").then((res) => res.json());
      if (!config.clientId || cancelled) return;
      if (!document.getElementById("paypal-sdk")) {
        const script = document.createElement("script");
        script.id = "paypal-sdk";
        script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(config.clientId)}&currency=USD&components=buttons&enable-funding=card,venmo,paylater`;
        script.onload = () => !cancelled && setSdkReady(true);
        script.onerror = () => toast.error("Payment provider could not be loaded");
        document.body.appendChild(script);
      } else {
        setSdkReady(true);
      }
    })().catch(() => toast.error("Payment setup failed"));
    return () => {
      cancelled = true;
    };
  }, [open, sdkReady]);

  useEffect(() => {
    const paypal = (window as any).paypal;
    if (!open || !sdkReady || !paypal || !buttonHost.current) return;
    buttonHost.current.innerHTML = "";
    paypal
      .Buttons({
        style: { layout: "vertical", shape: "rect", color: "gold" },
        createOrder: async () => {
          const { cart: lines, email: mail, discordTag: tag } = stateRef.current;
          const res = await fetch("/api/public/paypal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "create",
              items: lines.map((line) => ({ id: line.id, title: line.title, quantity: line.quantity })),
              email: mail || undefined,
              discord: tag || undefined,
            }),
          });
          if (!res.ok) throw new Error(await res.text());
          return (await res.json()).id;
        },
        onApprove: async (payload: any) => {
          const { email: mail, discordTag: tag, onPaid: done } = stateRef.current;
          const res = await fetch("/api/public/paypal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "capture", orderId: payload.orderID, email: mail || undefined, discord: tag || undefined }),
          });
          const result = await res.json();
          if (result.status === "paid") {
            toast.success("Payment complete", { description: "Join the Discord to receive your access." });
            done();
            window.open(discord, "_blank");
          } else {
            toast.error("Payment was not completed");
          }
        },
        onError: () => toast.error("Payment failed, please try again"),
      })
      .render(buttonHost.current);
  }, [open, sdkReady, cart.length, discord]);

  return (
    <div className={`fixed inset-0 z-50 transition ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <aside
        className={`absolute inset-y-0 right-0 flex w-[26rem] max-w-[92vw] flex-col border-l border-border bg-card transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <span className="font-semibold">Your cart</span>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <p className="text-sm text-muted-foreground">Your cart is empty.</p>
          ) : (
            <div className="grid gap-3">
              {cart.map((line) => (
                <div key={line.id} className="rounded-md border border-border bg-muted p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{line.title}</div>
                      <div className="text-xs text-muted-foreground">{money(line.price_cents)} each</div>
                    </div>
                    <div className="font-semibold text-primary">{money(line.price_cents * line.quantity)}</div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Button size="icon" variant="outline" className="size-8" onClick={() => onQuantity(line.id, -1)}>
                      <Minus className="size-3" />
                    </Button>
                    <span className="w-6 text-center text-sm">{line.quantity}</span>
                    <Button size="icon" variant="outline" className="size-8" onClick={() => onQuantity(line.id, 1)}>
                      <Plus className="size-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="ml-auto size-8"
                      onClick={() => onQuantity(line.id, -line.quantity)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <label className="mt-2 grid gap-1 text-sm">
                Email for delivery
                <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@email.com" />
              </label>
              <label className="grid gap-1 text-sm">
                Discord username (optional)
                <Input value={discordTag} onChange={(event) => setDiscordTag(event.target.value)} placeholder="babis" />
              </label>
            </div>
          )}
        </div>
        <div className="border-t border-border p-4">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="text-lg font-semibold text-primary">{money(total)}</span>
          </div>
          {cart.length > 0 ? (
            <>
              <div ref={buttonHost} className="min-h-[3rem]" />
              <p className="mt-2 text-center text-xs text-muted-foreground">
                PayPal, credit card, Apple Pay and Google Pay accepted.
              </p>
              <Button variant="ghost" className="mt-2 w-full" onClick={onClear}>
                Clear cart
              </Button>
            </>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
