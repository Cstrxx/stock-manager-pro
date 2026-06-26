import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { stockStatus, getCompanyId, type Product } from "@/lib/inventory";

export const Route = createFileRoute("/_authenticated/products")({
  ssr: false,
  component: ProductsPage,
});

function ProductsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto removido");
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = products.filter((p) =>
    [p.name, p.category ?? ""].join(" ").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Produtos</h1>
          <p className="text-sm text-muted-foreground">Cadastre e gerencie os itens do seu estoque.</p>
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
        <Input placeholder="Buscar produto..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead className="text-right">Estoque mín.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Preço venda</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-10">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-10">Nenhum produto encontrado.</TableCell></TableRow>
              ) : filtered.map((p) => {
                const s = stockStatus(p);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.category ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{p.min_stock}</TableCell>
                    <TableCell>
                      {s === "ok" && <Badge className="bg-primary/15 text-primary border-primary/20">Em estoque</Badge>}
                      {s === "low" && <Badge className="bg-warning/15 text-warning border-warning/20">Baixo estoque</Badge>}
                      {s === "out" && <Badge className="bg-destructive/15 text-destructive border-destructive/20">Esgotado</Badge>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{p.sale_price ? `R$ ${Number(p.sale_price).toFixed(2)}` : "—"}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="size-3.5" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Remover "${p.name}"?`)) del.mutate(p.id); }}><Trash2 className="size-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
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

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        category: category.trim() || null,
        quantity: Number(quantity),
        min_stock: Number(minStock),
        cost_price: costPrice ? Number(costPrice) : null,
        sale_price: salePrice ? Number(salePrice) : null,
      };
      if (editing) {
        const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const company_id = await getCompanyId();
        const { error } = await supabase.from("products").insert({ ...payload, company_id });
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
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{editing ? "Editar produto" : "Novo produto"}</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={(e) => { e.preventDefault(); if (!name.trim()) { toast.error("Informe o nome"); return; } save.mutate(); }}
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label>Nome*</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
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
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
