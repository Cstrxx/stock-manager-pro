import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Cabeçalho de página do ESTOQ.
 *
 * Substitui o `<header>` que estava duplicado à mão em cada rota. Um único
 * lugar define a escala do título, o espaçamento e o alinhamento das ações.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  meta,
  className,
}: {
  title: string;
  subtitle?: ReactNode;
  /** Ações primárias, alinhadas à direita. */
  actions?: ReactNode;
  /** Metadado discreto sob o subtítulo (ex.: última atualização). */
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-start justify-between gap-x-6 gap-y-4", className)}>
      <div className="min-w-0">
        <h1 className="text-[26px] font-semibold leading-[1.15] tracking-[-0.022em] text-foreground sm:text-[32px]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 max-w-[64ch] text-[15px] leading-normal text-muted-foreground">
            {subtitle}
          </p>
        )}
        {/* Metadado é terciário: fica após um respiro maior que o do
            subtítulo, para não disputar a mesma linha de leitura. */}
        {meta && <div className="mt-4 text-[12px] leading-none text-text-tertiary">{meta}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Barra de filtros/busca sob o cabeçalho. Mantém o ritmo entre as telas. */
export function PageToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>;
}
