
-- 1. Companies: single plan + trial
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'trialing';

UPDATE public.companies SET plan = 'complete' WHERE plan <> 'complete';
ALTER TABLE public.companies ALTER COLUMN plan SET DEFAULT 'complete';

-- 2. Products: optional invoice fields
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS invoice_number text,
  ADD COLUMN IF NOT EXISTS invoice_file_path text;

-- 3. Stock movements: optional customer + sale grouping + pricing
ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS unit_price numeric,
  ADD COLUMN IF NOT EXISTS total_amount numeric,
  ADD COLUMN IF NOT EXISTS sale_id uuid;

-- 4. Performance indexes
CREATE INDEX IF NOT EXISTS idx_products_company_name ON public.products(company_id, name);
CREATE INDEX IF NOT EXISTS idx_products_company_updated ON public.products(company_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_movements_company_created ON public.stock_movements(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movements_product_created ON public.stock_movements(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movements_sale ON public.stock_movements(sale_id) WHERE sale_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_company ON public.profiles(company_id);
