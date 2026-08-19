import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Package,
  AlertTriangle,
  XCircle,
  ArrowLeftRight,
  Clock,
  DollarSign,
  Plus,
  ArrowRight,
  Boxes,
  Layers,
  TrendingUp,
  Inbox,
  ShieldCheck,
} from "lucide-react";
import { stockStatus, soldPercent, formatBRL, type Product, type Movement } from "@/lib/inventory";
import { buildBriefing, ANALYSIS_WINDOW_DAYS } from "@/lib/insights";
import { useProfileQuery } from "@/lib/queries";
import { IntelligencePanel } from "@/components/intelligence-panel";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge, stockTone } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo, type ReactNode } from "react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  ssr: false,
  component: Dashboard,
});

function Dashboard() {
  // Mesma chave já usada pelo shell — o React Query reaproveita, sem refetch.
  const { data: profile } = useProfileQuery();

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select(
          "id, name, category, quantity, min_stock, initial_quantity, cost_price, sale_price, invoice_number, invoice_file_path, created_at, updated_at",
        )
        .order("name");
      return (data ?? []) as Product[];
    },
  });

  const { data: movements = [], isLoading: loadingMovements } = useQuery({
    queryKey: ["movements", "recent"],
    queryFn: async () => {
      const { data } = await supabase
        .from("stock_movements")
        .select(
          "id, type, quantity, customer_name, total_amount, product_id, created_at, products(name)",
        )
        .order("created_at", { ascending: false })
        .limit(8);
      return (data ?? []) as unknown as Movement[];
    },
  });

  /**
   * Janela de análise do Resumo Inteligente.
   *
   * Única consulta introduzida para a análise. As queries existentes não
   * a sustentam: `movements/recent` traz 8 registros e `revenue/30d` traz
   * somas sem data — nenhuma das duas permite comparar hoje × ontem × 7d ×
   * 30d, medir giro ou identificar clientes inativos. Todo o restante da
   * análise (estoque, categorias, produtos parados, clientes) é derivado
   * daqui e de `products`, sem nenhuma consulta adicional.
   */
  const { data: analysisMovements = [], isLoading: loadingAnalysis } = useQuery({
    queryKey: ["movements", "analysis", ANALYSIS_WINDOW_DAYS],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const since = new Date(Date.now() - ANALYSIS_WINDOW_DAYS * 86400_000).toISOString();
      const { data } = await supabase
        .from("stock_movements")
        .select(
          "id, type, quantity, total_amount, customer_name, sale_id, product_id, created_at, products(name)",
        )
        .gte("created_at", since)
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as Movement[];
    },
  });

  const briefing = useMemo(
    () => (loadingProducts ? null : buildBriefing(products, analysisMovements)),
    [products, analysisMovements, loadingProducts],
  );

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

  /**
   * Todos os módulos abaixo são derivados dos dados já carregados acima.
   * Nenhuma query adicional foi introduzida no dashboard.
   */
  const stats = useMemo(() => {
    let totalItems = 0,
      low = 0,
      out = 0,
      costValue = 0,
      saleValue = 0,
      unpriced = 0;
    const categories = new Set<string>();

    for (const p of products) {
      totalItems += p.quantity;
      const s = stockStatus(p);
      if (s === "low") low++;
      else if (s === "out") out++;

      costValue += p.quantity * Number(p.cost_price ?? 0);
      saleValue += p.quantity * Number(p.sale_price ?? 0);
      if (p.sale_price == null) unpriced++;
      if (p.category) categories.add(p.category);
    }

    return {
      totalItems,
      low,
      out,
      costValue,
      saleValue,
      margin: saleValue - costValue,
      categories: categories.size,
      unpriced,
    };
  }, [products]);

  /** Produtos críticos: esgotados primeiro, depois os de menor cobertura. */
  const critical = useMemo(
    () =>
      products
        .filter((p) => stockStatus(p) !== "ok")
        .sort((a, b) => {
          const sa = stockStatus(a) === "out" ? 0 : 1;
          const sb = stockStatus(b) === "out" ? 0 : 1;
          if (sa !== sb) return sa - sb;
          return a.quantity - b.quantity;
        })
        .slice(0, 6),
    [products],
  );

  /** Mais vendidos do ciclo: quantidade inicial menos saldo atual. */
  const topSellers = useMemo(
    () =>
      products
        .map((p) => ({ product: p, sold: Math.max(0, (p.initial_quantity ?? 0) - p.quantity) }))
        .filter((r) => r.sold > 0)
        .sort((a, b) => b.sold - a.sold)
        .slice(0, 5),
    [products],
  );

  const maxSold = topSellers[0]?.sold ?? 0;

  const lastUpdate = products.reduce<string | null>((acc, p) => {
    if (!acc || p.updated_at > acc) return p.updated_at;
    return acc;
  }, null);

  return (
    /**
     * Ritmo vertical do dashboard.
     *
     * 48px entre seções e 16px dentro delas. A razão de 3× é o que faz cada
     * bloco ler como uma seção com função própria em vez de mais um card
     * empilhado — antes tudo era separado pelos mesmos 24px.
     */
    <div className="space-y-12">
      <PageHeader
        title="Dashboard"
        subtitle="Visão geral em tempo real do seu estoque."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link to="/movements">
                <ArrowLeftRight strokeWidth={1.75} /> Movimentar
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/products">
                <Plus strokeWidth={1.75} /> Novo produto
              </Link>
            </Button>
          </>
        }
        meta={
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3" strokeWidth={1.75} aria-hidden="true" />
            Última atualização: {lastUpdate ? new Date(lastUpdate).toLocaleString("pt-BR") : "—"}
          </span>
        }
      />

      {/* --- Indicadores ------------------------------------------------- */}
      <Section title="Indicadores" description="A posição da operação agora, em números.">
        {/* Três por fileira: com seis o card fica em 209px e o número, que é
            o herói, não cabe mais em uma linha quando é moeda. */}
        <div className="animate-enter-stagger grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatCard
            label="Produtos"
            value={products.length.toLocaleString("pt-BR")}
            icon={Package}
            hint={
              stats.categories > 0
                ? `em ${stats.categories} categoria${stats.categories === 1 ? "" : "s"}`
                : "cadastrados"
            }
            to="/products"
          />
          <StatCard
            label="Itens em estoque"
            value={stats.totalItems.toLocaleString("pt-BR")}
            icon={Boxes}
            hint="unidades disponíveis"
            to="/products"
          />
          <StatCard
            label="Valor em estoque"
            value={formatBRL(stats.costValue)}
            icon={Layers}
            hint="a preço de custo"
            to="/reports"
          />
          <StatCard
            label="Receita (30d)"
            value={formatBRL(revenue)}
            icon={DollarSign}
            tone="primary"
            hint="saídas dos últimos 30 dias"
            to="/faturamento"
          />
          <StatCard
            label="Estoque baixo"
            value={stats.low.toLocaleString("pt-BR")}
            icon={AlertTriangle}
            tone={stats.low > 0 ? "warning" : "neutral"}
            hint={stats.low > 0 ? "próximos do mínimo" : "nenhum item no limite"}
            to="/products"
            search={{ filter: "low" }}
          />
          <StatCard
            label="Esgotados"
            value={stats.out.toLocaleString("pt-BR")}
            icon={XCircle}
            tone={stats.out > 0 ? "danger" : "neutral"}
            hint={stats.out > 0 ? "sem venda até repor" : "nenhum item zerado"}
            to="/products"
            search={{ filter: "out" }}
          />
        </div>
      </Section>

      {/* --- Centro de comando: briefing diário + assistente ------------- */}
      <IntelligencePanel
        briefing={briefing}
        products={products}
        movements={analysisMovements}
        isLoading={loadingProducts || loadingAnalysis}
        userName={profile?.full_name}
      />

      {/* --- Análises complementares ------------------------------------ */}
      <Section
        title="Análises complementares"
        description="O que o ciclo mostra sobre giro, valor e itens em risco."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Mais vendidos no ciclo</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link to="/reports">
                  Relatórios <ArrowRight strokeWidth={1.75} />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loadingProducts ? (
                <RowsSkeleton rows={4} />
              ) : topSellers.length === 0 ? (
                <EmptyState
                  compact
                  icon={Inbox}
                  title="Nenhuma saída registrada"
                  description="O ranking aparece após as primeiras vendas do ciclo."
                />
              ) : (
                <ul className="space-y-4">
                  {topSellers.map(({ product: p, sold }) => (
                    <li key={p.id}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-[13px] font-medium">{p.name}</span>
                        <span className="shrink-0 text-[13px] font-semibold tabular-nums">
                          {sold.toLocaleString("pt-BR")}
                          <span className="ml-1 text-[11px] font-normal text-text-tertiary">
                            un.
                          </span>
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <div
                          className="h-1 flex-1 overflow-hidden rounded-full bg-secondary"
                          role="presentation"
                        >
                          <div
                            className="h-full rounded-full bg-primary/80"
                            style={{ width: `${maxSold ? (sold / maxSold) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="w-11 shrink-0 text-right text-[11px] tabular-nums text-text-tertiary">
                          {Math.round(soldPercent(p))}%
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Produtos críticos</CardTitle>
              {critical.length > 0 && (
                <span className="text-[11px] font-medium tabular-nums text-text-tertiary">
                  {stats.low + stats.out}
                </span>
              )}
            </CardHeader>
            <CardContent>
              {loadingProducts ? (
                <RowsSkeleton rows={5} />
              ) : critical.length === 0 ? (
                <EmptyState
                  compact
                  icon={ShieldCheck}
                  title="Estoque saudável"
                  description="Nenhum produto abaixo do mínimo."
                />
              ) : (
                <ul className="-mx-2 divide-y divide-border-subtle">
                  {critical.map((p) => (
                    <li key={p.id}>
                      <Link
                        to="/products"
                        className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors duration-150 ease-out hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-medium leading-tight">
                            {p.name}
                          </div>
                          <div className="mt-1.5">
                            <StatusBadge status={stockTone(stockStatus(p))} />
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-[13px] font-semibold tabular-nums leading-tight">
                            {p.quantity}
                          </div>
                          <div className="mt-0.5 text-[11px] leading-tight text-text-tertiary tabular-nums">
                            mín {p.min_stock}
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* --- Atividades recentes ---------------------------------------- */}
      <Section
        title="Atividades recentes"
        description="O que entrou e saiu, e onde o valor está parado."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Últimas movimentações</CardTitle>
              {movements.length > 0 && (
                <Button asChild variant="ghost" size="sm">
                  <Link to="/movements">
                    Ver todas <ArrowRight strokeWidth={1.75} />
                  </Link>
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {loadingMovements ? (
                <RowsSkeleton rows={5} />
              ) : movements.length === 0 ? (
                <EmptyState
                  icon={ArrowLeftRight}
                  title="Nenhuma movimentação registrada"
                  description="Entradas e saídas aparecem aqui assim que forem lançadas."
                  action={
                    products.length === 0 ? (
                      <Button asChild size="sm">
                        <Link to="/products">
                          <Plus strokeWidth={1.75} /> Cadastrar primeiro produto
                        </Link>
                      </Button>
                    ) : (
                      <Button asChild size="sm" variant="outline">
                        <Link to="/movements">
                          <Plus strokeWidth={1.75} /> Registrar movimentação
                        </Link>
                      </Button>
                    )
                  }
                />
              ) : (
                <div className="-mx-2 divide-y divide-border-subtle">
                  {movements.map((m) => (
                    <Link
                      key={m.id}
                      to="/movements"
                      className="flex items-center justify-between gap-3 rounded-md px-2 py-2.5 transition-colors duration-150 ease-out hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <StatusBadge status={m.type === "in" ? "in" : "out"} />
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-medium leading-tight">
                            {m.products?.name ?? "—"}
                          </div>
                          <div className="mt-0.5 truncate text-[11px] leading-tight text-text-tertiary">
                            {new Date(m.created_at).toLocaleString("pt-BR")}
                            {m.type === "out" && ` · ${m.customer_name || "Cliente"}`}
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div
                          className={`text-[13px] font-semibold tabular-nums leading-tight ${m.type === "in" ? "text-primary" : "text-foreground"}`}
                        >
                          {m.type === "in" ? "+" : "−"}
                          {m.quantity}
                        </div>
                        {m.total_amount != null && (
                          <div className="mt-0.5 text-[11px] leading-tight text-text-tertiary tabular-nums">
                            {formatBRL(Number(m.total_amount))}
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* "Valor a custo" e "Categorias" saíram: já são KPI no topo da
            página. Aqui fica só o que o indicador não mostra. */}
          <Card>
            <CardHeader>
              <CardTitle>Valor imobilizado</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingProducts ? (
                <RowsSkeleton rows={3} />
              ) : (
                <dl className="divide-y divide-border-subtle">
                  <SummaryRow label="Valor a venda" value={formatBRL(stats.saleValue)} />
                  <SummaryRow
                    label="Margem potencial"
                    value={formatBRL(stats.margin)}
                    tone={stats.margin > 0 ? "primary" : undefined}
                    icon={stats.margin > 0 ? TrendingUp : undefined}
                  />
                  <SummaryRow
                    label="Sem preço de venda"
                    value={stats.unpriced.toLocaleString("pt-BR")}
                    tone={stats.unpriced > 0 ? "warning" : undefined}
                  />
                </dl>
              )}
            </CardContent>
          </Card>
        </div>
      </Section>
    </div>
  );
}

/**
 * Seção do dashboard.
 *
 * O rótulo é o que diferencia "uma pilha de cards" de "uma página com
 * regiões": o usuário passa a reconhecer onde está antes de ler o conteúdo.
 */
function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-[13px] font-semibold leading-none tracking-[-0.006em] text-foreground">
          {title}
        </h2>
        {description && (
          <p className="mt-1.5 text-[12px] leading-none text-text-tertiary">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function SummaryRow({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  tone?: "primary" | "warning";
  icon?: typeof TrendingUp;
}) {
  const toneClass =
    tone === "primary" ? "text-primary" : tone === "warning" ? "text-warning" : "text-foreground";
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
      <dt className="text-[12px] text-muted-foreground">{label}</dt>
      <dd
        className={`flex items-center gap-1.5 text-[13px] font-semibold tabular-nums ${toneClass}`}
      >
        {Icon && <Icon className="size-3.5" strokeWidth={1.75} aria-hidden="true" />}
        {value}
      </dd>
    </div>
  );
}

function RowsSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-3 py-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <Skeleton className="h-3" style={{ width: `${52 - i * 4}%` }} />
          <Skeleton className="h-3 w-10" />
        </div>
      ))}
    </div>
  );
}
