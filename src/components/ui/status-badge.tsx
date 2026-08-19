import { cn } from "@/lib/utils";

/**
 * Sistema de status do ESTOQ.
 *
 * Um único lugar define cor, rótulo e forma de cada estado. O indicador é
 * um ponto (LED de instrumento), não uma pílula preenchida — legível em
 * densidade alta e discreto o suficiente para repetir 50× numa tabela.
 */
export type StatusTone =
  | "in-stock"
  | "low-stock"
  | "out-of-stock"
  | "blocked"
  | "inactive"
  | "in"
  | "out";

const STATUS: Record<StatusTone, { label: string; dot: string; text: string; surface: string }> = {
  "in-stock": {
    label: "Em estoque",
    dot: "bg-primary",
    text: "text-primary",
    surface: "border-primary/22 bg-primary/10",
  },
  "low-stock": {
    label: "Baixo estoque",
    dot: "bg-warning",
    text: "text-warning",
    surface: "border-warning/22 bg-warning/10",
  },
  "out-of-stock": {
    label: "Sem estoque",
    dot: "bg-destructive",
    text: "text-destructive",
    surface: "border-destructive/26 bg-destructive/10",
  },
  blocked: {
    label: "Bloqueado",
    dot: "bg-destructive",
    text: "text-destructive",
    surface: "border-destructive/26 bg-destructive/10",
  },
  inactive: {
    label: "Inativo",
    dot: "bg-text-tertiary",
    text: "text-muted-foreground",
    surface: "border-border bg-secondary/50",
  },
  in: {
    label: "Entrada",
    dot: "bg-primary",
    text: "text-primary",
    surface: "border-primary/22 bg-primary/10",
  },
  out: {
    label: "Saída",
    dot: "bg-info",
    text: "text-info",
    surface: "border-info/22 bg-info/10",
  },
};

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: StatusTone;
  /** Sobrescreve o rótulo padrão do status. */
  label?: string;
  className?: string;
}) {
  const s = STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5",
        "text-[11px] font-medium leading-[1.45] whitespace-nowrap",
        s.surface,
        s.text,
        className,
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", s.dot)} aria-hidden="true" />
      {label ?? s.label}
    </span>
  );
}

/** Ponto de status isolado — para uso em listas muito densas. */
export function StatusDot({ status, className }: { status: StatusTone; className?: string }) {
  return (
    <span
      className={cn("inline-block size-1.5 shrink-0 rounded-full", STATUS[status].dot, className)}
      aria-hidden="true"
    />
  );
}

/** Mapeia o retorno de `stockStatus()` para o token de status visual. */
export function stockTone(s: "ok" | "low" | "out"): StatusTone {
  return s === "ok" ? "in-stock" : s === "low" ? "low-stock" : "out-of-stock";
}
