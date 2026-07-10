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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search, Paperclip, FileText, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";
import { stockStatus, getCompanyId, formatBRL, type Product } from "@/lib/inventory";

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
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);

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
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q) || (p.category ?? "").toLowerCase().includes(q));
  }, [products, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Produtos</h1>
          <p className="text-sm text-muted-foreground">{products.length} item{products.length === 1 ? "" : "s"} cadastrado{products.length === 1 ? "" : "s"}.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button><Plus className="size-4" /> Novo produto</Button>
          </DialogTrigger>
          <ProductDialog
            editing={editing}
            onClose={() => { setOpen(false); setEditing(null); }}
          />
        </Dialog>
      </header>

      <div className="relative max-w-sm">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar produto..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Mín.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Preço venda</TableHead>
                <TableHead>NF</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-10">Carregando...</TableCell></TableRow>
              ) : visible.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-10">Nenhum produto encontrado.</TableCell></TableRow>
              ) : visible.map((p) => {
                const s = stockStatus(p);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.category ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{p.min_stock}</TableCell>
                    <TableCell>
                      {s === "ok" && <Badge className="bg-primary/15 text-primary border-primary/20">Em estoque</Badge>}
                      {s === "low" && <Badge className="bg-warning/15 text-warning border-warning/20">Baixo</Badge>}
                      {s === "out" && <Badge className="bg-destructive/15 text-destructive border-destructive/20">Esgotado</Badge>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{p.sale_price ? formatBRL(Number(p.sale_price)) : "—"}</TableCell>
                    <TableCell>
                      {p.invoice_number || p.invoice_file_path ? (
                        <InvoiceLink number={p.invoice_number} path={p.invoice_file_path} />
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="size-3.5" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Remover "${p.name}"?`)) del.mutate(p); }}><Trash2 className="size-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {pageCount > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>Página {page + 1} de {pageCount}</div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</Button>
            <Button size="sm" variant="outline" disabled={page + 1 >= pageCount} onClick={() => setPage(page + 1)}>Próxima</Button>
          </div>
        </div>
      )}
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
      <FileText className="size-3.5 text-muted-foreground" />
      <span className="truncate max-w-[100px]">{number ?? "NF"}</span>
      {path && <button type="button" onClick={open} className="text-primary hover:underline"><ExternalLink className="size-3" /></button>}
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
        className="space-y-4 max-h-[70vh] overflow-y-auto pr-1"
      >
        <div className="space-y-2">
          <Label>Nome*</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex.: Bebidas" />
          </div>
          <div className="space-y-2">
            <Label>Estoque mínimo</Label>
            <Input type="number" min={0} value={minStock} onChange={(e) => setMinStock(Number(e.target.value))} />
          </div>
        </div>
        {!editing && (
          <div className="space-y-2">
            <Label>Quantidade inicial</Label>
            <Input type="number" min={0} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">Para alterar o estoque depois, use Entradas/Saídas.</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Preço de custo</Label>
            <Input type="number" step="0.01" min={0} value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Preço de venda</Label>
            <Input type="number" step="0.01" min={0} value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
          </div>
        </div>

        <div className="rounded-md border border-border p-3 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Paperclip className="size-4 text-muted-foreground" />
            Nota fiscal <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Número da NF</Label>
            <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="Ex.: 000123456" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Arquivo (PDF, imagem ou XML)</Label>
            <Input type="file" accept=".pdf,.xml,image/*" onChange={(e) => setInvoiceFile(e.target.files?.[0] ?? null)} />
            {editing?.invoice_file_path && !invoiceFile && (
              <p className="text-xs text-muted-foreground">Arquivo já anexado. Envie um novo para substituir.</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
