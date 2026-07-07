import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, XCircle, CheckCircle2 } from "lucide-react";
import { stockStatus, soldPercent, type Product } from "@/lib/inventory";

export const Route = createFileRoute("/_authenticated/alerts")({
  ssr: false,
  component: AlertsPage,
});

function AlertsPage() {
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

  const out = products.filter((p) => stockStatus(p) === "out");
  const critical = products.filter((p) => stockStatus(p) === "critical");
  const low = products.filter((p) => stockStatus(p) === "low");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Alertas de estoque</h1>
        <p className="text-sm text-muted-foreground">Produtos que precisam de reposição.</p>
      </header>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base flex items-center gap-2"><XCircle className="size-4 text-destructive" /> Esgotados</CardTitle>
            <Badge variant="outline">{out.length}</Badge>
          </CardHeader>
          <CardContent>
            <AlertList items={out} empty="Nenhum produto esgotado." />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="size-4 text-warning" /> Estoque baixo</CardTitle>
            <Badge variant="outline">{low.length}</Badge>
          </CardHeader>
          <CardContent>
            <AlertList items={low} empty="Nenhum item com estoque baixo." />
          </CardContent>
        </Card>
      </div>

      {out.length === 0 && low.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="size-4 text-primary" />
          Tudo certo com o seu estoque.
        </div>
      )}
    </div>
  );
}

function AlertList({ items, empty }: { items: Product[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground py-6 text-center">{empty}</p>;
  return (
    <ul className="divide-y divide-border">
      {items.map((p) => {
        const pct = Math.round(soldPercent(p));
        return (
          <li key={p.id} className="py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{p.name}</div>
              <div className="text-xs text-muted-foreground truncate">{p.category ?? "Sem categoria"} · {pct}% vendido do ciclo</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-sm tabular-nums">{p.quantity} <span className="text-muted-foreground">/ {p.initial_quantity}</span></div>
              <div className="text-[11px] text-muted-foreground">mín {p.min_stock}</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
