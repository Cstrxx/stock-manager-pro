import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Movement, Product } from "@/lib/inventory";

export const Route = createFileRoute("/_authenticated/reports")({
  ssr: false,
  component: ReportsPage,
});

function ReportsPage() {
  const { data: movements = [] } = useQuery({
    queryKey: ["movements", "all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("stock_movements")
        .select("*, products(name)")
        .order("created_at", { ascending: false })
        .limit(500);
      return (data ?? []) as Movement[];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*");
      return (data ?? []) as Product[];
    },
  });

  const entries = movements.filter((m) => m.type === "in");
  const exits = movements.filter((m) => m.type === "out");

  const totalIn = entries.reduce((s, m) => s + m.quantity, 0);
  const totalOut = exits.reduce((s, m) => s + m.quantity, 0);

  const byProduct = new Map<string, { name: string; in: number; out: number; total: number }>();
  for (const m of movements) {
    const key = m.product_id;
    const name = m.products?.name ?? "—";
    const cur = byProduct.get(key) ?? { name, in: 0, out: 0, total: 0 };
    if (m.type === "in") cur.in += m.quantity;
    else cur.out += m.quantity;
    cur.total = cur.in + cur.out;
    byProduct.set(key, cur);
  }
  const ranking = [...byProduct.values()].sort((a, b) => b.total - a.total).slice(0, 10);

  const movedIds = new Set(byProduct.keys());
  const stale = products.filter((p) => !movedIds.has(p.id));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Acompanhe a movimentação do seu estoque.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Summary label="Total de entradas" value={totalIn} tone="primary" />
        <Summary label="Total de saídas" value={totalOut} tone="warning" />
        <Summary label="Movimentações registradas" value={movements.length} />
      </div>

      <Tabs defaultValue="ranking">
        <TabsList>
          <TabsTrigger value="ranking">Mais movimentados</TabsTrigger>
          <TabsTrigger value="entries">Entradas</TabsTrigger>
          <TabsTrigger value="exits">Saídas</TabsTrigger>
          <TabsTrigger value="stale">Parados</TabsTrigger>
        </TabsList>

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
                      <TableCell className="text-right tabular-nums text-warning">−{r.out}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{r.total}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entries"><MovementsTable items={entries} kind="in" /></TabsContent>
        <TabsContent value="exits"><MovementsTable items={exits} kind="out" /></TabsContent>

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

function Summary({ label, value, tone }: { label: string; value: number; tone?: "primary" | "warning" }) {
  const cls = tone === "primary" ? "text-primary" : tone === "warning" ? "text-warning" : "text-foreground";
  return (
    <Card><CardContent className="p-5">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-2 text-3xl font-semibold tabular-nums ${cls}`}>{value.toLocaleString("pt-BR")}</div>
    </CardContent></Card>
  );
}

function MovementsTable({ items, kind }: { items: Movement[]; kind: "in" | "out" }) {
  return (
    <Card><CardContent className="p-0">
      <Table>
        <TableHeader><TableRow>
          <TableHead>Data</TableHead>
          <TableHead>Produto</TableHead>
          <TableHead className="text-right">Quantidade</TableHead>
          <TableHead>Observação</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum registro.</TableCell></TableRow>
          ) : items.map((m) => (
            <TableRow key={m.id}>
              <TableCell className="text-muted-foreground text-sm">{new Date(m.created_at).toLocaleString("pt-BR")}</TableCell>
              <TableCell className="font-medium">{m.products?.name ?? "—"}</TableCell>
              <TableCell className={`text-right tabular-nums ${kind === "in" ? "text-primary" : "text-warning"}`}>
                {kind === "in" ? "+" : "−"}{m.quantity}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                {m.note ? <Badge variant="outline">{m.note}</Badge> : ""}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent></Card>
  );
}
