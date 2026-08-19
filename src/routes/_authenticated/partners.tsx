import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableActions,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader, PageToolbar } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonRows } from "@/components/ui/skeleton";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  UserPlus,
  MoreHorizontal,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { getCompanyId } from "@/lib/inventory";
import {
  detectDocType,
  fetchCnpj,
  formatDoc,
  isValidDoc,
  onlyDigits,
} from "@/lib/cpf-cnpj";
import { KIND_LABEL, type Partner, type PartnerKind } from "@/lib/partners";
import { assertWriteAllowed } from "@/lib/trial-lock";

export const Route = createFileRoute("/_authenticated/partners")({
  ssr: false,
  component: PartnersPage,
});

const PAGE_SIZE = 50;

function PartnersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | PartnerKind>("all");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [open, setOpen] = useState(false);

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ["partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as Partner[];
    },
  });

  const del = useMutation({
    mutationFn: async (p: Partner) => {
      assertWriteAllowed();
      const { error } = await supabase.from("partners").delete().eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cadastro removido");
      qc.invalidateQueries({ queryKey: ["partners"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    let list = partners;
    if (kindFilter !== "all") {
      list = list.filter((p) => p.kind === kindFilter || p.kind === "both");
    }
    const q = search.trim().toLowerCase();
    const qDigits = onlyDigits(search);
    if (!q) return list;
    return list.filter((p) => {
      if (p.name.toLowerCase().includes(q)) return true;
      if ((p.fantasy_name ?? "").toLowerCase().includes(q)) return true;
      if (qDigits && (p.cpf_cnpj ?? "").includes(qDigits)) return true;
      return false;
    });
  }, [partners, search, kindFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const { confirm, confirmDialog } = useConfirm();

  async function requestDelete(p: Partner) {
    const ok = await confirm({
      title: `Remover "${p.name}"?`,
      description:
        "O cadastro deixa de aparecer nas listagens e nos seletores de movimentação. Esta ação não pode ser desfeita.",
      confirmLabel: "Remover cadastro",
    });
    if (ok) del.mutate(p);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Clientes & Fornecedores"
        subtitle={`${partners.length} cadastro${partners.length === 1 ? "" : "s"}.`}
        actions={
          <Dialog
            open={open}
            onOpenChange={(o) => {
              setOpen(o);
              if (!o) setEditing(null);
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <UserPlus strokeWidth={1.75} /> Novo cadastro
              </Button>
            </DialogTrigger>
            {open && (
              <PartnerDialog
                editing={editing}
                existing={partners}
                onClose={() => {
                  setOpen(false);
                  setEditing(null);
                }}
              />
            )}
          </Dialog>
        }
      />

      <PageToolbar>
        <div className="relative min-w-[240px] max-w-md flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-tertiary" strokeWidth={1.75} aria-hidden="true" />
          <Input
            placeholder="Buscar por nome ou CPF/CNPJ..."
            className="pl-8"
            aria-label="Buscar cadastro"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as typeof kindFilter)}>
          <SelectTrigger className="w-[170px]" aria-label="Filtrar por tipo">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="customer">Clientes</SelectItem>
            <SelectItem value="supplier">Fornecedores</SelectItem>
          </SelectContent>
        </Select>
        {(search || kindFilter !== "all") && (
          <span className="text-xs tabular-nums text-text-tertiary">
            {filtered.length} resultado{filtered.length === 1 ? "" : "s"}
          </span>
        )}
      </PageToolbar>

      <Card>
        <CardContent className="overflow-hidden rounded-xl p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome / Razão social</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>CPF / CNPJ</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead className="w-[52px]"><span className="sr-only">Ações</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SkeletonRows rows={8} cols={6} />
              ) : visible.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="h-auto border-0">
                    <EmptyState
                      icon={Users}
                      title={search || kindFilter !== "all" ? "Nenhum cadastro encontrado" : "Nenhum cadastro ainda"}
                      description={
                        search || kindFilter !== "all"
                          ? "Ajuste a busca ou o filtro para ver mais resultados."
                          : "Cadastre clientes e fornecedores para vinculá-los às movimentações."
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                visible.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">{p.name}</div>
                      {p.fantasy_name && (
                        <div className="mt-0.5 text-[11px] leading-tight text-text-tertiary">{p.fantasy_name}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.kind === "customer" ? "info" : "neutral"}>
                        {KIND_LABEL[p.kind]}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {p.cpf_cnpj ? formatDoc(p.cpf_cnpj) : <span className="text-text-tertiary">—</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.email || p.phone || <span className="text-text-tertiary">—</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.city ? `${p.city}${p.state ? ` / ${p.state}` : ""}` : <span className="text-text-tertiary">—</span>}
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
                            <DropdownMenuItem
                              onSelect={() => {
                                setEditing(p);
                                setOpen(true);
                              }}
                            >
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
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {pageCount > 1 && (
        <div className="flex items-center justify-between text-[13px] text-muted-foreground">
          <div className="tabular-nums">
            Página {page + 1} de {pageCount}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>
              Anterior
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page + 1 >= pageCount}
              onClick={() => setPage(page + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      {confirmDialog}
    </div>
  );
}

function PartnerDialog({
  editing,
  existing,
  onClose,
}: {
  editing: Partner | null;
  existing: Partner[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [kind, setKind] = useState<PartnerKind>(editing?.kind ?? "customer");
  const [name, setName] = useState(editing?.name ?? "");
  const [fantasy, setFantasy] = useState(editing?.fantasy_name ?? "");
  const [docInput, setDocInput] = useState(editing?.cpf_cnpj ? formatDoc(editing.cpf_cnpj) : "");
  const [email, setEmail] = useState(editing?.email ?? "");
  const [phone, setPhone] = useState(editing?.phone ?? "");
  const [zip, setZip] = useState(editing?.zip_code ?? "");
  const [address, setAddress] = useState(editing?.address ?? "");
  const [city, setCity] = useState(editing?.city ?? "");
  const [state, setState] = useState(editing?.state ?? "");
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [cnpjLoading, setCnpjLoading] = useState(false);

  const docDigits = useMemo(() => onlyDigits(docInput), [docInput]);
  const docType = detectDocType(docDigits);
  const docValid = docDigits.length === 0 ? null : isValidDoc(docDigits);

  // Duplicate detection (same company, same document).
  const duplicate = useMemo(() => {
    if (!docValid || !docDigits) return null;
    return (
      existing.find(
        (p) => p.cpf_cnpj === docDigits && (!editing || p.id !== editing.id),
      ) ?? null
    );
  }, [docDigits, docValid, existing, editing]);

  // Auto-fetch CNPJ data from BrasilAPI when a full valid CNPJ is typed.
  const lastFetchedRef = useRef<string>("");
  useEffect(() => {
    if (docType !== "CNPJ" || !docValid) return;
    if (docDigits === lastFetchedRef.current) return;
    if (editing && editing.cpf_cnpj === docDigits) return; // skip on edit-with-same-doc
    lastFetchedRef.current = docDigits;
    const ctrl = new AbortController();
    setCnpjLoading(true);
    fetchCnpj(docDigits, ctrl.signal)
      .then((info) => {
        if (!info) return;
        if (!name.trim() && info.razao_social) setName(info.razao_social);
        if (!fantasy.trim() && info.nome_fantasia) setFantasy(info.nome_fantasia);
        if (!email.trim() && info.email) setEmail(info.email);
        if (!phone.trim() && info.ddd_telefone_1) setPhone(info.ddd_telefone_1);
        if (!city.trim() && info.municipio) setCity(info.municipio);
        if (!state.trim() && info.uf) setState(info.uf);
        if (!zip.trim() && info.cep) setZip(info.cep);
        if (!address.trim()) {
          const parts = [info.logradouro, info.numero, info.bairro].filter(Boolean);
          if (parts.length) setAddress(parts.join(", "));
        }
        toast.success("Dados do CNPJ preenchidos automaticamente");
      })
      .finally(() => setCnpjLoading(false));
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docDigits, docType, docValid]);

  const save = useMutation({
    mutationFn: async () => {
      assertWriteAllowed();
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Informe o nome / razão social");
      if (docDigits && docValid === false) throw new Error("CPF/CNPJ inválido");
      if (duplicate) throw new Error("Este CPF/CNPJ já está cadastrado");

      const payload = {
        kind,
        name: trimmed,
        fantasy_name: fantasy.trim() || null,
        cpf_cnpj: docDigits || null,
        doc_type: docType,
        email: email.trim() || null,
        phone: phone.trim() || null,
        zip_code: zip.trim() || null,
        address: address.trim() || null,
        city: city.trim() || null,
        state: state.trim().toUpperCase().slice(0, 2) || null,
        notes: notes.trim() || null,
      };

      if (editing) {
        const { error } = await supabase.from("partners").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const company_id = await getCompanyId();
        const { error } = await supabase.from("partners").insert({ ...payload, company_id });
        if (error) {
          if (error.code === "23505") throw new Error("Este CPF/CNPJ já está cadastrado");
          throw error;
        }
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Cadastro atualizado" : "Cadastro criado");
      qc.invalidateQueries({ queryKey: ["partners"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const docFieldClass =
    docValid === true
      ? "border-primary/60 focus-visible:ring-primary/30"
      : docValid === false
        ? "border-destructive/70 focus-visible:ring-destructive/30"
        : "";

  return (
    <DialogContent className="max-w-xl">
      <DialogHeader>
        <DialogTitle>{editing ? "Editar cadastro" : "Novo cadastro"}</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="space-y-4 max-h-[70vh] overflow-y-auto pr-1"
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Tipo*</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as PartnerKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">Cliente</SelectItem>
                <SelectItem value="supplier">Fornecedor</SelectItem>
                <SelectItem value="both">Cliente e fornecedor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>
              CPF / CNPJ
              {cnpjLoading && <Loader2 className="size-3 inline ml-2 animate-spin text-muted-foreground" />}
            </Label>
            <div className="relative">
              <Input
                value={docInput}
                onChange={(e) => setDocInput(formatDoc(e.target.value))}
                onPaste={(e) => {
                  e.preventDefault();
                  const txt = e.clipboardData.getData("text");
                  setDocInput(formatDoc(txt));
                }}
                inputMode="numeric"
                autoComplete="off"
                placeholder="000.000.000-00"
                maxLength={18}
                className={docFieldClass + " pr-9 tabular-nums"}
              />
              {docValid === true && (
                <CheckCircle2 className="size-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-primary" />
              )}
              {docValid === false && (
                <XCircle className="size-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-destructive" />
              )}
            </div>
            <div className="text-xs h-4">
              {docType && docValid === true && (
                <span className="text-primary">{docType} válido</span>
              )}
              {docValid === false && (
                <span className="text-destructive">CPF/CNPJ inválido</span>
              )}
              {duplicate && (
                <span className="text-destructive">
                  Já cadastrado: {duplicate.name}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Nome / Razão social*</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </div>
        <div className="space-y-2">
          <Label>Nome fantasia</Label>
          <Input value={fantasy} onChange={(e) => setFantasy(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2 col-span-1">
            <Label>CEP</Label>
            <Input value={zip} onChange={(e) => setZip(e.target.value)} />
          </div>
          <div className="space-y-2 col-span-2">
            <Label>Endereço</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="space-y-2 col-span-2">
            <Label>Cidade</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="space-y-2 col-span-1">
            <Label>UF</Label>
            <Input value={state} onChange={(e) => setState(e.target.value.toUpperCase())} maxLength={2} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Observações</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={save.isPending || !!duplicate || docValid === false}>
            {save.isPending ? "Salvando..." : (
              <>
                <Plus className="size-4" /> {editing ? "Salvar" : "Cadastrar"}
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
