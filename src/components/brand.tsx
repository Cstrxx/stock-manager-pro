import { cn } from "@/lib/utils";

/**
 * Marca do ESTOQ.
 *
 * Três camadas empilhadas em perspectiva isométrica — a leitura direta de
 * "estoque". A camada superior é a única em verde: o nível atual sobre a
 * base neutra. Desenhada em stroke para acompanhar a métrica dos ícones
 * Lucide (1.75) e não destoar da interface.
 */
export function EstoqMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("size-6", className)}
      aria-hidden="true"
      focusable="false"
    >
      {/* Camada superior — nível atual (sinal) */}
      <path
        d="M12 3.25 19.5 7.5 12 11.75 4.5 7.5 12 3.25Z"
        className="fill-primary/22 stroke-primary"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* Camada intermediária */}
      <path
        d="M4.5 12 12 16.25 19.5 12"
        className="stroke-current opacity-60"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Base */}
      <path
        d="M4.5 16.5 12 20.75 19.5 16.5"
        className="stroke-current opacity-35"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Marca + wordmark. O wordmark usa tracking largo para leitura de produto. */
export function EstoqLogo({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-foreground", className)}>
      <EstoqMark className={cn("size-[22px]", markClassName)} />
      <span className="text-[13px] font-semibold uppercase tracking-[0.14em] leading-none">
        Estoq
      </span>
    </span>
  );
}
