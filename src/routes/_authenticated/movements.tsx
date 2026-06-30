import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMemo, useState } from "react";
import { ArrowDownToLine, ShoppingCart, Plus, Trash2, User, X } from "lucide-react";
import { toast } from "sonner";
import { getCompanyId, formatBRL, type Movement, type Product } from "@/lib/inventory";
import { formatDoc, onlyDigits } from "@/lib/cpf-cnpj";
import type { Partner } from "@/lib/partners";
import { Link } from "@tanstack/react-router";


export const Route = createFileRoute("/_authenticated/movements")({
  ssr: false,
  component: MovementsPage,
});

function MovementsPage() {
  const [openType, setOpenType] = useState<"in" | "out" | null>(null);

  const { data: movements = [], isLoading } = useQuery({
    queryKey: ["movements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select("id, type, quantity, note, customer_name, unit_price, total_amount, sale_id, product_id, created_at, products(name)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as Movement[];
    },
  });

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Movimentações</h1>
          <p className="text-sm text-muted-foreground">Registre entradas (compras) e saídas (vendas).</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setOpenType("in")} variant="outline">
            <ArrowDownToLine className="size-4" /> Entrada
          </Button>
          <Button
            onClick={() => setOpenType("out")}
            size="lg"
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold shadow-lg shadow-destructive/20 ring-1 ring-destructive/40"
          >
            <ShoppingCart className="size-4" /> Registrar venda / saída
          </Button>
        </div>
      </header>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Qtd.</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">Carregando...</TableCell></TableRow>
              ) : movements.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">Nenhuma movimentação ainda.</TableCell></TableRow>
              ) : movements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap">{new Date(m.created_at).toLocaleString("pt-BR")}</TableCell>
                  <TableCell>
                    {m.type === "in"
                      ? <Badge className="bg-primary/15 text-primary border-primary/20">Entrada</Badge>
                      : <Badge className="bg-destructive/15 text-destructive border-destructive/30">Saída</Badge>}
                  </TableCell>
                  <TableCell className="font-medium">{m.products?.name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{m.type === "out" ? (m.customer_name || "Cliente") : "—"}</TableCell>
                  <TableCell className={`text-right tabular-nums font-medium ${m.type === "in" ? "text-primary" : "text-destructive"}`}>
                    {m.type === "in" ? "+" : "−"}{m.quantity}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{m.total_amount != null ? formatBRL(Number(m.total_amount)) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={openType !== null} onOpenChange={(o) => { if (!o) setOpenType(null); }}>
        {openType === "in" && <EntryDialog onClose={() => setOpenType(null)} />}
        {openType === "out" && <SaleDialog onClose={() => setOpenType(null)} />}
      </Dialog>
    </div>
  );
}

function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, quantity, sale_price")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Pick<Product, "id" | "name" | "quantity" | "sale_price">[];
    },
  });
}

function EntryDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data: products = [] } = useProducts();
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<string>("");
  const [note, setNote] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      if (!productId) throw new Error("Selecione um produto");
      if (quantity <= 0) throw new Error("Quantidade inválida");
      const company_id = await getCompanyId();
      const { data: u } = await supabase.auth.getUser();
      const price = unitPrice ? Number(unitPrice) : null;
      const { error } = await supabase.from("stock_movements").insert({
        company_id,
        product_id: productId,
        type: "in",
        quantity,
        unit_price: price,
        total_amount: price != null ? price * quantity : null,
        note: note.trim() || null,
        created_by: u.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entrada registrada");
      qc.invalidateQueries({ queryKey: ["movements"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Registrar entrada</DialogTitle>
      </DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
        <div className="space-y-2">
          <Label>Produto</Label>
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger><SelectValue placeholder="Selecione um produto" /></SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name} (estoque: {p.quantity})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Quantidade</Label>
            <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} required />
          </div>
          <div className="space-y-2">
            <Label>Preço unit. (opcional)</Label>
            <Input type="number" min={0} step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} placeholder="R$ 0,00" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Observação</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" rows={2} />
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando..." : "Confirmar entrada"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

type CartItem = { product_id: string; name: string; quantity: number; unit_price: number; available: number };

function usePartners() {
  return useQuery({
    queryKey: ["partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("id, name, fantasy_name, cpf_cnpj, kind")
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as Pick<Partner, "id" | "name" | "fantasy_name" | "cpf_cnpj" | "kind">[];
    },
  });
}

function PartnerPicker({
  value,
  onChange,
  customerName,
  onCustomerNameChange,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  customerName: string;
  onCustomerNameChange: (n: string) => void;
}) {
  const { data: partners = [] } = usePartners();
  const customers = useMemo(
    () => partners.filter((p) => p.kind === "customer" || p.kind === "both"),
    [partners],
  );
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = value ? customers.find((p) => p.id === value) ?? null : null;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qDigits = onlyDigits(query);
    if (!q) return customers.slice(0, 8);
    return customers
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.fantasy_name ?? "").toLowerCase().includes(q) ||
          (qDigits && (p.cpf_cnpj ?? "").includes(qDigits)),
      )
      .slice(0, 8);
  }, [customers, query]);

  if (selected) {
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <User className="size-3.5" /> Cliente
        </Label>
        <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{selected.name}</div>
            <div className="text-xs text-muted-foreground tabular-nums">
              {selected.cpf_cnpj ? formatDoc(selected.cpf_cnpj) : "Sem CPF/CNPJ"}
            </div>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => {
              onChange(null);
              onCustomerNameChange("");
              setQuery("");
            }}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 relative">
      <Label className="flex items-center gap-1.5">
        <User className="size-3.5" /> Cliente <span className="text-muted-foreground font-normal">(opcional)</span>
      </Label>
      <Input
        value={query || customerName}
        onChange={(e) => {
          const v = e.target.value;
          setQuery(v);
          onCustomerNameChange(v);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Buscar cadastro ou digitar nome livre..."
      />
      {open && matches.length > 0 && (
        <div className="absolute z-20 left-0 right-0 mt-1 rounded-md border border-border bg-popover shadow-lg max-h-60 overflow-auto">
          {matches.map((p) => (
            <button
              type="button"
              key={p.id}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(p.id);
                onCustomerNameChange(p.name);
                setQuery("");
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-accent transition-colors flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{p.name}</div>
                {p.fantasy_name && (
                  <div className="text-xs text-muted-foreground truncate">{p.fantasy_name}</div>
                )}
              </div>
              {p.cpf_cnpj && (
                <div className="text-xs text-muted-foreground tabular-nums shrink-0">
                  {formatDoc(p.cpf_cnpj)}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
      <div className="text-[11px] text-muted-foreground">
        Não encontrou? <Link to="/partners" className="text-primary hover:underline">Cadastrar cliente</Link>
      </div>
    </div>
  );
}

function SaleDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data: products = [] } = useProducts();
  const [customer, setCustomer] = useState("");
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [selProduct, setSelProduct] = useState("");
  const [qty, setQty] = useState<number>(1);
  const [price, setPrice] = useState<string>("");
  const [note, setNote] = useState("");


  const total = useMemo(() => items.reduce((s, i) => s + i.quantity * i.unit_price, 0), [items]);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  function addItem() {
    if (!selProduct) return toast.error("Selecione um produto");
    if (qty <= 0) return toast.error("Quantidade inválida");
    const p = productMap.get(selProduct);
    if (!p) return;
    const existing = items.find((i) => i.product_id === selProduct);
    const newQty = (existing?.quantity ?? 0) + qty;
    if (newQty > p.quantity) return toast.error(`Estoque insuficiente. Disponível: ${p.quantity}`);
    const unit = price ? Number(price) : Number(p.sale_price ?? 0);
    if (existing) {
      setItems(items.map((i) => i.product_id === selProduct ? { ...i, quantity: newQty, unit_price: unit } : i));
    } else {
      setItems([...items, { product_id: p.id, name: p.name, quantity: qty, unit_price: unit, available: p.quantity }]);
    }
    setSelProduct(""); setQty(1); setPrice("");
  }

  const save = useMutation({
    mutationFn: async () => {
      if (items.length === 0) throw new Error("Adicione ao menos um produto");
      const company_id = await getCompanyId();
      const { data: u } = await supabase.auth.getUser();
      const sale_id = crypto.randomUUID();
      const customer_name = customer.trim() || "Cliente";
      const rows = items.map((i) => ({
        company_id,
        product_id: i.product_id,
        type: "out" as const,
        quantity: i.quantity,
        unit_price: i.unit_price || null,
        total_amount: i.unit_price ? i.unit_price * i.quantity : null,
        customer_name,
        sale_id,
        note: note.trim() || null,
        created_by: u.user?.id,
      }));
      const { error } = await supabase.from("stock_movements").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Venda registrada");
      qc.invalidateQueries({ queryKey: ["movements"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent className="max-w-xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><ShoppingCart className="size-5 text-destructive" /> Registrar venda / saída</DialogTitle>
      </DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5"><User className="size-3.5" /> Cliente <span className="text-muted-foreground font-normal">(opcional)</span></Label>
          <Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Deixe em branco para registrar como 'Cliente'" />
        </div>

        <div className="rounded-md border border-border p-3 space-y-3">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Adicionar produto</div>
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-12 sm:col-span-6">
              <Select value={selProduct} onValueChange={(v) => {
                setSelProduct(v);
                const p = productMap.get(v);
                if (p?.sale_price != null) setPrice(String(p.sale_price));
              }}>
                <SelectTrigger><SelectValue placeholder="Produto" /></SelectTrigger>
                <SelectContent>
                  {products.filter((p) => p.quantity > 0).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} ({p.quantity})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input className="col-span-4 sm:col-span-2" type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} placeholder="Qtd" />
            <Input className="col-span-5 sm:col-span-3" type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="R$ unit." />
            <Button type="button" size="icon" className="col-span-3 sm:col-span-1 w-full" onClick={addItem}><Plus className="size-4" /></Button>
          </div>
        </div>

        {items.length > 0 && (
          <div className="rounded-md border border-border divide-y divide-border">
            {items.map((i, idx) => (
              <div key={i.product_id} className="flex items-center justify-between gap-2 p-3 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{i.name}</div>
                  <div className="text-xs text-muted-foreground">{i.quantity} × {formatBRL(i.unit_price)}</div>
                </div>
                <div className="tabular-nums text-sm">{formatBRL(i.quantity * i.unit_price)}</div>
                <Button type="button" size="icon" variant="ghost" onClick={() => setItems(items.filter((_, x) => x !== idx))}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <div className="flex items-center justify-between p-3 bg-muted/30">
              <span className="text-sm font-medium">Total</span>
              <span className="text-lg font-semibold tabular-nums">{formatBRL(total)}</span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Observação <span className="text-muted-foreground font-normal">(opcional)</span></Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            type="submit"
            disabled={save.isPending || items.length === 0}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold"
          >
            {save.isPending ? "Salvando..." : `Confirmar saída · ${formatBRL(total)}`}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
