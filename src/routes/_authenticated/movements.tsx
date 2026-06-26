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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { toast } from "sonner";
import { getCompanyId, type Movement, type Product } from "@/lib/inventory";

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
        .select("*, products(name)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Movement[];
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
          <Button onClick={() => setOpenType("in")} className="bg-primary text-primary-foreground">
            <ArrowDownToLine className="size-4" /> Entrada
          </Button>
          <Button onClick={() => setOpenType("out")} variant="secondary">
            <ArrowUpFromLine className="size-4" /> Saída
          </Button>
        </div>
      </header>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead>Observação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">Carregando...</TableCell></TableRow>
              ) : movements.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">Nenhuma movimentação ainda.</TableCell></TableRow>
              ) : movements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-muted-foreground text-sm">{new Date(m.created_at).toLocaleString("pt-BR")}</TableCell>
                  <TableCell>
                    {m.type === "in"
                      ? <Badge className="bg-primary/15 text-primary border-primary/20">Entrada</Badge>
                      : <Badge className="bg-warning/15 text-warning border-warning/20">Saída</Badge>}
                  </TableCell>
                  <TableCell className="font-medium">{m.products?.name ?? "—"}</TableCell>
                  <TableCell className={`text-right tabular-nums font-medium ${m.type === "in" ? "text-primary" : "text-warning"}`}>
                    {m.type === "in" ? "+" : "−"}{m.quantity}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-xs truncate">{m.note ?? ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={openType !== null} onOpenChange={(o) => { if (!o) setOpenType(null); }}>
        {openType && <MovementDialog type={openType} onClose={() => setOpenType(null)} />}
      </Dialog>
    </div>
  );
}

function MovementDialog({ type, onClose }: { type: "in" | "out"; onClose: () => void }) {
  const qc = useQueryClient();
  const [productId, setProductId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [note, setNote] = useState("");

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name, quantity").order("name");
      return (data ?? []) as Pick<Product, "id" | "name" | "quantity">[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!productId) throw new Error("Selecione um produto");
      if (quantity <= 0) throw new Error("Quantidade inválida");
      const company_id = await getCompanyId();
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("stock_movements").insert({
        company_id,
        product_id: productId,
        type,
        quantity,
        note: note.trim() || null,
        created_by: u.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(type === "in" ? "Entrada registrada" : "Saída registrada");
      qc.invalidateQueries();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{type === "in" ? "Registrar entrada" : "Registrar saída"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
        <div className="space-y-2">
          <Label>Produto</Label>
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger><SelectValue placeholder="Selecione um produto" /></SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name} <span className="text-muted-foreground">(estoque: {p.quantity})</span></SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Quantidade</Label>
          <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} required />
        </div>
        <div className="space-y-2">
          <Label>Observação</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" rows={3} />
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando..." : "Confirmar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
