import { supabase } from "@/integrations/supabase/client";

// Configurações globais
export const TRIAL_DAYS = 14;
export const TRIAL_WARN_DAYS = 3;
export const LOW_STOCK_THRESHOLD_PERCENT = 75;

export type Product = {
  id: string;
  name: string;
  category: string | null;
  quantity: number;
  min_stock: number;
  initial_quantity: number;
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

export function soldPercent(p: Pick<Product, "quantity" | "initial_quantity">): number {
  const initial = Math.max(1, p.initial_quantity ?? 0);
  const sold = Math.max(0, initial - p.quantity);
  return Math.min(100, (sold / initial) * 100);
}

export function remainingPercent(p: Pick<Product, "quantity" | "initial_quantity">): number {
  const initial = Math.max(1, p.initial_quantity ?? 0);
  return Math.max(0, Math.min(100, (p.quantity / initial) * 100));
}

export type StockStatus = "ok" | "low" | "critical" | "out";

export function stockStatus(p: Pick<Product, "quantity" | "min_stock" | "initial_quantity">): StockStatus {
  if (p.quantity <= 0) return "out";
  const remaining = remainingPercent(p);
  if (remaining <= 10) return "critical";
  if (remaining <= 25) return "low";
  if (p.quantity <= p.min_stock) return "low";
  return "ok";
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

export function trialExpired(company: Pick<Company, "trial_ends_at" | "subscription_status"> | null | undefined): boolean {
  if (!company) return false;
  if (company.subscription_status !== "trialing") return false;
  return new Date(company.trial_ends_at).getTime() <= Date.now();
}
