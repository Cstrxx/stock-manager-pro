import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableActions,
} from "@/components/ui/table";
import { PageHeader, PageToolbar } from "@/components/ui/page-header";
import { StatusBadge, stockTone } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonRows } from "@/components/ui/skeleton";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search, Paperclip, FileText, ExternalLink, X, MoreHorizontal, Package } from "lucide-react";
import { toast } from "sonner";
import { stockStatus, getCompanyId, formatBRL, type Product } from "@/lib/inventory";
import { assertWriteAllowed } from "@/lib/trial-lock";

const searchSchema = z.object({
  filter: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/_authenticated/products")({
  ssr: false,
  validateSearch: zodValidator(searchSchema),
  component: ProductsPage,
});


const PAGE_SIZE = 50;

function ProductsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate({ from: "/products" });
  const { filter: statusFilter } = Route.useSearch();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [deferredSearch, statusFilter]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { confirm, confirmDialog } = useConfirm();


  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, category, quantity, min_stock, initial_quantity, cost_price, sale_price, invoice_number, invoice_file_path, created_at, updated_at")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });

  const del = useMutation({
    mutationFn: async (p: Product) => {
      assertWriteAllowed();
      if (p.invoice_file_path) {
        await supabase.storage.from("invoices").remove([p.invoice_file_path]);
      }
      const { error } = await supabase.from("products").delete().eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto removido");
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    let list = products;
    if (statusFilter === "low" || statusFilter === "out") {
      list = list.filter((p) => stockStatus(p) === statusFilter);
    }
    if (q) {
      list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.category ?? "").toLowerCase().includes(q));
    }
    return list;
  }, [products, deferredSearch, statusFilter]);


  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const allVisibleSelected = visible.length > 0 && visible.every((p) => selected.has(p.id));
  const someVisibleSelected = visible.some((p) => selected.has(p.id));

  function toggleAll(checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const p of visible) checked ? next.add(p.id) : next.delete(p.id);
      return next;
    });
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  }

  async function requestDelete(p: Product) {
    const ok = await confirm({
      title: `Remover "${p.name}"?`,
      description:
        "O produto sai da listagem e o histórico de movimentações deixa de referenciá-lo. Esta ação não pode ser desfeita.",
      confirmLabel: "Remover produto",
    });
    if (ok) del.mutate(p);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Produtos"
        subtitle={`${products.length} item${products.length === 1 ? "" : "s"} cadastrado${products.length === 1 ? "" : "s"}.`}
        actions={
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button><Plus strokeWidth={1.75} /> Novo produto</Button>
            </DialogTrigger>
            <ProductDialog
              editing={editing}
              onClose={() => { setOpen(false); setEditing(null); }}
            />
          </Dialog>
        }
      />

      <PageToolbar>
        <div className="relative min-w-[240px] max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-tertiary" strokeWidth={1.75} aria-hidden="true" />
          <Input placeholder="Buscar produto ou categoria..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar produto" />
        </div>
        {(statusFilter === "low" || statusFilter === "out") && (
          <Badge variant="outline" className="gap-1 py-1">
            {statusFilter === "low" ? "Estoque baixo" : "Esgotados"}
            <button
              type="button"
              aria-label="Limpar filtro"
              onClick={() => navigate({ search: { filter: "" } })}
              className="rounded-sm transition-colors duration-150 hover:text-foreground"
            >
              <X className="size-3" strokeWidth={2} />
            </button>
          </Badge>
        )}
        {(statusFilter || search) && (
          <span className="text-xs tabular-nums text-text-tertiary">
            {filtered.length} resultado{filtered.length === 1 ? "" : "s"}
          </span>
        )}
        {selected.size > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs tabular-nums text-muted-foreground">
              {selected.size} selecionado{selected.size === 1 ? "" : "s"}
            </span>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Limpar
            </Button>
          </div>
        )}
      </PageToolbar>


      <Card>
        <CardContent className="overflow-hidden rounded-xl p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Checkbox
                    checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                    onCheckedChange={(c) => toggleAll(c === true)}
                    aria-label="Selecionar todos os produtos da página"
                    disabled={visible.length === 0}
                  />
                </TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Mín.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Preço venda</TableHead>
                <TableHead>NF</TableHead>
                <TableHead className="w-[52px]"><span className="sr-only">Ações</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SkeletonRows rows={8} cols={9} />
              ) : visible.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={9} className="h-auto border-0">
                    <EmptyState
                      icon={Package}
                      title={search || statusFilter ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}
                      description={
                        search || statusFilter
                          ? "Ajuste a busca ou remova o filtro para ver mais resultados."
                          : "Cadastre o primeiro produto para começar a controlar seu estoque."
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : visible.map((p) => {
                const s = stockStatus(p);
                const isSelected = selected.has(p.id);
                return (
                  <TableRow key={p.id} data-state={isSelected ? "selected" : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(c) => toggleOne(p.id, c === true)}
                        aria-label={`Selecionar ${p.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.category ?? "—"}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{p.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums text-text-tertiary">{p.min_stock}</TableCell>
                    <TableCell>
                      <StatusBadge status={stockTone(s)} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{p.sale_price ? formatBRL(Number(p.sale_price)) : <span className="text-text-tertiary">—</span>}</TableCell>
                    <TableCell>
                      {p.invoice_number || p.invoice_file_path ? (
                        <InvoiceLink number={p.invoice_number} path={p.invoice_file_path} />
                      ) : <span className="text-xs text-text-tertiary">—</span>}
                    </TableCell>
                    <TableCell>
                      <TableActions>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon-sm" variant="ghost" aria-label={`Ações para ${p.name}`}>
                              <MoreHorizontal strokeWidth={1.75} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onSelect={() => { setEditing(p); setOpen(true); }}>
                              <Pencil className="size-4" strokeWidth={1.75} aria-hidden="true" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={() => { void requestDelete(p); }}
                            >
                              <Trash2 className="size-4" strokeWidth={1.75} aria-hidden="true" />
                              Remover
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableActions>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {pageCount > 1 && (
        <div className="flex items-center justify-between text-[13px] text-muted-foreground">
          <div className="tabular-nums">Página {page + 1} de {pageCount}</div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</Button>
            <Button size="sm" variant="outline" disabled={page + 1 >= pageCount} onClick={() => setPage(page + 1)}>Próxima</Button>
          </div>
        </div>
      )}

      {confirmDialog}
    </div>
  );
}

function InvoiceLink({ number, path }: { number: string | null; path: string | null }) {
  async function open() {
    if (!path) return;
    const { data, error } = await supabase.storage.from("invoices").createSignedUrl(path, 60);
    if (error) return toast.error("Erro ao abrir nota");
    window.open(data.signedUrl, "_blank");
  }
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <FileText className="size-3.5 shrink-0 text-text-tertiary" strokeWidth={1.75} aria-hidden="true" />
      <span className="max-w-[100px] truncate text-muted-foreground">{number ?? "NF"}</span>
      {path && (
        <button
          type="button"
          onClick={open}
          aria-label="Abrir nota fiscal"
          className="rounded-sm text-primary transition-opacity duration-150 hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ExternalLink className="size-3" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}

function ProductDialog({ editing, onClose }: { editing: Product | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(editing?.name ?? "");
  const [category, setCategory] = useState(editing?.category ?? "");
  const [quantity, setQuantity] = useState(editing?.quantity ?? 0);
  const [minStock, setMinStock] = useState(editing?.min_stock ?? 0);
  const [costPrice, setCostPrice] = useState(editing?.cost_price?.toString() ?? "");
  const [salePrice, setSalePrice] = useState(editing?.sale_price?.toString() ?? "");
  const [invoiceNumber, setInvoiceNumber] = useState(editing?.invoice_number ?? "");
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      assertWriteAllowed();
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Informe o nome do produto");

      let invoice_file_path = editing?.invoice_file_path ?? null;

      if (invoiceFile) {
        const company_id = await getCompanyId();
        const ext = invoiceFile.name.split(".").pop() || "bin";
        const path = `${company_id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("invoices").upload(path, invoiceFile, { upsert: false });
        if (upErr) throw new Error("Falha ao enviar nota fiscal: " + upErr.message);
        // remove old file if replacing
        if (editing?.invoice_file_path) {
          await supabase.storage.from("invoices").remove([editing.invoice_file_path]);
        }
        invoice_file_path = path;
      }

      const payload = {
        name: trimmed,
        category: category.trim() || null,
        quantity: Number(quantity),
        min_stock: Number(minStock),
        cost_price: costPrice ? Number(costPrice) : null,
        sale_price: salePrice ? Number(salePrice) : null,
        invoice_number: invoiceNumber.trim() || null,
        invoice_file_path,
      };
      if (editing) {
        const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const company_id = await getCompanyId();
        const initial = Math.max(1, Number(quantity));
        const { error } = await supabase.from("products").insert({ ...payload, company_id, initial_quantity: initial });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Produto atualizado" : "Produto cadastrado");
      qc.invalidateQueries({ queryKey: ["products"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{editing ? "Editar produto" : "Novo produto"}</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
        className="max-h-[70vh] space-y-4 overflow-y-auto pr-1"
      >
        <Field label="Nome" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoria">
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex.: Bebidas" />
          </Field>
          <Field label="Estoque mínimo">
            <Input type="number" min={0} value={minStock} onChange={(e) => setMinStock(Number(e.target.value))} />
          </Field>
        </div>
        {!editing && (
          <Field label="Quantidade inicial" hint="Para alterar o estoque depois, use Entradas/Saídas.">
            <Input type="number" min={0} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Preço de custo">
            <Input type="number" step="0.01" min={0} value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
          </Field>
          <Field label="Preço de venda">
            <Input type="number" step="0.01" min={0} value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
          </Field>
        </div>

        <fieldset className="space-y-3 rounded-lg border border-border-subtle bg-surface-sunken/50 p-3">
          <legend className="flex items-center gap-1.5 px-1 text-[12px] font-medium text-foreground">
            <Paperclip className="size-3.5 text-text-tertiary" strokeWidth={1.75} aria-hidden="true" />
            Nota fiscal
            <span className="font-normal text-text-tertiary">(opcional)</span>
          </legend>
          <Field label="Número da NF">
            <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="Ex.: 000123456" />
          </Field>
          <Field
            label="Arquivo (PDF, imagem ou XML)"
            hint={editing?.invoice_file_path && !invoiceFile ? "Arquivo já anexado. Envie um novo para substituir." : undefined}
          >
            <Input type="file" accept=".pdf,.xml,image/*" onChange={(e) => setInvoiceFile(e.target.files?.[0] ?? null)} />
          </Field>
        </fieldset>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

/** Campo de formulário com rótulo, marcação de obrigatório e dica. */
function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[12px] font-medium text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {hint && <p className="text-[11px] leading-relaxed text-text-tertiary">{hint}</p>}
    </div>
  );
}
