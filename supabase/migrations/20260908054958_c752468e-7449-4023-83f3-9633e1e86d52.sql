ALTER TABLE public.shop_items ADD COLUMN IF NOT EXISTS price_cents integer NOT NULL DEFAULT 0;
ALTER TABLE public.pricing_plans ADD COLUMN IF NOT EXISTS price_cents integer NOT NULL DEFAULT 0;
ALTER TABLE public.shop_items ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';
ALTER TABLE public.pricing_plans ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paypal_order_id text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'created',
  buyer_email text,
  buyer_name text,
  discord_tag text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  amount_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view orders" ON public.orders
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'owner'::app_role));

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();