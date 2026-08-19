import { cn } from "@/lib/utils";

/**
 * Controle segmentado — seletor de período do ESTOQ.
 *
 * Trilho rebaixado com hairline; o segmento ativo é uma superfície elevada
 * neutra, não um botão verde. O verde permanece reservado para ação.
 */
export function Segmented({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: readonly { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
  /** Rótulo acessível do grupo (ex.: "Período"). */
  label: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-border bg-surface-sunken p-0.5",
        className,
      )}
    >
      {options.map((o) => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.key)}
            className={cn(
              "h-7 rounded-md px-2.5 text-[12px] font-medium leading-none",
              "transition-[background-color,color] duration-150 ease-out",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
              active
                ? "bg-card text-foreground shadow-[var(--shadow-card)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
