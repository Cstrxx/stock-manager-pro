import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { AlertTriangle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { daysLeft, stockStatus, TRIAL_WARN_DAYS, type Product } from "@/lib/inventory";
import { useCompanyQuery, useProfileQuery } from "@/lib/queries";
import { useEffect, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { setTrialLocked, TRIAL_BLOCKED_EVENT, TRIAL_BLOCKED_MESSAGE } from "@/lib/trial-lock";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { CommandPalette, useCommandPalette } from "@/components/command-palette";

/**
 * Conta produtos que precisam de atenção lendo **apenas o cache** do React
 * Query. Reage a mudanças do cache, mas nunca dispara requisição — o
 * contador de alertas não adiciona carga de rede à aplicação.
 */
function useAlertCount() {
  const qc = useQueryClient();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const read = () => {
      const products = qc.getQueryData<Product[]>(["products"]);
      if (!products) return setCount(0);
      setCount(products.filter((p) => stockStatus(p) !== "ok").length);
    };
    read();
    return qc.getQueryCache().subscribe(read);
  }, [qc]);

  return count;
}

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const { data: company } = useCompanyQuery();
  const { data: profile } = useProfileQuery();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  const trialing = company?.subscription_status === "trialing";
  const trialDays = company ? daysLeft(company.trial_ends_at) : 0;
  const trialExpired = !!company && trialing && new Date(company.trial_ends_at).getTime() <= Date.now();
  const [blockedOpen, setBlockedOpen] = useState(false);

  useEffect(() => {
    setTrialLocked(trialExpired);
  }, [trialExpired]);

  useEffect(() => {
    const onBlocked = () => setBlockedOpen(true);
    window.addEventListener(TRIAL_BLOCKED_EVENT, onBlocked);
    return () => window.removeEventListener(TRIAL_BLOCKED_EVENT, onBlocked);
  }, []);

  const alertCount = useAlertCount();
  const { open: searchOpen, setOpen: setSearchOpen } = useCommandPalette();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Fecha a navegação mobile ao trocar de rota.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const sidebarProps = {
    companyName: company?.name,
    userName: profile?.full_name,
    userEmail: profile?.email,
    pathname,
    trialing,
    trialDays,
    alertCount,
    onSignOut: signOut,
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* --- Sidebar desktop -------------------------------------------- */}
      <aside className="hidden w-60 shrink-0 border-r border-sidebar-border md:block">
        <div className="sticky top-0 h-screen">
          <AppSidebar {...sidebarProps} />
        </div>
      </aside>

      {/* --- Navegação mobile: drawer próprio, não barra de chips -------- */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-[264px] border-sidebar-border bg-sidebar p-0">
          <SheetTitle className="sr-only">Navegação</SheetTitle>
          <AppSidebar {...sidebarProps} onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          pathname={pathname}
          userName={profile?.full_name}
          userEmail={profile?.email}
          alertCount={alertCount}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenMenu={() => setMobileNavOpen(true)}
          onSignOut={signOut}
        />

        {/* --- Avisos de trial (regra de negócio inalterada) ------------- */}
        {trialExpired && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-destructive/30 bg-destructive/[0.08] px-4 py-2.5 sm:px-6">
            <div className="flex items-start gap-2 text-[13px] text-destructive">
              <AlertTriangle className="mt-px size-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              <span className="font-medium">
                Seu período de teste terminou. Você pode consultar seus dados, mas novas alterações estão bloqueadas.
              </span>
            </div>
            <Button size="sm" asChild>
              <Link to="/billing">Fazer upgrade</Link>
            </Button>
          </div>
        )}
        {trialing && !trialExpired && trialDays <= TRIAL_WARN_DAYS && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-warning/25 bg-warning/[0.07] px-4 py-2.5 sm:px-6">
            <div className="flex items-start gap-2 text-[13px] text-warning">
              <AlertTriangle className="mt-px size-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              <span className="font-medium">
                {trialDays === 0 ? "Seu teste grátis acaba hoje." : `Faltam apenas ${trialDays} dia${trialDays === 1 ? "" : "s"} do seu teste grátis.`}
              </span>
            </div>
            <Link
              to="/billing"
              className="text-[12px] font-medium text-warning underline underline-offset-4 transition-opacity duration-150 hover:opacity-80"
            >
              Fazer upgrade agora →
            </Link>
          </div>
        )}
        {trialing && !trialExpired && trialDays > TRIAL_WARN_DAYS && (
          <div className="flex items-center gap-1.5 border-b border-border-subtle bg-card/40 px-4 py-2 text-[12px] text-muted-foreground md:hidden">
            <Sparkles className="size-3.5 shrink-0 text-primary" strokeWidth={1.75} aria-hidden="true" />
            Teste grátis · {trialDays} dia{trialDays === 1 ? "" : "s"} ·{" "}
            <Link to="/billing" className="font-medium text-foreground underline underline-offset-4">
              ver plano
            </Link>
          </div>
        )}

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>

        <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />

        <Dialog open={blockedOpen} onOpenChange={setBlockedOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{TRIAL_BLOCKED_MESSAGE}</DialogTitle>
              <DialogDescription>
                A leitura dos seus dados continua liberada. Para voltar a cadastrar, editar ou excluir, assine o Plano Completo.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setBlockedOpen(false)}>Fechar</Button>
              <Button asChild onClick={() => setBlockedOpen(false)}>
                <Link to="/billing">Ver plano</Link>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
