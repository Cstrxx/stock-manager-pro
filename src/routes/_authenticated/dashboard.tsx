import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, XCircle, ArrowLeftRight, Clock } from "lucide-react";
import { stockStatus, type Product, type Movement } from "@/lib/inventory";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  ssr: false,
  component: Dashboard,
});

function Dashboard() {
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").order("name");
      return (data ?? []) as Product[];
    },
  });

  const { data: movements = [] } = useQuery({
    queryKey: ["movements", "recent"],
    queryFn: async () => {
      const { data } = await supabase
        .from("stock_movements")
        .select("*, products(name)")
        .order("created_at", { ascending: false })
        .limit(8);
      return (data ?? []) as Movement[];
    },
  });

  const totalItems = products.reduce((s, p) => s + p.quantity, 0);
  const low = products.filter((p) => stockStatus(p) === "low").length;
  const out = products.filter((p) => stockStatus(p) === "out").length;
  const movedQty = movements.reduce((s, m) => s + m.quantity, 0);

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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Produtos cadastrados" value={products.length} icon={Package} />
        <StatCard label="Itens em estoque" value={totalItems} icon={ArrowLeftRight} accent />
        <StatCard label="Estoque baixo" value={low} icon={AlertTriangle} tone="warning" />
        <StatCard label="Esgotados" value={out} icon={XCircle} tone="danger" />
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
                <div key={m.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Badge variant={m.type === "in" ? "default" : "secondary"} className={m.type === "in" ? "bg-primary/15 text-primary border-primary/20" : "bg-warning/15 text-warning border-warning/20"}>
                      {m.type === "in" ? "Entrada" : "Saída"}
                    </Badge>
                    <div>
                      <div className="text-sm font-medium">{m.products?.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString("pt-BR")}</div>
                    </div>
                  </div>
                  <div className={`text-sm tabular-nums font-medium ${m.type === "in" ? "text-primary" : "text-warning"}`}>
                    {m.type === "in" ? "+" : "−"}{m.quantity}
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

function StatCard({ label, value, icon: Icon, accent, tone }: { label: string; value: number; icon: any; accent?: boolean; tone?: "warning" | "danger" }) {
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
        <div className={`mt-3 text-3xl font-semibold tabular-nums ${toneClass}`}>{value.toLocaleString("pt-BR")}</div>
      </CardContent>
    </Card>
  );
}
