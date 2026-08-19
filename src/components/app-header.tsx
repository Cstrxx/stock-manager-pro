import { Link } from "@tanstack/react-router";
import { Bell, LogOut, Menu, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NAV_ITEMS, isActivePath } from "@/components/app-nav";
import { cn } from "@/lib/utils";

/**
 * Header do ESTOQ — 56px, hairline inferior, sticky.
 *
 * Só contém controles que fazem algo de verdade: contexto da seção, busca
 * global (⌘K), alertas e sessão. Nenhum controle decorativo.
 */
export function AppHeader({
  pathname,
  userName,
  userEmail,
  alertCount,
  onOpenSearch,
  onOpenMenu,
  onSignOut,
  actions,
}: {
  pathname: string;
  userName?: string | null;
  userEmail?: string | null;
  alertCount: number;
  onOpenSearch: () => void;
  onOpenMenu: () => void;
  onSignOut: () => void;
  /** Ações rápidas contextuais da tela atual. */
  actions?: React.ReactNode;
}) {
  const current = NAV_ITEMS.find((i) => isActivePath(pathname, i.to));
  const initials = (userName ?? userEmail ?? "U")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur-sm sm:px-4">
      <Button
        variant="ghost"
        size="icon-sm"
        className="md:hidden"
        onClick={onOpenMenu}
        aria-label="Abrir navegação"
      >
        <Menu strokeWidth={1.75} />
      </Button>

      {/* Contexto: onde o usuário está. */}
      {current && (
        <div className="flex min-w-0 items-center gap-2">
          <current.icon
            className="size-4 shrink-0 text-text-tertiary"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <span className="truncate text-[13px] font-medium text-foreground">{current.label}</span>
        </div>
      )}

      <div className="flex-1" />

      {/* Busca global. */}
      <button
        type="button"
        onClick={onOpenSearch}
        className={cn(
          "group hidden h-8 w-56 items-center gap-2 rounded-md border border-border bg-surface-sunken px-2.5 lg:flex",
          "text-[13px] text-text-tertiary",
          "transition-colors duration-150 ease-out hover:border-border-strong hover:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
      >
        <Search className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
        <span className="flex-1 text-left">Buscar...</span>
        <kbd className="rounded border border-border bg-card px-1 py-px font-sans text-[10px] font-medium leading-[14px] text-text-tertiary">
          ⌘K
        </kbd>
      </button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden"
        onClick={onOpenSearch}
        aria-label="Buscar"
      >
        <Search strokeWidth={1.75} />
      </Button>

      {actions}

      {/* Alertas. */}
      <Button
        variant="ghost"
        size="icon-sm"
        asChild
        aria-label={
          alertCount > 0 ? `Alertas de estoque: ${alertCount}` : "Alertas de estoque"
        }
      >
        <Link to="/alerts" className="relative">
          <Bell strokeWidth={1.75} />
          {alertCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute right-1 top-1 size-1.5 rounded-full bg-destructive ring-2 ring-background"
            />
          )}
        </Link>
      </Button>

      {/* Sessão. */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Menu da conta"
            className={cn(
              "grid size-7 shrink-0 place-items-center rounded-full border border-border bg-card",
              "text-[10px] font-semibold text-muted-foreground",
              "transition-colors duration-150 ease-out hover:border-border-strong hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            )}
          >
            {initials || "U"}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="truncate text-[13px] font-medium text-foreground">
              {userName ?? "Usuário"}
            </div>
            <div className="truncate text-[11px] font-normal text-text-tertiary">{userEmail}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/billing">Plano e cobrança</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onSignOut} className="text-destructive focus:text-destructive">
            <LogOut className="size-4" strokeWidth={1.75} aria-hidden="true" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
