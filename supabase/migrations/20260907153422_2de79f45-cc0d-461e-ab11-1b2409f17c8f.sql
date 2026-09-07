
-- SHOP ITEMS
CREATE TABLE public.shop_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  features text[] NOT NULL DEFAULT '{}',
  video_url text,
  image_url text,
  loader_command text NOT NULL DEFAULT '',
  price_label text NOT NULL DEFAULT '',
  badge text,
  is_published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shop_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_items TO authenticated;
GRANT ALL ON public.shop_items TO service_role;
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view shop items" ON public.shop_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owners manage shop items" ON public.shop_items FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'owner'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'owner'::app_role));
CREATE TRIGGER update_shop_items_updated_at BEFORE UPDATE ON public.shop_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PRICING PLANS
CREATE TABLE public.pricing_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price_label text NOT NULL DEFAULT '',
  subtitle text NOT NULL DEFAULT '',
  perks text[] NOT NULL DEFAULT '{}',
  highlight boolean NOT NULL DEFAULT false,
  emoji text NOT NULL DEFAULT '',
  cta_label text NOT NULL DEFAULT 'Get it on Discord',
  cta_url text,
  is_published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pricing_plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_plans TO authenticated;
GRANT ALL ON public.pricing_plans TO service_role;
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view pricing plans" ON public.pricing_plans FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owners manage pricing plans" ON public.pricing_plans FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'owner'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'owner'::app_role));
CREATE TRIGGER update_pricing_plans_updated_at BEFORE UPDATE ON public.pricing_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- FAQ
CREATE TABLE public.site_faq (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL DEFAULT '',
  is_published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_faq TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_faq TO authenticated;
GRANT ALL ON public.site_faq TO service_role;
ALTER TABLE public.site_faq ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view faq" ON public.site_faq FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owners manage faq" ON public.site_faq FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'owner'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'owner'::app_role));
CREATE TRIGGER update_site_faq_updated_at BEFORE UPDATE ON public.site_faq
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- VIDEOS
CREATE TABLE public.site_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  video_url text NOT NULL,
  is_published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_videos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_videos TO authenticated;
GRANT ALL ON public.site_videos TO service_role;
ALTER TABLE public.site_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view videos" ON public.site_videos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owners manage videos" ON public.site_videos FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'owner'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'owner'::app_role));
CREATE TRIGGER update_site_videos_updated_at BEFORE UPDATE ON public.site_videos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SOCIAL LINKS
CREATE TABLE public.site_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL DEFAULT 'link',
  label text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  url text NOT NULL,
  is_published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_links TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_links TO authenticated;
GRANT ALL ON public.site_links TO service_role;
ALTER TABLE public.site_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view links" ON public.site_links FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owners manage links" ON public.site_links FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'owner'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'owner'::app_role));
CREATE TRIGGER update_site_links_updated_at BEFORE UPDATE ON public.site_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- MENU TABS
CREATE TABLE public.site_tabs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  section_key text NOT NULL,
  is_published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_tabs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_tabs TO authenticated;
GRANT ALL ON public.site_tabs TO service_role;
ALTER TABLE public.site_tabs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view tabs" ON public.site_tabs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owners manage tabs" ON public.site_tabs FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'owner'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'owner'::app_role));
CREATE TRIGGER update_site_tabs_updated_at BEFORE UPDATE ON public.site_tabs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- REVIEWS
CREATE TABLE public.site_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  author_name text NOT NULL DEFAULT '',
  rating smallint NOT NULL DEFAULT 5,
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
GRANT SELECT ON public.site_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_reviews TO authenticated;
GRANT ALL ON public.site_reviews TO service_role;
ALTER TABLE public.site_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view reviews" ON public.site_reviews FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users can write their own review" ON public.site_reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND rating BETWEEN 1 AND 5);
CREATE POLICY "Users can update their own review" ON public.site_reviews FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND rating BETWEEN 1 AND 5);
CREATE POLICY "Authors and owners can delete reviews" ON public.site_reviews FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'owner'::app_role));
CREATE TRIGGER update_site_reviews_updated_at BEFORE UPDATE ON public.site_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SEED PRICING PLANS
INSERT INTO public.pricing_plans (name, price_label, subtitle, perks, highlight, emoji, sort_order) VALUES
  ('All Scripts — Lifetime', '$10 USD', '+ applicable taxes', ARRAY['Lifetime license','Access to ALL premium scripts','Instant license key'], true, '👑', 1),
  ('All Scripts — 2 Weeks', '$5 USD', '+ applicable taxes', ARRAY['2-week license','Access to ALL premium scripts','Instant license key'], false, '💎', 2),
  ('One Script — Lifetime', '$5 USD', '+ applicable taxes', ARRAY['Lifetime access','Choose 1 script of your choice','Instant license key'], false, '⭐', 3),
  ('One Script — 1 Week', '$2 USD', '+ applicable taxes', ARRAY['1-week access','Choose 1 script of your choice','Instant license key'], false, '✦', 4);

-- SEED TABS
INSERT INTO public.site_tabs (label, section_key, sort_order) VALUES
  ('Scripts', 'scripts', 1), ('Premium', 'premium', 2), ('Videos', 'videos', 3),
  ('Reviews', 'reviews', 4), ('FAQ', 'faq', 5), ('Social', 'social', 6);
