import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Sistema de botões do ESTOQ.
 *
 * Todos os variants compartilham a mesma métrica: altura, raio, gap de ícone,
 * peso tipográfico e curva de motion. A diferença entre eles é apenas a
 * superfície — nunca a forma.
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-1.5 whitespace-nowrap",
    "rounded-md text-[13px] font-medium leading-none cursor-pointer select-none",
    // Motion: apenas propriedades aceleradas por GPU.
    "transition-[background-color,border-color,color,opacity,transform] duration-150 ease-out",
    "active:scale-[0.985]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-45 disabled:cursor-not-allowed",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        /** Ação primária. Único uso de verde sólido na interface. */
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        /** Ação secundária — superfície neutra, hairline. */
        secondary:
          "bg-secondary text-secondary-foreground border border-border hover:bg-secondary/70 hover:border-border-strong",
        /** Contorno — para barras de ferramentas e filtros. */
        outline:
          "border border-border bg-transparent text-foreground hover:bg-secondary/60 hover:border-border-strong",
        /** Sem superfície — ações terciárias e itens de linha. */
        ghost: "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
        /** Destrutivo. */
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        /** Alias semântico de `destructive`. */
        danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        /** Destrutivo discreto — exclusão dentro de menus e linhas. */
        "danger-ghost": "text-destructive hover:bg-destructive/12 hover:text-destructive",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-3.5",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-5 text-sm",
        icon: "h-9 w-9 p-0",
        "icon-sm": "h-8 w-8 p-0 [&_svg]:size-3.5",
        "icon-lg": "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
