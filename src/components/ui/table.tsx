import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Tabela do ESTOQ — densidade ERP.
 *
 * Linhas de 44px, cabeçalho fixo em superfície rebaixada, divisores
 * hairline e alinhamento numérico tabular. Pensada para varredura rápida
 * de muitas linhas, não para leitura de poucas.
 */
const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto">
      <table
        ref={ref}
        className={cn("w-full caption-bottom border-separate border-spacing-0 text-[13px]", className)}
        {...props}
      />
    </div>
  ),
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("sticky top-0 z-10", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("", className)} {...props} />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "bg-surface-sunken font-medium [&>tr>td]:border-t [&>tr>td]:border-border",
      className,
    )}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "group/row transition-colors duration-150 ease-out",
        "hover:bg-secondary/40 data-[state=selected]:bg-primary/[0.07]",
        className,
      )}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-9 bg-surface-sunken px-3 text-left align-middle",
      "border-b border-border",
      "text-[11px] font-medium uppercase tracking-[0.06em] text-text-tertiary",
      "whitespace-nowrap select-none",
      "[&:has([role=checkbox])]:w-10 [&:has([role=checkbox])]:pr-0",
      className,
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "h-11 px-3 align-middle border-b border-border-subtle",
      "[&:has([role=checkbox])]:w-10 [&:has([role=checkbox])]:pr-0",
      className,
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption ref={ref} className={cn("mt-3 text-xs text-text-tertiary", className)} {...props} />
));
TableCaption.displayName = "TableCaption";

/**
 * Célula de ações. Mantém o menu contextual discreto até o hover da linha,
 * sem causar deslocamento de layout (usa opacidade, não display).
 */
const TableActions = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-end gap-0.5",
        "opacity-0 transition-opacity duration-150 ease-out",
        "group-hover/row:opacity-100 focus-within:opacity-100",
        "[@media(hover:none)]:opacity-100",
        className,
      )}
      {...props}
    />
  ),
);
TableActions.displayName = "TableActions";

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  TableActions,
};
