import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Badge base do ESTOQ.
 *
 * Superfície translúcida do próprio tom + hairline da mesma cor. Nunca
 * preenchimento sólido saturado — status é informação, não decoração.
 * Para status de estoque use `StatusBadge`, que já resolve cor e ícone.
 */
const badgeVariants = cva(
  [
    "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5",
    "text-[11px] font-medium leading-[1.45] tracking-[0.01em] whitespace-nowrap",
    "transition-colors duration-150 ease-out",
    "[&_svg]:size-3 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        neutral: "border-border bg-secondary/60 text-muted-foreground",
        success: "border-primary/25 bg-primary/12 text-primary",
        warning: "border-warning/25 bg-warning/12 text-warning",
        danger: "border-destructive/28 bg-destructive/12 text-destructive",
        info: "border-info/25 bg-info/12 text-info",
        outline: "border-border bg-transparent text-muted-foreground",
        /* Compat com o código existente. */
        default: "border-primary/25 bg-primary/12 text-primary",
        secondary: "border-border bg-secondary/60 text-muted-foreground",
        destructive: "border-destructive/28 bg-destructive/12 text-destructive",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
