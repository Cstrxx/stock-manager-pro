import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { Boxes, LayoutDashboard, Package, ArrowLeftRight, BellRing, BarChart3, CreditCard, LogOut, Sparkles, Users, Wallet, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { daysLeft, TRIAL_WARN_DAYS, type Company } from "@/lib/inventory";
import { NotificationsBell } from "@/components/notifications-bell";
import type { ReactNode } from "react";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/products", label: "Produtos", icon: Package },
  { to: "/partners", label: "Clientes & Fornec.", icon: Users },
  { to: "/movements", label: "Movimentações", icon: ArrowLeftRight },
  { to: "/alerts", label: "Alertas", icon: BellRing },
  { to: "/reports", label: "Relatórios", icon: BarChart3 },
  { to: "/faturamento", label: "Faturamento", icon: Wallet },
  { to: "/billing", label: "Plano", icon: CreditCard },
] as const;


export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const { data: company } = useQuery({
    queryKey: ["company"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("companies")
        .select("id, name, plan, trial_ends_at, subscription_status")
        .maybeSingle();
      return data as Company | null;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("full_name, email").eq("id", u.user.id).maybeSingle();
      return data;
    },
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  const trialing = company?.subscription_status === "trialing";
  const trialDays = company ? daysLeft(company.trial_ends_at) : 0;

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-64 flex-col bg-sidebar border-r border-sidebar-border">
        <div className="px-5 py-5 flex items-center gap-2">
          <div className="size-8 rounded-md grid place-items-center" style={{ background: "var(--gradient-primary)" }}>
            <Boxes className="size-4 text-primary-foreground" />
          </div>
          <div>
            <div className="font-semibold tracking-tight leading-none">Estoq</div>
            <div className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[140px]">{company?.name ?? "—"}</div>
          </div>
        </div>
        <nav className="px-3 flex-1 space-y-1">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || pathname.startsWith(to + "/");
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className="size-4" /> {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-2">
          {trialing && (
            <Link to="/billing" className="block rounded-md border border-primary/30 bg-primary/5 px-3 py-2 hover:bg-primary/10 transition-colors">
              <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                <Sparkles className="size-3.5" /> Período de teste
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {trialDays > 0 ? `${trialDays} dia${trialDays === 1 ? "" : "s"} restante${trialDays === 1 ? "" : "s"}` : "Expira hoje"}
              </div>
            </Link>
          )}
          <div className="px-2 py-1">
            <div className="text-sm font-medium truncate">{profile?.full_name ?? "Usuário"}</div>
            <div className="text-xs text-muted-foreground truncate">{profile?.email}</div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
            <LogOut className="size-4" /> Sair
          </Button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 flex flex-col">
        <div className="md:hidden border-b border-border px-4 py-3 flex items-center justify-between bg-sidebar">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded grid place-items-center" style={{ background: "var(--gradient-primary)" }}>
              <Boxes className="size-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">Estoq</span>
          </div>
          <div className="flex items-center gap-1">
            <NotificationsBell />
            <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="size-4" /></Button>
          </div>
        </div>
        <div className="hidden md:flex items-center justify-end px-6 py-3 border-b border-border bg-background/50">
          <NotificationsBell />
        </div>
        <div className="md:hidden border-b border-border bg-sidebar overflow-x-auto">
          <div className="flex gap-1 px-2 py-2">
            {nav.map(({ to, label, icon: Icon }) => {
              const active = pathname === to;
              return (
                <Link key={to} to={to} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs whitespace-nowrap ${active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground"}`}>
                  <Icon className="size-3.5" /> {label}
                </Link>
              );
            })}
          </div>
        </div>
        {trialing && trialDays <= TRIAL_WARN_DAYS && (
          <div className="bg-warning/15 border-b border-warning/30 px-4 py-2.5 text-sm text-warning-foreground flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-warning">
              <AlertTriangle className="size-4" />
              <span className="font-medium">
                {trialDays === 0 ? "Seu teste grátis acaba hoje." : `Faltam apenas ${trialDays} dia${trialDays === 1 ? "" : "s"} do seu teste grátis.`}
              </span>
            </div>
            <Link to="/billing" className="text-xs font-medium underline text-warning hover:opacity-80">
              Fazer upgrade agora →
            </Link>
          </div>
        )}
        {trialing && trialDays > TRIAL_WARN_DAYS && (
          <div className="md:hidden bg-primary/10 border-b border-primary/20 px-4 py-2 text-xs text-primary flex items-center gap-1.5">
            <Sparkles className="size-3.5" /> Teste grátis · {trialDays} dia{trialDays === 1 ? "" : "s"} · <Link to="/billing" className="underline">ver plano</Link>
          </div>
        )}
        <div className="flex-1 p-6 lg:p-8 max-w-[1400px] w-full mx-auto">{children}</div>
      </main>
    </div>
  );
}
