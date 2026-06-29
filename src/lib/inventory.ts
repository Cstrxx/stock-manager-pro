import { supabase } from "@/integrations/supabase/client";

export type Product = {
  id: string;
  name: string;
  category: string | null;
  quantity: number;
  min_stock: number;
  cost_price: number | null;
  sale_price: number | null;
  invoice_number: string | null;
  invoice_file_path: string | null;
  created_at: string;
  updated_at: string;
};

export type Movement = {
  id: string;
  product_id: string;
  type: "in" | "out";
  quantity: number;
  note: string | null;
  customer_name: string | null;
  unit_price: number | null;
  total_amount: number | null;
  sale_id: string | null;
  created_at: string;
  products?: { name: string } | null;
};

export type Company = {
  id: string;
  name: string;
  plan: string;
  trial_ends_at: string;
  subscription_status: string;
};

export function stockStatus(p: Pick<Product, "quantity" | "min_stock">) {
  if (p.quantity <= 0) return "out" as const;
  if (p.quantity <= p.min_stock) return "low" as const;
  return "ok" as const;
}

export async function getCompanyId(): Promise<string> {
  const { data } = await supabase.from("profiles").select("company_id").maybeSingle();
  if (!data?.company_id) throw new Error("Empresa não encontrada");
  return data.company_id as string;
}

export function formatBRL(value: number | null | undefined): string {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function daysLeft(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
