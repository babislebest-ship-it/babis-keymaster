# Babis Script — Public Shop & Landing Site

A public, animated storefront at `/` that anyone can visit, plus an owner-only editor so you can add and remove everything from the site itself. The current admin dashboard moves to `/panel` and stays exactly as it is.

## What visitors see

**Top bar with a hamburger (three lines)**
- Slide-in animated menu with: Scripts, Premium, FAQ, Videos, Reviews, Social links.
- Smooth open/close and hover animations, dark premium look matching the current theme.

**Scripts section**
- A card per script: name, description, an optional preview video, feature list, and a big one-click **Copy loader** button.
- Copy works without an account.

**Premium section**
- Four price cards, exactly as you sent them:
  - All Scripts — Lifetime — $10 USD
  - All Scripts — 2 Weeks — $5 USD
  - One Script — Lifetime — $5 USD
  - One Script — 1 Week — $2 USD
- Each with its bullet perks and a "Get it on Discord" button pointing at your saved Discord invite.

**FAQ section**
- Question/answer list with expand/collapse animation.

**Videos section**
- Embedded YouTube/TikTok clips added by the owner.

**Reviews section**
- Visitors create an account (username + password, with password confirmation) and can leave one review: star rating + text.
- Reviews appear publicly with the author's username; the owner can delete any review.

**Social links**
- YouTube, TikTok, Instagram, Discord and any other link you add, each with an icon and its own description.

## What the owner can do

Signed in as owner, an "Edit site" mode appears on the public page:
- Add / edit / delete shop items (name, description, features, video URL, loader command, price tag, order).
- Add / edit / delete FAQ entries, videos, social links, and price plans.
- Add / rename / hide menu tabs and reorder every section.
- Delete any visitor review.

Everything saves instantly and shows up for visitors right away.

## Technical notes

- New tables: `shop_items`, `site_links`, `site_faq`, `site_videos`, `pricing_plans`, `site_reviews`, `site_tabs` — all with public read for anyone, and write restricted to the owner role. Reviews: insert/update restricted to the review's own author, delete allowed for author or owner.
- Reviews use the existing Supabase email/password auth; the signup form collects username + password + confirm, stores the username in `profiles`, and uses a synthetic email so no email is required.
- Routing: `src/routes/index.tsx` becomes the public shop (SSR, with head metadata for SEO); the current dashboard moves unchanged to `src/routes/panel.tsx`, and the sign-in page keeps redirecting staff there.
- Data reads on the public page go through a public server function using the publishable key; owner writes go through authenticated server functions with an owner-role check.
- Animations use CSS/Tailwind transitions and existing keyframes (fade/scale/slide) — no new animation library, to keep it light.
- Pricing plans are seeded with the four tiers above in the migration.

## Out of scope

- No payment processing — buttons link to Discord.
- No change to the loader, license, ban, or tracking logic.
