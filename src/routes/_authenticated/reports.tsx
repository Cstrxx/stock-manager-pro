import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { User, TrendingUp, TrendingDown } from "lucide-react";
import { formatBRL, type Movement, type Product } from "@/lib/inventory";

export const Route = createFileRoute("/_authenticated/reports")({
  ssr: false,
  component: ReportsPage,
});

const PERIODS = [
  { key: "7d", label: "7 dias", days: 7 },
  { key: "1m", label: "1 mês", days: 30 },
  { key: "3m", label: "3 meses", days: 90 },
  { key: "6m", label: "6 meses", days: 180 },
  { key: "1y", label: "1 ano", days: 365 },
] as const;
type PeriodKey = (typeof PERIODS)[number]["key"];

function ReportsPage() {
  const [period, setPeriod] = useState<PeriodKey>(() => {
    if (typeof window === "undefined") return "1m";
    return (localStorage.getItem("reports:period") as PeriodKey) || "1m";
  });
  useEffect(() => { localStorage.setItem("reports:period", period); }, [period]);
  const days = PERIODS.find((p) => p.key === period)!.days;
  const since = useMemo(() => new Date(Date.now() - days * 86400_000).toISOString(), [days]);
  const prevSince = useMemo(() => new Date(Date.now() - 2 * days * 86400_000).toISOString(), [days]);

  const { data: movements = [] } = useQuery({
    queryKey: ["movements", "report", period],
    queryFn: async () => {
      const { data } = await supabase
        .from("stock_movements")
        .select("id, type, quantity, note, customer_name, unit_price, total_amount, sale_id, product_id, created_at, products(name)")
        .gte("created_at", since)
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as Movement[];
    },
  });

  const { data: prevRevenue = 0 } = useQuery({
    queryKey: ["revenue", "prev", period],
    queryFn: async () => {
      const { data } = await supabase
        .from("stock_movements")
        .select("total_amount")
        .eq("type", "out")
        .gte("created_at", prevSince)
        .lt("created_at", since);
      return (data ?? []).reduce((s, m) => s + Number(m.total_amount ?? 0), 0);
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, category, quantity, min_stock, initial_quantity, cost_price, sale_price, invoice_number, invoice_file_path, created_at, updated_at");
      return (data ?? []) as Product[];
    },
  });

  const { entries, exits, sales, ranking, totalIn, totalOut, revenue, byProductIds } = useMemo(() => {
    const entries = movements.filter((m) => m.type === "in");
    const exits = movements.filter((m) => m.type === "out");
    const totalIn = entries.reduce((s, m) => s + m.quantity, 0);
    const totalOut = exits.reduce((s, m) => s + m.quantity, 0);
    const revenue = exits.reduce((s, m) => s + Number(m.total_amount ?? 0), 0);

    // group sales by sale_id, fallback to id
    const salesMap = new Map<string, { id: string; created_at: string; customer: string; items: { name: string; qty: number; total: number }[]; total: number }>();
    for (const m of exits) {
      const key = m.sale_id ?? m.id;
      const cur = salesMap.get(key) ?? {
        id: key,
        created_at: m.created_at,
        customer: m.customer_name || "Cliente",
        items: [],
        total: 0,
      };
      cur.items.push({ name: m.products?.name ?? "—", qty: m.quantity, total: Number(m.total_amount ?? 0) });
      cur.total += Number(m.total_amount ?? 0);
      if (m.created_at < cur.created_at) cur.created_at = m.created_at;
      salesMap.set(key, cur);
    }
    const sales = [...salesMap.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));

    const byProduct = new Map<string, { name: string; in: number; out: number; total: number }>();
    for (const m of movements) {
      const cur = byProduct.get(m.product_id) ?? { name: m.products?.name ?? "—", in: 0, out: 0, total: 0 };
      if (m.type === "in") cur.in += m.quantity; else cur.out += m.quantity;
      cur.total = cur.in + cur.out;
      byProduct.set(m.product_id, cur);
    }
    const ranking = [...byProduct.values()].sort((a, b) => b.total - a.total).slice(0, 10);

    return { entries, exits, sales, ranking, totalIn, totalOut, revenue, byProductIds: new Set(byProduct.keys()) };
  }, [movements]);

  const stale = products.filter((p) => !byProductIds.has(p.id));

  const deltaPct = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : (revenue > 0 ? 100 : 0);

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Relatórios</h1>
          <p className="text-sm text-muted-foreground">Vendas, movimentações e desempenho do estoque.</p>
        </div>
        <div className="flex flex-wrap gap-1 bg-muted/50 p-1 rounded-md">
          {PERIODS.map((p) => (
            <Button
              key={p.key}
              size="sm"
              variant={period === p.key ? "default" : "ghost"}
              className="h-7 px-3 text-xs"
              onClick={() => setPeriod(p.key)}
            >{p.label}</Button>
          ))}
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Summary
          label="Receita (saídas)"
          value={formatBRL(revenue)}
          tone="primary"
          delta={deltaPct}
        />
        <Summary label="Vendas registradas" value={sales.length.toLocaleString("pt-BR")} />
        <Summary label="Itens vendidos" value={totalOut.toLocaleString("pt-BR")} tone="warning" />
        <Summary label="Itens recebidos" value={totalIn.toLocaleString("pt-BR")} />
      </div>

      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">Vendas</TabsTrigger>
          <TabsTrigger value="ranking">Mais movimentados</TabsTrigger>
          <TabsTrigger value="entries">Entradas</TabsTrigger>
          <TabsTrigger value="stale">Parados</TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <Card>
            <CardHeader><CardTitle className="text-base">Histórico de vendas</CardTitle></CardHeader>
            <CardContent className="p-0">
              {sales.length === 0 ? (
                <p className="text-center text-muted-foreground py-10 text-sm">Nenhuma venda registrada ainda.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {sales.map((s) => {
                    const d = new Date(s.created_at);
                    return (
                      <li key={s.id} className="p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{d.toLocaleDateString("pt-BR")}</span>
                            <span>·</span>
                            <span>{d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 text-sm font-medium">
                            <User className="size-3.5 text-muted-foreground" /> {s.customer}
                          </div>
                          <ul className="mt-2 space-y-0.5 text-sm text-muted-foreground">
                            {s.items.map((it, i) => (
                              <li key={i} className="flex items-center gap-2">
                                <span className="text-foreground">{it.name}</span>
                                <Badge variant="outline" className="font-normal">×{it.qty}</Badge>
                                {it.total > 0 && <span className="text-xs">{formatBRL(it.total)}</span>}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs text-muted-foreground">Total</div>
                          <div className="text-lg font-semibold tabular-nums">{formatBRL(s.total)}</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ranking">
          <Card><CardHeader><CardTitle className="text-base">Top 10 produtos mais movimentados</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Entradas</TableHead>
                  <TableHead className="text-right">Saídas</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {ranking.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Sem dados ainda.</TableCell></TableRow>
                  ) : ranking.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-right tabular-nums text-primary">+{r.in}</TableCell>
                      <TableCell className="text-right tabular-nums text-destructive">−{r.out}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{r.total}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entries">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhuma entrada.</TableCell></TableRow>
                ) : entries.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">{new Date(m.created_at).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="font-medium">{m.products?.name ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums text-primary">+{m.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{m.total_amount != null ? formatBRL(Number(m.total_amount)) : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="stale">
          <Card><CardHeader><CardTitle className="text-base">Produtos sem movimentação</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Estoque</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {stale.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Todos os produtos tiveram movimentação.</TableCell></TableRow>
                  ) : stale.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-muted-foreground">{p.category ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{p.quantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Summary({ label, value, tone, delta }: { label: string; value: string; tone?: "primary" | "warning"; delta?: number }) {
  const cls = tone === "primary" ? "text-primary" : tone === "warning" ? "text-warning" : "text-foreground";
  const positive = (delta ?? 0) >= 0;
  return (
    <Card><CardContent className="p-5">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-2 text-2xl font-semibold tabular-nums ${cls}`}>{value}</div>
      {delta != null && (
        <div className={`mt-1 text-xs flex items-center gap-1 ${positive ? "text-primary" : "text-destructive"}`}>
          {positive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
          {positive ? "+" : ""}{delta.toFixed(1)}% vs. período anterior
        </div>
      )}
    </CardContent></Card>
  );
}
