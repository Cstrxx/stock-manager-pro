import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/ui/page-header";
import { useCompanyQuery } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { daysLeft, type Company } from "@/lib/inventory";

export const Route = createFileRoute("/_authenticated/billing")({
  ssr: false,
  component: BillingPage,
});

const FEATURES = [
  "Cadastro ilimitado de produtos",
  "Entradas e saídas ilimitadas",
  "Controle de clientes nas vendas",
  "Relatórios completos por período",
  "Alertas de estoque baixo e esgotado",
  "Anexo de notas fiscais aos produtos",
  "Multiusuário por empresa",
  "Histórico detalhado de movimentações",
  "Suporte por e-mail",
];

function BillingPage() {
  const { data: company } = useCompanyQuery();

  const trialing = company?.subscription_status === "trialing";
  const days = company ? daysLeft(company.trial_ends_at) : 0;

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Plano e assinatura"
        subtitle="Um único plano com tudo liberado."
      />

      {trialing && (
        <Card className="border-primary/30">
          <CardContent className="p-5 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-md grid place-items-center bg-primary/15 text-primary">
                <Sparkles className="size-5" />
              </div>
              <div>
                <div className="font-medium">Você está no período de teste</div>
                <div className="text-sm text-muted-foreground">
                  {days > 0 ? `Restam ${days} dia${days === 1 ? "" : "s"} de uso gratuito.` : "Seu período de teste expira hoje."}
                </div>
              </div>
            </div>
            <Badge className="bg-primary/15 text-primary border-primary/20">14 dias grátis</Badge>
          </CardContent>
        </Card>
      )}

      <Card className="border-primary/30">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-xl">Plano Completo</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Todas as ferramentas, sem limites.</p>
            </div>
            <Badge className="bg-primary/15 text-primary border-primary/20">Plano único</Badge>
          </div>
          <div className="pt-4 flex items-end gap-2">
            <span className="text-4xl font-semibold tracking-tight">R$ 79,99</span>
            <span className="text-sm text-muted-foreground pb-1.5">/mês</span>
          </div>
          <p className="text-xs text-muted-foreground">Cobrado mensalmente após o período de 14 dias gratuitos. Cancele quando quiser.</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="size-4 text-primary mt-0.5 shrink-0" /> {f}
              </li>
            ))}
          </ul>
          <Button
            className="w-full"
            size="lg"
            onClick={() => toast.info("Cobrança será habilitada em breve. Continue aproveitando seu período de teste.")}
          >
            {trialing ? "Assinar quando o teste terminar" : "Reativar assinatura"}
          </Button>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Sem fidelidade. Sem limite de produtos, movimentações ou relatórios.
      </p>
    </div>
  );
}
