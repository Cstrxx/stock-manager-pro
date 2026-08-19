import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Package } from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { NAV_GROUPS } from "@/components/app-nav";
import { StatusDot, stockTone } from "@/components/ui/status-badge";
import { stockStatus, type Product } from "@/lib/inventory";

/**
 * Busca global (⌘K / Ctrl+K).
 *
 * Navega entre as áreas do produto e localiza produtos **lendo o cache do
 * React Query** — nunca dispara requisição própria. Se a lista de produtos
 * ainda não foi carregada por nenhuma tela, o palette simplesmente mostra
 * apenas a navegação.
 */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [query, setQuery] = useState("");

  // Snapshot do cache no momento em que o palette abre. Sem subscription,
  // sem fetch — apenas leitura do que a aplicação já carregou.
  const products = useMemo<Product[]>(() => {
    if (!open) return [];
    return (qc.getQueryData<Product[]>(["products"]) ?? []).slice();
  }, [open, qc]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 6);
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) || (p.category ?? "").toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [products, query]);

  function go(to: string) {
    onOpenChange(false);
    navigate({ to });
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Buscar páginas e produtos..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>Nenhum resultado.</CommandEmpty>

        {NAV_GROUPS.map((group) => (
          <CommandGroup key={group.label} heading={group.label}>
            {group.items.map(({ to, label, icon: Icon }) => (
              <CommandItem key={to} value={`${group.label} ${label}`} onSelect={() => go(to)}>
                <Icon className="size-4 text-text-tertiary" strokeWidth={1.75} aria-hidden="true" />
                <span>{label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}

        {matches.length > 0 && (
          <CommandGroup heading="Produtos">
            {matches.map((p) => (
              <CommandItem
                key={p.id}
                value={`produto ${p.name} ${p.category ?? ""}`}
                onSelect={() => go("/products")}
              >
                <Package className="size-4 text-text-tertiary" strokeWidth={1.75} aria-hidden="true" />
                <span className="truncate">{p.name}</span>
                <span className="ml-auto flex items-center gap-2 text-[11px] text-text-tertiary">
                  <span className="tabular-nums">{p.quantity}</span>
                  <StatusDot status={stockTone(stockStatus(p))} />
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}

/** Registra o atalho ⌘K / Ctrl+K. */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return { open, setOpen };
}
