import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.ComponentProps<"input"> {
  /** Aplica o estado de erro e marca `aria-invalid`. */
  error?: boolean;
}

/**
 * Input do ESTOQ.
 *
 * Cinco estados explícitos: default, hover, focus, error e disabled.
 * O foco é um anel de 2px no verde de ação — o mesmo de todo o sistema.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        aria-invalid={error || undefined}
        className={cn(
          "flex h-9 w-full rounded-md border bg-surface-sunken px-3 py-1",
          "text-[13px] leading-none text-foreground",
          "transition-[border-color,box-shadow,background-color] duration-150 ease-out",
          "placeholder:text-text-tertiary",
          "file:mr-3 file:h-7 file:cursor-pointer file:rounded-sm file:border-0 file:bg-secondary file:px-2.5 file:text-xs file:font-medium file:text-foreground hover:file:bg-secondary/70",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:border-primary/60",
          "disabled:cursor-not-allowed disabled:opacity-45 disabled:bg-secondary/30",
          error
            ? "border-destructive/60 focus-visible:ring-destructive/35 focus-visible:border-destructive"
            : "border-border hover:border-border-strong",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
