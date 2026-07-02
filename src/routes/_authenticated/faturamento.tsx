import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, HelpCircle, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatBRL } from "@/lib/inventory";

export const Route = createFileRoute("/_authenticated/faturamento")({
  ssr: false,
  component: FaturamentoPage,
});

const RANGES = [
  { key: "1m", label: "1 mês", months: 1 },
  { key: "3m", label: "3 meses", months: 3 },
  { key: "6m", label: "6 meses", months: 6 },
  { key: "1y", label: "1 ano", months: 12 },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];

const MONTH_LABEL = (d: Date) =>
  d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }).replace(/^./, (c) => c.toUpperCase());

type SaleRow = {
  id: string;
  total_amount: number | null;
  quantity: number;
  sale_id: string | null;
  product_id: string;
  created_at: string;
  products?: { name: string } | null;
};

function startOfMonth(y: number, m: number) {
  return new Date(y, m, 1);
}

function FaturamentoPage() {
  const [range, setRange] = useState<RangeKey>(() => {
    if (typeof window === "undefined") return "3m";
    return (localStorage.getItem("faturamento:range") as RangeKey) || "3m";
  });
  useEffect(() => { localStorage.setItem("faturamento:range", range); }, [range]);

  const months = RANGES.find((r) => r.key === range)!.months;

  const now = new Date();
  const endMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startMonth = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const prevStart = new Date(startMonth.getFullYear(), startMonth.getMonth() - months, 1);

  const since = startMonth.toISOString();
  const prevSince = prevStart.toISOString();
  const prevUntil = since;

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["faturamento", range],
    queryFn: async () => {
      const { data } = await supabase
        .from("stock_movements")
        .select("id, total_amount, quantity, sale_id, product_id, created_at, products(name)")
        .eq("type", "out")
        .gte("created_at", since)
        .order("created_at", { ascending: true });
      return (data ?? []) as unknown as SaleRow[];
    },
  });

  const { data: prevTotal = 0 } = useQuery({
    queryKey: ["faturamento", "prev", range],
    queryFn: async () => {
      const { data } = await supabase
        .from("stock_movements")
        .select("total_amount")
        .eq("type", "out")
        .gte("created_at", prevSince)
        .lt("created_at", prevUntil);
      return (data ?? []).reduce((s, r) => s + Number(r.total_amount ?? 0), 0);
    },
  });

  // Ano anterior (mesmo intervalo) para comparação mês a mês
  const yearAgoStart = new Date(startMonth.getFullYear() - 1, startMonth.getMonth(), 1).toISOString();
  const yearAgoEnd = new Date(endMonth.getFullYear() - 1, endMonth.getMonth() + 1, 1).toISOString();
  const { data: yearAgoRows = [] } = useQuery({
    queryKey: ["faturamento", "yoy", range],
    queryFn: async () => {
      const { data } = await supabase
        .from("stock_movements")
        .select("total_amount, created_at")
        .eq("type", "out")
        .gte("created_at", yearAgoStart)
        .lt("created_at", yearAgoEnd);
      return (data ?? []) as { total_amount: number | null; created_at: string }[];
    },
  });

  const monthly = useMemo(() => {
    // Cria buckets vazios para todos os meses do intervalo
    const buckets = new Map<string, { key: string; date: Date; total: number; sales: Set<string>; items: number; products: Map<string, { name: string; qty: number }> }>();
    for (let i = 0; i < months; i++) {
      const d = startOfMonth(startMonth.getFullYear(), startMonth.getMonth() + i);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      buckets.set(key, { key, date: d, total: 0, sales: new Set(), items: 0, products: new Map() });
    }
    for (const r of rows) {
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const b = buckets.get(key);
      if (!b) continue;
      b.total += Number(r.total_amount ?? 0);
      b.sales.add(r.sale_id ?? r.id);
      b.items += r.quantity;
      const pname = r.products?.name ?? "—";
      const cur = b.products.get(r.product_id) ?? { name: pname, qty: 0 };
      cur.qty += r.quantity;
      b.products.set(r.product_id, cur);
    }
    const yoyMap = new Map<string, number>();
    for (const r of yearAgoRows) {
      const d = new Date(r.created_at);
      const key = `${d.getFullYear() + 1}-${d.getMonth()}`;
      yoyMap.set(key, (yoyMap.get(key) ?? 0) + Number(r.total_amount ?? 0));
    }
    return [...buckets.values()].map((b) => {
      const topArr = [...b.products.values()].sort((a, b) => b.qty - a.qty).slice(0, 2);
      return {
        key: b.key,
        date: b.date,
        total: b.total,
        salesCount: b.sales.size,
        items: b.items,
        avgTicket: b.sales.size ? b.total / b.sales.size : 0,
        top: topArr,
        yoy: yoyMap.get(b.key) ?? 0,
      };
    });
  }, [rows, yearAgoRows, months, startMonth]);

  const total = monthly.reduce((s, m) => s + m.total, 0);
  const deltaPct = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : (total > 0 ? 100 : 0);
  const maxMonth = Math.max(1, ...monthly.map((m) => m.total));

  const periodLabel = months === 1
    ? MONTH_LABEL(startMonth)
    : `${MONTH_LABEL(startMonth)} a ${MONTH_LABEL(endMonth)}`;

  function exportCsv() {
    const header = ["Mês", "Faturamento bruto (R$)", "Vendas", "Itens vendidos", "Ticket médio (R$)", "Mesmo mês ano anterior (R$)", "Top produto"];
    const lines = monthly.map((m) => [
      MONTH_LABEL(m.date),
      m.total.toFixed(2),
      m.salesCount,
      m.items,
      m.avgTicket.toFixed(2),
      m.yoy.toFixed(2),
      m.top[0]?.name ?? "—",
    ].join(";"));
    const csv = [header.join(";"), ...lines, "", `Total do período;${total.toFixed(2)}`].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `faturamento-${range}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        <header className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <Wallet className="size-6 text-primary" /> Faturamento
            </h1>
            <p className="text-sm text-muted-foreground">Período: <span className="font-medium text-foreground">{periodLabel}</span></p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex flex-wrap gap-1 bg-muted/50 p-1 rounded-md">
              {RANGES.map((r) => (
                <Button
                  key={r.key}
                  size="sm"
                  variant={range === r.key ? "default" : "ghost"}
                  className="h-7 px-3 text-xs"
                  onClick={() => setRange(r.key)}
                >{r.label}</Button>
              ))}
            </div>
            <Button size="sm" variant="outline" onClick={exportCsv}>
              <Download className="size-3.5" /> Exportar CSV
            </Button>
          </div>
        </header>

        <Card className="border-primary/30" style={{ boxShadow: "var(--shadow-glow)" }}>
          <CardContent className="p-6 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                Faturamento total do período
                <InfoTip text="Soma de todas as vendas confirmadas no intervalo selecionado (saídas de estoque)." />
              </div>
              <div className="mt-2 text-3xl sm:text-4xl font-semibold tabular-nums text-primary">{formatBRL(total)}</div>
              <div className={`mt-1 text-sm flex items-center gap-1 ${deltaPct >= 0 ? "text-primary" : "text-destructive"}`}>
                {deltaPct >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                {deltaPct >= 0 ? "+" : ""}{deltaPct.toFixed(1)}% vs. período anterior de mesma duração
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Período anterior</div>
              <div className="mt-2 text-lg tabular-nums text-muted-foreground">{formatBRL(prevTotal)}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalhamento mês a mês</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
            ) : monthly.every((m) => m.total === 0) ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma venda registrada nesse período.</p>
            ) : (
              <div className="space-y-4">
                {monthly.map((m) => {
                  const barWidth = (m.total / maxMonth) * 100;
                  const yoyDelta = m.yoy > 0 ? ((m.total - m.yoy) / m.yoy) * 100 : null;
                  return (
                    <div key={m.key} className="rounded-lg border border-border p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="font-medium capitalize">{MONTH_LABEL(m.date)}</div>
                        <div className="text-lg font-semibold tabular-nums text-primary">{formatBRL(m.total)}</div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all" style={{ width: `${barWidth}%` }} />
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <Metric
                          label="Vendas"
                          value={m.salesCount.toLocaleString("pt-BR")}
                          tip="Quantas vendas distintas aconteceram no mês."
                        />
                        <Metric
                          label="Itens vendidos"
                          value={m.items.toLocaleString("pt-BR")}
                          tip="Soma das quantidades de todos os produtos vendidos no mês."
                        />
                        <Metric
                          label="Ticket médio"
                          value={formatBRL(m.avgTicket)}
                          tip="Faturamento do mês dividido pelo número de vendas. Ajuda a entender quanto cada cliente gasta em média."
                        />
                        <Metric
                          label="Mesmo mês ano anterior"
                          value={m.yoy > 0 ? formatBRL(m.yoy) : "Sem dados"}
                          tip="Compara o faturamento deste mês com o mesmo mês do ano passado."
                          extra={yoyDelta != null ? (
                            <span className={`text-xs ${yoyDelta >= 0 ? "text-primary" : "text-destructive"}`}>
                              {yoyDelta >= 0 ? "+" : ""}{yoyDelta.toFixed(1)}%
                            </span>
                          ) : null}
                        />
                      </div>
                      {m.top.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">Mais vendidos:</span>{" "}
                          {m.top.map((t, i) => (
                            <span key={i}>{i > 0 ? " · " : ""}{t.name} ({t.qty})</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="text-muted-foreground hover:text-foreground">
          <HelpCircle className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs">{text}</TooltipContent>
    </Tooltip>
  );
}

function Metric({ label, value, tip, extra }: { label: string; value: string; tip: string; extra?: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
        {label} <InfoTip text={tip} />
      </div>
      <div className="mt-1 font-medium tabular-nums flex items-center gap-2">{value} {extra}</div>
    </div>
  );
}
