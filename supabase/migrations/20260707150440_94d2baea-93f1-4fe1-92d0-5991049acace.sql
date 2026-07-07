
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('low_stock','critical_stock','out_of_stock')),
  title text NOT NULL,
  message text NOT NULL,
  quantity_remaining integer,
  percent_remaining numeric(5,2),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company notifications select" ON public.notifications
  FOR SELECT TO authenticated USING (company_id = public.get_user_company_id());
CREATE POLICY "company notifications update" ON public.notifications
  FOR UPDATE TO authenticated USING (company_id = public.get_user_company_id());
CREATE POLICY "company notifications delete" ON public.notifications
  FOR DELETE TO authenticated USING (company_id = public.get_user_company_id());

CREATE INDEX idx_notifications_company_created
  ON public.notifications(company_id, created_at DESC);
CREATE INDEX idx_notifications_unread
  ON public.notifications(company_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_product_type_unread
  ON public.notifications(product_id, type) WHERE read_at IS NULL;

-- Trigger: cria notificações quando o estoque cai
CREATE OR REPLACE FUNCTION public.check_low_stock_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pct numeric;
  ntype text;
  ntitle text;
  nmsg text;
  initial integer;
BEGIN
  initial := GREATEST(1, COALESCE(NEW.initial_quantity, 1));
  pct := (NEW.quantity::numeric / initial::numeric) * 100;

  IF NEW.quantity <= 0 THEN
    ntype := 'out_of_stock';
    ntitle := 'Produto esgotado';
    nmsg := NEW.name || ' está sem estoque.';
  ELSIF pct <= 10 THEN
    ntype := 'critical_stock';
    ntitle := 'Estoque crítico';
    nmsg := NEW.name || ' com apenas ' || NEW.quantity || ' unidade(s) restantes (' || round(pct) || '%).';
  ELSIF pct <= 25 THEN
    ntype := 'low_stock';
    ntitle := 'Estoque baixo';
    nmsg := NEW.name || ' com ' || NEW.quantity || ' unidade(s) restantes (' || round(pct) || '%).';
  ELSE
    RETURN NEW;
  END IF;

  -- Evita duplicar enquanto usuário não leu a última notificação do mesmo tipo
  IF EXISTS (
    SELECT 1 FROM public.notifications
    WHERE product_id = NEW.id AND type = ntype AND read_at IS NULL
    LIMIT 1
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications
    (company_id, product_id, type, title, message, quantity_remaining, percent_remaining)
  VALUES
    (NEW.company_id, NEW.id, ntype, ntitle, nmsg, NEW.quantity, round(pct, 2));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_check_low_stock ON public.products;
CREATE TRIGGER products_check_low_stock
  AFTER UPDATE OF quantity ON public.products
  FOR EACH ROW
  WHEN (NEW.quantity < OLD.quantity)
  EXECUTE FUNCTION public.check_low_stock_notification();

-- Backfill: cria notificações iniciais para produtos já em situação de alerta
INSERT INTO public.notifications
  (company_id, product_id, type, title, message, quantity_remaining, percent_remaining)
SELECT
  p.company_id,
  p.id,
  CASE
    WHEN p.quantity <= 0 THEN 'out_of_stock'
    WHEN (p.quantity::numeric / GREATEST(1, p.initial_quantity)::numeric) * 100 <= 10 THEN 'critical_stock'
    ELSE 'low_stock'
  END,
  CASE
    WHEN p.quantity <= 0 THEN 'Produto esgotado'
    WHEN (p.quantity::numeric / GREATEST(1, p.initial_quantity)::numeric) * 100 <= 10 THEN 'Estoque crítico'
    ELSE 'Estoque baixo'
  END,
  p.name || CASE
    WHEN p.quantity <= 0 THEN ' está sem estoque.'
    ELSE ' com ' || p.quantity || ' unidade(s) restantes (' ||
         round((p.quantity::numeric / GREATEST(1, p.initial_quantity)::numeric) * 100) || '%).'
  END,
  p.quantity,
  round((p.quantity::numeric / GREATEST(1, p.initial_quantity)::numeric) * 100, 2)
FROM public.products p
WHERE (
    p.quantity <= 0
    OR (p.quantity::numeric / GREATEST(1, p.initial_quantity)::numeric) * 100 <= 25
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.product_id = p.id AND n.read_at IS NULL
  );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
