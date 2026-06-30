
-- Add CPF/CNPJ to companies (the distributor/business itself)
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS cpf_cnpj text,
  ADD COLUMN IF NOT EXISTS doc_type text CHECK (doc_type IN ('CPF','CNPJ'));

CREATE UNIQUE INDEX IF NOT EXISTS companies_cpf_cnpj_unique
  ON public.companies (cpf_cnpj) WHERE cpf_cnpj IS NOT NULL;

-- Update signup trigger to persist document provided on sign-up metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_company_id uuid;
  cname text;
  fname text;
  cdoc text;
  cdoc_type text;
BEGIN
  cname := COALESCE(NEW.raw_user_meta_data->>'company_name', 'Minha Empresa');
  fname := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  cdoc := regexp_replace(COALESCE(NEW.raw_user_meta_data->>'company_doc',''), '\D','','g');
  IF length(cdoc) = 11 THEN cdoc_type := 'CPF';
  ELSIF length(cdoc) = 14 THEN cdoc_type := 'CNPJ';
  ELSE cdoc := NULL; cdoc_type := NULL;
  END IF;

  INSERT INTO public.companies (name, owner_id, cpf_cnpj, doc_type)
  VALUES (cname, NEW.id, cdoc, cdoc_type)
  RETURNING id INTO new_company_id;

  INSERT INTO public.profiles (id, company_id, full_name, email)
  VALUES (NEW.id, new_company_id, fname, NEW.email);
  RETURN NEW;
END;
$function$;
