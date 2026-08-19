import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type StatTone = "neutral" | "primary" | "warning" | "danger" | "info";

const TONE: Record<StatTone, { value: string; icon: string }> = {
  neutral: { value: "text-foreground", icon: "text-text-tertiary" },
  primary: { value: "text-foreground", icon: "text-primary" },
  warning: { value: "text-warning", icon: "text-warning" },
  danger: { value: "text-destructive", icon: "text-destructive" },
  info: { value: "text-foreground", icon: "text-info" },
};

/**
 * KPI do ESTOQ.
 *
 * O número é o herói: 28px, peso 700, tabular, tracking negativo. O rótulo
 * é legenda em caixa alta. O ícone nunca compete com o dado — fica em
 * hairline no canto, no tom do estado.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  hint,
  to,
  search,
  className,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: StatTone;
  /** Contexto sob o número (ex.: variação, período). */
  hint?: ReactNode;
  to?: string;
  search?: Record<string, string>;
  className?: string;
}) {
  const t = TONE[tone];

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-medium uppercase leading-none tracking-[0.07em] text-text-tertiary">
          {label}
        </span>
        <Icon className={cn("size-4 shrink-0", t.icon)} strokeWidth={1.75} aria-hidden="true" />
      </div>
      <div
        className={cn(
          "mt-4 text-[30px] font-bold leading-none tracking-[-0.03em] tabular-nums",
          t.value,
        )}
      >
        {value}
      </div>
      {/* Linha reservada mesmo sem dica: sem isso os cards de uma mesma
          fileira terminam em alturas diferentes e a régua inferior quebra. */}
      <div className="mt-2 text-[11px] leading-none text-text-tertiary">{hint ?? " "}</div>
    </>
  );

  const surface = cn(
    "relative flex h-full flex-col rounded-xl border border-border bg-card px-5 py-4",
    "shadow-[var(--shadow-card)]",
    className,
  );

  if (!to) return <div className={surface}>{body}</div>;

  return (
    <Link
      to={to}
      search={search as never}
      className={cn(
        surface,
        "transition-[border-color,background-color] duration-150 ease-out",
        "hover:border-border-strong hover:bg-secondary/25",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
    >
      {body}
    </Link>
  );
}
