import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, AlertTriangle, XCircle, ArrowLeftRight, Clock, DollarSign, Plus, ArrowRight } from "lucide-react";
import { stockStatus, formatBRL, type Product, type Movement } from "@/lib/inventory";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";



export const Route = createFileRoute("/_authenticated/dashboard")({
  ssr: false,
  component: Dashboard,
});

function Dashboard() {
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, category, quantity, min_stock, initial_quantity, cost_price, sale_price, invoice_number, invoice_file_path, created_at, updated_at")
        .order("name");
      return (data ?? []) as Product[];
    },
  });

  const { data: movements = [] } = useQuery({
    queryKey: ["movements", "recent"],
    queryFn: async () => {
      const { data } = await supabase
        .from("stock_movements")
        .select("id, type, quantity, customer_name, total_amount, product_id, created_at, products(name)")
        .order("created_at", { ascending: false })
        .limit(8);
      return (data ?? []) as unknown as Movement[];
    },
  });

  const stats = useMemo(() => {
    let totalItems = 0, low = 0, out = 0;
    for (const p of products) {
      totalItems += p.quantity;
      const s = stockStatus(p);
      if (s === "low") low++;
      else if (s === "out") out++;
    }
    return { totalItems, low, out };
  }, [products]);

  // 30-day revenue
  const { data: revenue = 0 } = useQuery({
    queryKey: ["revenue", "30d"],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("stock_movements")
        .select("total_amount")
        .eq("type", "out")
        .gte("created_at", since);
      return (data ?? []).reduce((s, m) => s + Number(m.total_amount ?? 0), 0);
    },
  });

  const lastUpdate = products.reduce<string | null>((acc, p) => {
    if (!acc || p.updated_at > acc) return p.updated_at;
    return acc;
  }, null);

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral em tempo real do seu estoque.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="size-3.5" />
          Última atualização: {lastUpdate ? new Date(lastUpdate).toLocaleString("pt-BR") : "—"}
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Produtos" value={products.length.toLocaleString("pt-BR")} icon={Package} />
        <StatCard label="Itens em estoque" value={stats.totalItems.toLocaleString("pt-BR")} icon={ArrowLeftRight} accent />
        <StatCard label="Receita (30d)" value={formatBRL(revenue)} icon={DollarSign} accent />
        <StatCard label="Estoque baixo" value={stats.low.toLocaleString("pt-BR")} icon={AlertTriangle} tone="warning" />
        <StatCard label="Esgotados" value={stats.out.toLocaleString("pt-BR")} icon={XCircle} tone="danger" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimas movimentações</CardTitle>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma movimentação registrada ainda.</p>
          ) : (
            <div className="divide-y divide-border">
              {movements.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-3 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge className={m.type === "in" ? "bg-primary/15 text-primary border-primary/20" : "bg-destructive/15 text-destructive border-destructive/30"}>
                      {m.type === "in" ? "Entrada" : "Saída"}
                    </Badge>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{m.products?.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {new Date(m.created_at).toLocaleString("pt-BR")}
                        {m.type === "out" && ` · ${m.customer_name || "Cliente"}`}
                      </div>
                    </div>
                  </div>
                  <div className={`text-sm tabular-nums font-medium text-right shrink-0 ${m.type === "in" ? "text-primary" : "text-destructive"}`}>
                    {m.type === "in" ? "+" : "−"}{m.quantity}
                    {m.total_amount != null && (
                      <div className="text-xs text-muted-foreground font-normal">{formatBRL(Number(m.total_amount))}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, accent, tone }: { label: string; value: string; icon: any; accent?: boolean; tone?: "warning" | "danger" }) {
  const toneClass = tone === "warning"
    ? "text-warning"
    : tone === "danger"
    ? "text-destructive"
    : accent
    ? "text-primary"
    : "text-foreground";
  return (
    <Card style={{ boxShadow: "var(--shadow-card)" }}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
          <Icon className={`size-4 ${toneClass}`} />
        </div>
        <div className={`mt-3 text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
