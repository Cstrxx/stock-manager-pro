import { Link } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  BarChart3,
  BellRing,
  CreditCard,
  LayoutDashboard,
  Package,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type NavItem = { to: string; label: string; icon: LucideIcon };
export type NavGroup = { label: string; items: NavItem[] };

/**
 * Navegação do ESTOQ, agrupada por intenção de uso.
 *
 * O agrupamento é o que diferencia uma lista de links de um produto: o
 * usuário passa a reconhecer regiões, não a ler rótulos um a um.
 * As rotas são exatamente as mesmas de antes.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Operação",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/products", label: "Produtos", icon: Package },
      { to: "/movements", label: "Movimentações", icon: ArrowLeftRight },
      // Cliente é operação, não configuração: usado a cada venda registrada.
      { to: "/partners", label: "Clientes & Fornec.", icon: Users },
    ],
  },
  {
    label: "Análise",
    items: [
      { to: "/reports", label: "Relatórios", icon: BarChart3 },
      { to: "/faturamento", label: "Faturamento", icon: Wallet },
    ],
  },
  {
    // Grupo próprio: é a única área onde o sistema pede ação do usuário.
    label: "Atenção",
    items: [{ to: "/alerts", label: "Alertas", icon: BellRing }],
  },
  {
    label: "Conta",
    items: [{ to: "/billing", label: "Plano", icon: CreditCard }],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export function isActivePath(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(to + "/");
}

/**
 * Item de navegação.
 *
 * 36px de altura, ícone a 16px da borda do painel — a mesma coluna da logo
 * e do bloco de usuário, de modo que exista uma única linha vertical em toda
 * a sidebar. O estado ativo é uma superfície fechada com hairline: um botão,
 * não um texto realçado. O indicador de 2px encosta na borda do painel; por
 * isso os itens não têm padding externo próprio (quem espaça é o container).
 */
export function NavLink({
  item,
  active,
  onNavigate,
  badge,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
  badge?: number;
}) {
  const { to, label, icon: Icon } = item;
  return (
    <Link
      to={to}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-9 items-center gap-2.5 rounded-lg px-2",
        "text-[13px] leading-none",
        "transition-[background-color,color] duration-150 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
        // Contorno por `ring`, não por `border`: borda ocuparia 1px de layout
        // e jogaria o ícone para fora da coluna da logo.
        active
          ? "bg-sidebar-accent font-medium text-foreground shadow-[var(--shadow-card)] ring-1 ring-inset ring-sidebar-border"
          : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
      )}
    >
      {/* Indicador lateral — encosta na borda do painel, não flutua. */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute -left-2 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r-full bg-primary",
          "origin-center transition-transform duration-180 ease-out",
          active ? "scale-y-100" : "scale-y-0",
        )}
      />
      <Icon
        className={cn(
          "size-4 shrink-0 transition-colors duration-150 ease-out",
          active ? "text-primary" : "text-text-tertiary group-hover:text-muted-foreground",
        )}
        strokeWidth={1.75}
        aria-hidden="true"
      />
      <span className="truncate">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span
          className={cn(
            "ml-auto min-w-[20px] rounded-md px-1.5 py-px text-center",
            "text-[10px] font-semibold leading-4 tabular-nums",
            "bg-destructive/15 text-destructive",
          )}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

/**
 * Rótulo de categoria, alinhado à mesma coluna dos ícones.
 *
 * O afastamento entre grupos NÃO mora aqui: o rótulo é sempre o primeiro
 * filho do seu próprio wrapper de grupo, então um `first:` neste elemento
 * casaria com todos os rótulos e o espaço nunca seria aplicado — foi
 * exatamente isso que manteve as categorias grudadas até agora. Quem separa
 * os grupos é o `space-y` do container da navegação.
 */
export function NavGroupLabel({ children }: { children: string }) {
  return (
    <div className="px-2 pb-2 text-[10px] font-medium uppercase leading-none tracking-[0.1em] text-text-tertiary">
      {children}
    </div>
  );
}
