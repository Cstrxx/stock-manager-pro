import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/billing")({
  ssr: false,
  component: BillingPage,
});

const PLANS = [
  { id: "free", name: "Grátis", price: "R$ 0", desc: "Até 50 produtos cadastrados.", features: ["Dashboard", "Movimentações ilimitadas", "1 usuário"] },
  { id: "pro", name: "Profissional", price: "R$ 79", desc: "Para empresas em crescimento.", features: ["Produtos ilimitados", "Relatórios avançados", "Alertas por e-mail", "Até 5 usuários"], highlight: true },
  { id: "business", name: "Business", price: "R$ 199", desc: "Múltiplas unidades.", features: ["Tudo do Profissional", "Multiusuário ilimitado", "Importação de NF (em breve)", "Suporte prioritário"] },
] as const;

function BillingPage() {
  const { data: company } = useQuery({
    queryKey: ["company"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("name, plan").maybeSingle();
      return data;
    },
  });

  const currentPlan = company?.plan ?? "free";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Plano e assinatura</h1>
        <p className="text-sm text-muted-foreground">Escolha o plano que melhor atende sua empresa.</p>
      </header>

      <Card>
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Plano atual</div>
            <div className="text-lg font-semibold mt-1">{PLANS.find(p => p.id === currentPlan)?.name ?? currentPlan}</div>
          </div>
          <Badge variant="outline">Ativo</Badge>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        {PLANS.map((plan) => (
          <Card key={plan.id} className={plan.highlight ? "border-primary/50" : ""} style={plan.highlight ? { boxShadow: "var(--shadow-glow)" } : undefined}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{plan.name}</CardTitle>
                {plan.highlight && <Badge className="bg-primary/15 text-primary border-primary/20">Recomendado</Badge>}
              </div>
              <div className="pt-2">
                <span className="text-3xl font-semibold">{plan.price}</span>
                <span className="text-sm text-muted-foreground">/mês</span>
              </div>
              <p className="text-sm text-muted-foreground">{plan.desc}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="size-4 text-primary mt-0.5 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                variant={plan.highlight ? "default" : "secondary"}
                disabled={currentPlan === plan.id}
                onClick={() => toast.info("Cobrança ainda não implementada nesta versão.")}
              >
                {currentPlan === plan.id ? "Plano atual" : "Escolher"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Esta tela é demonstrativa. A cobrança real pode ser ativada conectando um provedor de pagamentos.</p>
    </div>
  );
}
