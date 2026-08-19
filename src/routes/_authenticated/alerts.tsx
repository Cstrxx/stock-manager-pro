import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, XCircle, ShieldCheck, PackageCheck } from "lucide-react";
import { stockStatus, soldPercent, type Product } from "@/lib/inventory";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/alerts")({
  ssr: false,
  component: AlertsPage,
});

function AlertsPage() {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").order("name");
      return (data ?? []) as Product[];
    },
  });

  const out = products.filter((p) => stockStatus(p) === "out");
  const low = products.filter((p) => stockStatus(p) === "low");
  const healthy = !isLoading && out.length === 0 && low.length === 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Alertas de estoque"
        subtitle="Produtos que precisam de reposição."
      />

      {healthy ? (
        <Card>
          <CardContent className="pt-4">
            <EmptyState
              icon={ShieldCheck}
              title="Tudo certo com o seu estoque"
              description="Nenhum produto esgotado ou abaixo do mínimo no momento."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <AlertColumn
            title="Esgotados"
            icon={XCircle}
            tone="danger"
            count={out.length}
            items={out}
            isLoading={isLoading}
            empty="Nenhum produto esgotado."
          />
          <AlertColumn
            title="Estoque baixo"
            icon={AlertTriangle}
            tone="warning"
            count={low.length}
            items={low}
            isLoading={isLoading}
            empty="Nenhum item com estoque baixo."
          />
        </div>
      )}
    </div>
  );
}

function AlertColumn({
  title,
  icon: Icon,
  tone,
  count,
  items,
  isLoading,
  empty,
}: {
  title: string;
  icon: typeof XCircle;
  tone: "danger" | "warning";
  count: number;
  items: Product[];
  isLoading: boolean;
  empty: string;
}) {
  const toneText = tone === "danger" ? "text-destructive" : "text-warning";
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Icon className={`size-4 ${toneText}`} strokeWidth={1.75} aria-hidden="true" />
          {title}
        </CardTitle>
        <span className="text-[13px] font-semibold tabular-nums text-muted-foreground">{count}</span>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3 py-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <Skeleton className="h-3" style={{ width: `${56 - i * 6}%` }} />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState compact icon={PackageCheck} title={empty} />
        ) : (
          <ul className="-mx-2 divide-y divide-border-subtle">
            {items.map((p) => {
              const pct = Math.round(soldPercent(p));
              return (
                <li key={p.id}>
                  <Link
                    to="/products"
                    className="flex items-center justify-between gap-3 rounded-md px-2 py-2.5 transition-colors duration-150 ease-out hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium leading-tight">{p.name}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1 w-20 overflow-hidden rounded-full bg-secondary" role="presentation">
                          <div
                            className={`h-full rounded-full ${tone === "danger" ? "bg-destructive/70" : "bg-warning/70"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="truncate text-[11px] leading-tight text-text-tertiary">
                          {p.category ?? "Sem categoria"} · {pct}% do ciclo
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[13px] font-semibold tabular-nums leading-tight">
                        {p.quantity}
                        <span className="font-normal text-text-tertiary"> / {p.initial_quantity}</span>
                      </div>
                      <div className="mt-0.5 text-[11px] leading-tight text-text-tertiary tabular-nums">
                        mín {p.min_stock}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
