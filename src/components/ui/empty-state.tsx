import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Estado vazio do ESTOQ.
 *
 * Ícone em tile com hairline, título, uma linha de orientação e no máximo
 * uma ação primária. Nunca texto cinza solto no meio do card.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  /** Variante para dentro de cards e colunas estreitas. */
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "gap-2.5 py-8" : "gap-3 py-14",
        className,
      )}
    >
      <div
        className={cn(
          "grid place-items-center rounded-xl border border-border-subtle bg-surface-sunken text-text-tertiary",
          compact ? "size-9" : "size-11",
        )}
      >
        <Icon className={compact ? "size-4" : "size-5"} strokeWidth={1.75} aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className={cn("font-medium text-foreground", compact ? "text-[13px]" : "text-sm")}>
          {title}
        </p>
        {description && (
          <p className="mx-auto max-w-[38ch] text-[13px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
