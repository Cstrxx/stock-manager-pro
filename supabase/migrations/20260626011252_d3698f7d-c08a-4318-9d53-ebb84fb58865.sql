
-- COMPANIES
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL,
  plan text NOT NULL DEFAULT 'free',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  full_name text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's company
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid()
$$;

-- POLICIES: companies
CREATE POLICY "view own company" ON public.companies FOR SELECT TO authenticated
  USING (id = public.get_user_company_id());
CREATE POLICY "update own company" ON public.companies FOR UPDATE TO authenticated
  USING (id = public.get_user_company_id());
CREATE POLICY "insert own company" ON public.companies FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- POLICIES: profiles
CREATE POLICY "view own profile" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR company_id = public.get_user_company_id());
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- PRODUCTS
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  min_stock integer NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  cost_price numeric(12,2),
  sale_price numeric(12,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX products_company_idx ON public.products(company_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company products select" ON public.products FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());
CREATE POLICY "company products insert" ON public.products FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id());
CREATE POLICY "company products update" ON public.products FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id());
CREATE POLICY "company products delete" ON public.products FOR DELETE TO authenticated
  USING (company_id = public.get_user_company_id());

-- STOCK MOVEMENTS
CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('in','out')),
  quantity integer NOT NULL CHECK (quantity > 0),
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX movements_company_idx ON public.stock_movements(company_id, created_at DESC);
CREATE INDEX movements_product_idx ON public.stock_movements(product_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company movements select" ON public.stock_movements FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());
CREATE POLICY "company movements insert" ON public.stock_movements FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id());

-- Trigger: apply movement to product quantity
CREATE OR REPLACE FUNCTION public.apply_stock_movement()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cur_qty integer;
  prod_company uuid;
BEGIN
  SELECT quantity, company_id INTO cur_qty, prod_company FROM public.products WHERE id = NEW.product_id FOR UPDATE;
  IF cur_qty IS NULL THEN
    RAISE EXCEPTION 'Produto não encontrado';
  END IF;
  IF prod_company <> NEW.company_id THEN
    RAISE EXCEPTION 'Empresa do produto não corresponde';
  END IF;
  IF NEW.type = 'in' THEN
    UPDATE public.products SET quantity = quantity + NEW.quantity, updated_at = now() WHERE id = NEW.product_id;
  ELSE
    IF cur_qty < NEW.quantity THEN
      RAISE EXCEPTION 'Estoque insuficiente. Disponível: %', cur_qty;
    END IF;
    UPDATE public.products SET quantity = quantity - NEW.quantity, updated_at = now() WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER stock_movement_apply
AFTER INSERT ON public.stock_movements
FOR EACH ROW EXECUTE FUNCTION public.apply_stock_movement();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER products_touch BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER companies_touch BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- New user trigger: create company + profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_company_id uuid;
  cname text;
  fname text;
BEGIN
  cname := COALESCE(NEW.raw_user_meta_data->>'company_name', 'Minha Empresa');
  fname := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  INSERT INTO public.companies (name, owner_id) VALUES (cname, NEW.id) RETURNING id INTO new_company_id;
  INSERT INTO public.profiles (id, company_id, full_name, email) VALUES (NEW.id, new_company_id, fname, NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
