
-- 1) Trial: 30 -> 14 dias
ALTER TABLE public.companies
  ALTER COLUMN trial_ends_at SET DEFAULT (now() + interval '14 days');

UPDATE public.companies
   SET trial_ends_at = created_at + interval '14 days'
 WHERE subscription_status = 'trialing';

-- 2) Ciclo de referência do estoque para o alerta de 75%
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS initial_quantity integer NOT NULL DEFAULT 0;

UPDATE public.products
   SET initial_quantity = GREATEST(quantity, 1)
 WHERE initial_quantity = 0;

-- Atualiza trigger de movimentação: entradas reiniciam o ciclo
CREATE OR REPLACE FUNCTION public.apply_stock_movement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    UPDATE public.products
       SET quantity = quantity + NEW.quantity,
           initial_quantity = GREATEST(quantity + NEW.quantity, 1),
           updated_at = now()
     WHERE id = NEW.product_id;
  ELSE
    IF cur_qty < NEW.quantity THEN
      RAISE EXCEPTION 'Estoque insuficiente. Disponível: %', cur_qty;
    END IF;
    UPDATE public.products SET quantity = quantity - NEW.quantity, updated_at = now() WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$function$;

-- 3) Índices de performance
CREATE INDEX IF NOT EXISTS idx_stock_movements_company_created
  ON public.stock_movements (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_company_type_created
  ON public.stock_movements (company_id, type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_created
  ON public.stock_movements (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_company_name
  ON public.products (company_id, name);
CREATE INDEX IF NOT EXISTS idx_partners_company_name
  ON public.partners (company_id, name);
