
-- partners table (clients & suppliers)
CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('customer','supplier','both')),
  name text NOT NULL,
  fantasy_name text,
  doc_type text CHECK (doc_type IN ('CPF','CNPJ')),
  cpf_cnpj text,
  email text,
  phone text,
  zip_code text,
  address text,
  city text,
  state text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX partners_company_doc_uidx
  ON public.partners(company_id, cpf_cnpj)
  WHERE cpf_cnpj IS NOT NULL;

CREATE INDEX partners_company_kind_idx ON public.partners(company_id, kind);
CREATE INDEX partners_company_name_idx ON public.partners(company_id, name);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partners TO authenticated;
GRANT ALL ON public.partners TO service_role;

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company partners select" ON public.partners
  FOR SELECT TO authenticated USING (company_id = public.get_user_company_id());
CREATE POLICY "company partners insert" ON public.partners
  FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id());
CREATE POLICY "company partners update" ON public.partners
  FOR UPDATE TO authenticated USING (company_id = public.get_user_company_id());
CREATE POLICY "company partners delete" ON public.partners
  FOR DELETE TO authenticated USING (company_id = public.get_user_company_id());

CREATE TRIGGER partners_touch_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- link movements to a partner (optional)
ALTER TABLE public.stock_movements
  ADD COLUMN partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL;

CREATE INDEX stock_movements_partner_idx ON public.stock_movements(partner_id);
