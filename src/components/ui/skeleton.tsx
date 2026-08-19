import { cn } from "@/lib/utils";

/**
 * Skeleton neutro — nunca verde. O carregamento não é um estado de
 * sucesso, então não usa a cor de sinal.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-secondary/70", className)}
      aria-hidden="true"
      {...props}
    />
  );
}

/** Bloco de linhas de tabela em carregamento, na mesma métrica das reais. */
function SkeletonRows({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="h-11 border-b border-border-subtle px-3">
              <Skeleton
                className="h-3"
                style={{ width: c === 0 ? "58%" : c === cols - 1 ? "32%" : "44%" }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export { Skeleton, SkeletonRows };
