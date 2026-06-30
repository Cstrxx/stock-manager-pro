export type PartnerKind = "customer" | "supplier" | "both";

export type Partner = {
  id: string;
  company_id: string;
  kind: PartnerKind;
  name: string;
  fantasy_name: string | null;
  doc_type: "CPF" | "CNPJ" | null;
  cpf_cnpj: string | null;
  email: string | null;
  phone: string | null;
  zip_code: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export const KIND_LABEL: Record<PartnerKind, string> = {
  customer: "Cliente",
  supplier: "Fornecedor",
  both: "Cliente e fornecedor",
};
