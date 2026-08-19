import { Link } from "@tanstack/react-router";
import { LogOut, Sparkles } from "lucide-react";

import { EstoqLogo } from "@/components/brand";
import { NAV_GROUPS, NavGroupLabel, NavLink, isActivePath } from "@/components/app-nav";
import { cn } from "@/lib/utils";

/**
 * Sidebar do ESTOQ — 240px, densidade compacta.
 *
 * Puramente apresentacional: toda a lógica de trial, sessão e navegação
 * continua no `AppShell`. Recebe o que precisa por props.
 */
export function AppSidebar({
  companyName,
  userName,
  userEmail,
  pathname,
  trialing,
  trialDays,
  alertCount,
  onSignOut,
  onNavigate,
  className,
}: {
  companyName?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  pathname: string;
  trialing: boolean;
  trialDays: number;
  alertCount: number;
  onSignOut: () => void;
  onNavigate?: () => void;
  className?: string;
}) {
  const initials = (userName ?? userEmail ?? "U")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className={cn("flex h-full w-full flex-col bg-sidebar", className)}>
      {/* --- Identidade ------------------------------------------------
          Marca e empresa num bloco só. Separá-los por hairline criava três
          barras empilhadas antes de o menu começar. */}
      <div className="shrink-0 border-b border-sidebar-border px-4 pb-4 pt-4">
        <Link
          to="/dashboard"
          onClick={onNavigate}
          className="flex min-w-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
        >
          <EstoqLogo />
        </Link>
        {companyName && (
          <div className="mt-2 truncate text-[12px] leading-none text-muted-foreground">
            {companyName}
          </div>
        )}
      </div>

      {/* --- Navegação -------------------------------------------------- */}
      {/* `space-y-8` separa os grupos em 32px — e só entre eles, sem sobrar
          espaço morto acima do primeiro rótulo. */}
      <nav
        aria-label="Navegação principal"
        className="min-h-0 flex-1 space-y-8 overflow-y-auto px-2 pb-4 pt-4"
      >
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <NavGroupLabel>{group.label}</NavGroupLabel>
            <div className="space-y-1.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  item={item}
                  active={isActivePath(pathname, item.to)}
                  onNavigate={onNavigate}
                  badge={item.to === "/alerts" ? alertCount : undefined}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* --- Rodapé: trial + sessão ------------------------------------ */}
      <div className="shrink-0 space-y-3 border-t border-sidebar-border px-2 pb-3 pt-3">
        {trialing && (
          <Link
            to="/billing"
            onClick={onNavigate}
            className={cn(
              "block rounded-lg border border-border bg-card px-3 py-3",
              "transition-[border-color,background-color] duration-150 ease-out",
              "hover:border-primary/35 hover:bg-primary/[0.06]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
            )}
          >
            <div className="flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-primary" strokeWidth={1.75} aria-hidden="true" />
              <span className="text-[11px] font-medium leading-none text-foreground">
                Período de teste
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-[17px] font-bold leading-none tabular-nums tracking-[-0.02em] text-foreground">
                {trialDays > 0 ? trialDays : 0}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {trialDays > 0
                  ? `dia${trialDays === 1 ? "" : "s"} restante${trialDays === 1 ? "" : "s"}`
                  : "expira hoje"}
              </span>
            </div>
          </Link>
        )}

        {/* `px-2` mantém o avatar na mesma coluna dos ícones do menu. */}
        <div className="flex items-center gap-2.5 px-2">
          <span
            aria-hidden="true"
            className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-card text-[10px] font-semibold text-muted-foreground"
          >
            {initials || "U"}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] font-medium leading-tight text-foreground">
              {userName ?? "Usuário"}
            </div>
            <div className="truncate text-[11px] leading-tight text-text-tertiary">{userEmail}</div>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            aria-label="Sair da conta"
            title="Sair"
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-lg text-text-tertiary",
              "transition-colors duration-150 ease-out hover:bg-sidebar-accent hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
            )}
          >
            <LogOut className="size-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
