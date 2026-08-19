import { useCallback, useRef, useState, type ReactNode } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ConfirmOptions = {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
};

/**
 * Substitui o `confirm()` nativo do navegador.
 *
 * Mantém a mesma ergonomia de chamada — `if (await confirm(...))` — para
 * que a adoção nas telas seja uma troca de uma linha, sem reescrever
 * nenhum handler.
 *
 * ```tsx
 * const { confirm, confirmDialog } = useConfirm();
 * ...
 * onClick={async () => { if (await confirm({ title: "Remover?" })) del.mutate(p); }}
 * ...
 * {confirmDialog}
 * ```
 */
export function useConfirm() {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    setOpts(options);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOpen(false);
  }, []);

  const danger = opts?.tone !== "default";

  const confirmDialog = (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        // Fechar por ESC ou clique fora equivale a cancelar.
        if (!o) settle(false);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{opts?.title}</AlertDialogTitle>
          {opts?.description && <AlertDialogDescription>{opts.description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => settle(false)}>
            {opts?.cancelLabel ?? "Cancelar"}
          </AlertDialogCancel>
          <AlertDialogAction
            className={cn(danger && buttonVariants({ variant: "destructive" }))}
            onClick={() => settle(true)}
          >
            {opts?.confirmLabel ?? (danger ? "Remover" : "Confirmar")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, confirmDialog };
}
