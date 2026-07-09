import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import {
  Boxes, LayoutDashboard, Package, ArrowLeftRight, BellRing, BarChart3,
  Wallet, Users, ShieldCheck, Cloud, Zap, RefreshCw, Smartphone, Lock,
  Check, ChevronDown, Star, ArrowRight, Sparkles, TrendingUp, Activity,
  PlayCircle, CalendarDays, Mail, MapPin, Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Estoq — Gestão de Estoque Inteligente para Distribuidoras" },
      { name: "description", content: "Controle de estoque em tempo real, alertas inteligentes, relatórios financeiros e movimentações automáticas. Teste grátis por 14 dias." },
      { property: "og:title", content: "Estoq — Gestão de Estoque Inteligente" },
      { property: "og:description", content: "O controle inteligente do seu estoque começa aqui. Sistema profissional para distribuidoras e pequenos negócios." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Estoq",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "79.90", priceCurrency: "BRL" },
      }),
    }],
  }),
  component: Landing,
});

const nav = [
  { href: "#recursos", label: "Recursos" },
  { href: "#funcionalidades", label: "Funcionalidades" },
  { href: "#planos", label: "Planos" },
  { href: "#sobre", label: "Sobre" },
  { href: "#contato", label: "Contato" },
];

const benefits = [
  { icon: Package, title: "Controle de Estoque", desc: "Cadastro completo com SKU, categorias e níveis mínimos por produto." },
  { icon: ArrowLeftRight, title: "Entrada e Saída", desc: "Registre movimentações em segundos com histórico completo e rastreável." },
  { icon: LayoutDashboard, title: "Dashboard Inteligente", desc: "Visão executiva do negócio com métricas atualizadas em tempo real." },
  { icon: BellRing, title: "Alerta de Estoque Baixo", desc: "Notificações automáticas quando produtos atingem 25% do estoque inicial." },
  { icon: BarChart3, title: "Relatórios Avançados", desc: "Curva ABC, giro de estoque e análise de vendas por período." },
  { icon: Users, title: "Clientes & Fornecedores", desc: "Cadastro validado com CPF/CNPJ e busca automática de dados." },
  { icon: Wallet, title: "Financeiro Integrado", desc: "Faturamento mensal, ticket médio e comparativo ano a ano." },
  { icon: ShieldCheck, title: "Segurança Total", desc: "Dados isolados por empresa com criptografia e RLS ponta a ponta." },
  { icon: Cloud, title: "Backup na Nuvem", desc: "Seus dados salvos automaticamente, acessíveis de qualquer lugar." },
  { icon: Smartphone, title: "100% Responsivo", desc: "Use no desktop, tablet ou celular com a mesma experiência." },
  { icon: Zap, title: "Alta Performance", desc: "Interface otimizada que responde em menos de 300ms." },
  { icon: RefreshCw, title: "Tempo Real", desc: "Alterações sincronizadas instantaneamente para toda a equipe." },
];

const steps = [
  { n: "01", title: "Cadastre seus produtos", desc: "Importe ou adicione manualmente. Organize por categoria e defina estoque mínimo." },
  { n: "02", title: "Controle entradas e saídas", desc: "Registre movimentações rapidamente. O sistema atualiza o estoque na hora." },
  { n: "03", title: "Acompanhe relatórios", desc: "Visualize giro, faturamento e desempenho por período em dashboards claros." },
  { n: "04", title: "Receba alertas automáticos", desc: "Nunca mais perca venda por falta de produto. Alertas inteligentes te avisam." },
  { n: "05", title: "Tenha total controle", desc: "Decisões baseadas em dados reais, com histórico completo de tudo." },
];

const features = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: Package, label: "Produtos" },
  { icon: Boxes, label: "Estoque" },
  { icon: ArrowLeftRight, label: "Movimentações" },
  { icon: Users, label: "Clientes" },
  { icon: Users, label: "Fornecedores" },
  { icon: BarChart3, label: "Relatórios" },
  { icon: Wallet, label: "Financeiro" },
  { icon: BellRing, label: "Notificações" },
  { icon: BellRing, label: "Alerta de Estoque" },
  { icon: Cloud, label: "Backup" },
  { icon: Activity, label: "Histórico & Logs" },
];

const highlights = [
  { icon: Zap, label: "Sistema rápido" },
  { icon: Lock, label: "Seguro" },
  { icon: Cloud, label: "Na nuvem" },
  { icon: RefreshCw, label: "Backup automático" },
  { icon: Activity, label: "Tempo real" },
  { icon: Smartphone, label: "Qualquer dispositivo" },
  { icon: TrendingUp, label: "Alta performance" },
];

const testimonials = [
  { name: "Carla Mendes", company: "Distribuidora Sul", text: "Reduzimos perdas em 40% no primeiro mês. Os alertas de estoque baixo mudaram o jogo." },
  { name: "Roberto Lima", company: "Mercadinho Central", text: "Interface muito simples. Meus funcionários aprenderam em minutos. Vale cada centavo." },
  { name: "Ana Paula Rocha", company: "Atacadão Rocha", text: "Os relatórios financeiros me deram clareza que eu nunca tive. Recomendo demais." },
];

const faqs = [
  { q: "Preciso instalar algum programa?", a: "Não. O Estoq roda 100% no navegador, em qualquer dispositivo com internet." },
  { q: "Como funciona o teste grátis?", a: "Você tem 14 dias completos com todas as funcionalidades liberadas, sem cadastro de cartão." },
  { q: "Meus dados ficam seguros?", a: "Sim. Utilizamos criptografia, backups automáticos e isolamento total dos dados por empresa." },
  { q: "Posso cancelar quando quiser?", a: "Claro. Sem multa, sem burocracia. Cancele com um clique dentro do sistema." },
  { q: "Existe limite de produtos?", a: "Não. O plano Premium libera cadastro ilimitado de produtos, clientes e movimentações." },
  { q: "Vocês oferecem suporte?", a: "Sim, suporte por e-mail e chat em horário comercial, com resposta rápida." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground dark">
      <Header />
      <main>
        <Hero />
        <LogosBar />
        <Benefits />
        <HowItWorks />
        <ShowcaseFeatures />
        <Highlights />
        <Pricing />
        <Testimonials />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 backdrop-blur-xl bg-background/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="size-8 rounded-md grid place-items-center" style={{ background: "var(--gradient-primary)" }}>
            <Boxes className="size-4 text-primary-foreground" />
          </div>
          <span className="font-semibold tracking-tight">Estoq</span>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
          {nav.map((n) => (
            <a key={n.href} href={n.href} className="hover:text-foreground transition-colors">{n.label}</a>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-2">
          <Link to="/auth"><Button variant="ghost" size="sm">Entrar</Button></Link>
          <Link to="/auth"><Button size="sm" className="shadow-sm">Teste grátis</Button></Link>
        </div>
        <button className="md:hidden p-2" onClick={() => setOpen(!open)} aria-label="Menu">
          <div className="w-5 h-0.5 bg-foreground mb-1" />
          <div className="w-5 h-0.5 bg-foreground mb-1" />
          <div className="w-5 h-0.5 bg-foreground" />
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-border/60 bg-background px-4 py-3 space-y-2">
          {nav.map((n) => (
            <a key={n.href} href={n.href} onClick={() => setOpen(false)} className="block py-2 text-sm text-muted-foreground">{n.label}</a>
          ))}
          <Link to="/auth" className="block"><Button size="sm" className="w-full">Teste grátis</Button></Link>
        </div>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 opacity-60"
        style={{ background: "radial-gradient(60% 50% at 50% 0%, oklch(0.72 0.17 155 / 0.15), transparent 70%)" }} />
      <div className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs text-muted-foreground animate-fade-in">
            <Sparkles className="size-3.5 text-primary" />
            Novo: alertas inteligentes de estoque em tempo real
          </div>
          <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05] animate-fade-in">
            O controle inteligente do seu estoque{" "}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>
              começa aqui.
            </span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Uma plataforma completa para distribuidoras e pequenos negócios gerenciarem produtos, movimentações,
            clientes e finanças em tempo real — sem planilhas, sem retrabalho.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" className="shadow-lg hover-scale">
                Começar gratuitamente <ArrowRight className="size-4" />
              </Button>
            </Link>
            <a href="#funcionalidades">
              <Button size="lg" variant="outline">
                <PlayCircle className="size-4" /> Assistir demonstração
              </Button>
            </a>
            <a href="#contato">
              <Button size="lg" variant="ghost">
                <CalendarDays className="size-4" /> Agendar demo
              </Button>
            </a>
          </div>
          <div className="mt-6 text-xs text-muted-foreground">14 dias grátis · Sem cartão de crédito · Cancele quando quiser</div>
        </div>

        <HeroVisual />

        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {[
            { k: "+1.000", v: "movimentações/dia" },
            { k: "99,9%", v: "disponibilidade" },
            { k: "100%", v: "seguro & criptografado" },
            { k: "Real-time", v: "atualização instantânea" },
          ].map((s) => (
            <div key={s.v} className="rounded-lg border border-border/60 bg-card/40 p-4 text-center">
              <div className="text-xl font-semibold">{s.k}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.v}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HeroVisual() {
  return (
    <div className="mt-14 relative">
      <div className="relative mx-auto max-w-5xl rounded-2xl border border-border/70 bg-card/70 backdrop-blur-xl p-3 shadow-2xl"
        style={{ boxShadow: "var(--shadow-glow)" }}>
        <div className="rounded-xl overflow-hidden border border-border/60 bg-background">
          {/* Mock dashboard */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border/60 bg-sidebar/60">
            <div className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-destructive/70" />
              <span className="size-2.5 rounded-full bg-warning/70" />
              <span className="size-2.5 rounded-full bg-success/70" />
            </div>
            <div className="ml-3 text-xs text-muted-foreground">app.estoq.com.br/dashboard</div>
          </div>
          <div className="grid grid-cols-12 min-h-[420px]">
            <div className="hidden md:block col-span-2 border-r border-border/60 bg-sidebar/60 p-3 space-y-1.5">
              {[LayoutDashboard, Package, ArrowLeftRight, BellRing, BarChart3, Wallet].map((I, i) => (
                <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs ${i === 0 ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground"}`}>
                  <I className="size-3.5" /> <span className="hidden lg:inline">Item {i + 1}</span>
                </div>
              ))}
            </div>
            <div className="col-span-12 md:col-span-10 p-4 space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { l: "Produtos", v: "1.284", d: "+12%" },
                  { l: "Faturamento", v: "R$ 84,2k", d: "+8%" },
                  { l: "Movimentações", v: "3.129", d: "+21%" },
                  { l: "Alertas", v: "17", d: "atenção" },
                ].map((c) => (
                  <div key={c.l} className="rounded-lg border border-border/60 bg-card p-3">
                    <div className="text-[11px] text-muted-foreground">{c.l}</div>
                    <div className="text-lg font-semibold mt-0.5">{c.v}</div>
                    <div className="text-[10px] text-primary mt-1">{c.d}</div>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-border/60 bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium">Movimentações da semana</div>
                  <div className="text-xs text-muted-foreground">Últimos 7 dias</div>
                </div>
                <div className="flex items-end gap-2 h-32">
                  {[40, 65, 48, 82, 58, 92, 70].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t"
                      style={{ height: `${h}%`, background: "var(--gradient-primary)", opacity: 0.85 }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Floating cards */}
      <div className="hidden lg:block absolute -left-6 top-24 rounded-xl border border-border/70 bg-card/90 backdrop-blur p-3 shadow-xl w-56 animate-fade-in">
        <div className="flex items-center gap-2 text-xs text-primary"><BellRing className="size-3.5" /> Estoque baixo</div>
        <div className="text-sm font-medium mt-1">Café Especial 500g</div>
        <div className="text-xs text-muted-foreground mt-0.5">Restam 12 unidades (20%)</div>
      </div>
      <div className="hidden lg:block absolute -right-6 bottom-16 rounded-xl border border-border/70 bg-card/90 backdrop-blur p-3 shadow-xl w-60 animate-fade-in">
        <div className="flex items-center gap-2 text-xs text-primary"><TrendingUp className="size-3.5" /> Faturamento</div>
        <div className="text-sm font-medium mt-1">R$ 12.480 hoje</div>
        <div className="text-xs text-muted-foreground mt-0.5">+18% vs. ontem</div>
      </div>
    </div>
  );
}

function LogosBar() {
  return (
    <section className="border-y border-border/60 bg-card/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center text-xs uppercase tracking-widest text-muted-foreground mb-6">
          Confiado por distribuidoras e mercadinhos em todo o Brasil
        </div>
        <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-4 opacity-70">
          {["Distribuidora Sul", "Mercadinho Central", "Atacadão Rocha", "Comercial Vale", "Empório Bom Preço", "Depósito Real"].map((n) => (
            <div key={n} className="text-sm font-medium tracking-tight text-muted-foreground">{n}</div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionHeader({ eyebrow, title, desc }: { eyebrow: string; title: string; desc?: string }) {
  return (
    <div className="max-w-2xl mx-auto text-center mb-14">
      <div className="text-xs uppercase tracking-widest text-primary font-medium">{eyebrow}</div>
      <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">{title}</h2>
      {desc && <p className="mt-4 text-muted-foreground">{desc}</p>}
    </div>
  );
}

function Benefits() {
  return (
    <section id="recursos" className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Recursos"
          title="Tudo que você precisa para operar com precisão"
          desc="Da entrada da mercadoria ao fechamento financeiro, um único sistema para toda a operação."
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {benefits.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="group rounded-xl border border-border/60 bg-card/60 p-5 hover:border-primary/40 hover:bg-card transition-all">
              <div className="size-10 rounded-lg grid place-items-center bg-primary/10 text-primary group-hover:bg-primary/15 transition-colors">
                <Icon className="size-5" />
              </div>
              <div className="mt-4 font-medium">{title}</div>
              <div className="mt-1 text-sm text-muted-foreground leading-relaxed">{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="py-20 lg:py-28 bg-card/20 border-y border-border/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Como funciona" title="Em 5 passos você tem o controle total" />
        <div className="grid md:grid-cols-5 gap-4">
          {steps.map((s, i) => (
            <div key={s.n} className="relative rounded-xl border border-border/60 bg-card p-5">
              <div className="text-xs font-mono text-primary">{s.n}</div>
              <div className="mt-3 font-medium">{s.title}</div>
              <div className="mt-1.5 text-sm text-muted-foreground">{s.desc}</div>
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 text-primary">
                  <ArrowRight className="size-4" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ShowcaseFeatures() {
  return (
    <section id="funcionalidades" className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Funcionalidades"
          title="Um sistema completo, sem complicações"
          desc="Cada módulo pensado para reduzir cliques e acelerar decisões."
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {features.map(({ icon: Icon, label }, i) => (
            <div key={i} className="rounded-lg border border-border/60 bg-card/60 px-4 py-5 flex items-center gap-3 hover:bg-card transition-colors">
              <div className="size-9 rounded-md grid place-items-center bg-primary/10 text-primary">
                <Icon className="size-4" />
              </div>
              <div className="text-sm font-medium">{label}</div>
            </div>
          ))}
        </div>

        {/* Feature showcase blocks */}
        <div className="mt-16 grid lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-border/60 bg-card/60 p-6 lg:p-8">
            <div className="text-xs uppercase tracking-widest text-primary font-medium">Dashboard</div>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight">Toda a operação em uma tela</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Indicadores executivos, movimentações do dia, alertas e faturamento — tudo atualizado em tempo real.
            </p>
            <div className="mt-6 rounded-lg border border-border/60 bg-background p-4">
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-md bg-card border border-border/60 p-3">
                    <div className="h-2 w-10 rounded bg-muted mb-2" />
                    <div className="h-4 w-16 rounded" style={{ background: "var(--gradient-primary)", opacity: 0.7 }} />
                  </div>
                ))}
              </div>
              <div className="mt-3 h-24 rounded-md bg-card border border-border/60 grid place-items-center">
                <div className="flex items-end gap-1 h-16">
                  {[30, 55, 40, 70, 50, 85, 65].map((h, i) => (
                    <div key={i} className="w-3 rounded-t" style={{ height: `${h}%`, background: "var(--gradient-primary)" }} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/60 p-6 lg:p-8">
            <div className="text-xs uppercase tracking-widest text-primary font-medium">Alertas Inteligentes</div>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight">Nunca mais perca uma venda</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Notificações automáticas quando produtos atingem o limite mínimo, com histórico completo.
            </p>
            <div className="mt-6 space-y-2">
              {[
                { p: "Café Especial 500g", q: "12 un · 20%" },
                { p: "Açúcar Cristal 1kg", q: "8 un · 15%" },
                { p: "Óleo de Soja 900ml", q: "23 un · 24%" },
              ].map((a) => (
                <div key={a.p} className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-md bg-warning/15 text-warning grid place-items-center">
                      <BellRing className="size-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{a.p}</div>
                      <div className="text-xs text-muted-foreground">Estoque baixo</div>
                    </div>
                  </div>
                  <div className="text-xs font-mono text-warning">{a.q}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Highlights() {
  return (
    <section className="py-16 border-y border-border/60 bg-card/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap justify-center gap-3">
          {highlights.map(({ icon: Icon, label }) => (
            <div key={label} className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-4 py-2 text-sm">
              <Icon className="size-4 text-primary" />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="planos" className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Planos"
          title="Um plano. Tudo incluso."
          desc="Sem limites artificiais. Sem taxas escondidas. Sem contrato de fidelidade."
        />
        <div className="max-w-xl mx-auto">
          <div className="relative rounded-2xl border-2 border-primary/50 bg-card p-8 shadow-2xl"
            style={{ boxShadow: "var(--shadow-glow)" }}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary text-primary-foreground text-xs font-medium px-3 py-1">
              14 dias grátis
            </div>
            <div className="text-center">
              <div className="text-sm text-primary font-medium">Plano Premium</div>
              <div className="mt-4 flex items-baseline justify-center gap-1">
                <span className="text-5xl font-semibold tracking-tight">R$ 79,99</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
              <div className="text-xs text-muted-foreground mt-2">Cancele a qualquer momento</div>
            </div>
            <div className="my-8 h-px bg-border" />
            <ul className="space-y-3">
              {[
                "Todas as funcionalidades", "Produtos ilimitados", "Movimentações ilimitadas",
                "Clientes e fornecedores", "Dashboard em tempo real", "Alertas de estoque baixo",
                "Relatórios financeiros", "Backup automático diário", "Atualizações contínuas",
                "Suporte por e-mail e chat", "Acesso multi-dispositivo", "Segurança nível bancário",
              ].map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm">
                  <div className="mt-0.5 size-5 rounded-full bg-primary/15 text-primary grid place-items-center shrink-0">
                    <Check className="size-3" />
                  </div>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link to="/auth" className="block mt-8">
              <Button size="lg" className="w-full text-base shadow-lg">
                Começar agora <ArrowRight className="size-4" />
              </Button>
            </Link>
            <div className="mt-3 text-center text-xs text-muted-foreground">
              Sem cartão de crédito para começar
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section id="sobre" className="py-20 lg:py-28 bg-card/20 border-y border-border/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Depoimentos" title="Quem usa, recomenda" />
        <div className="grid md:grid-cols-3 gap-5">
          {testimonials.map((t) => (
            <div key={t.name} className="rounded-xl border border-border/60 bg-card p-6">
              <div className="flex gap-0.5 text-primary">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="size-4 fill-current" />)}
              </div>
              <p className="mt-4 text-sm leading-relaxed">"{t.text}"</p>
              <div className="mt-6 flex items-center gap-3">
                <div className="size-10 rounded-full grid place-items-center text-sm font-medium"
                  style={{ background: "var(--gradient-primary)", color: "var(--primary-foreground)" }}>
                  {t.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </div>
                <div>
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.company}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="py-20 lg:py-28">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="FAQ" title="Perguntas frequentes" />
        <div className="space-y-2">
          {faqs.map((f, i) => (
            <div key={f.q} className="rounded-lg border border-border/60 bg-card/60 overflow-hidden">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
                aria-expanded={open === i}
              >
                <span className="text-sm font-medium">{f.q}</span>
                <ChevronDown className={`size-4 text-muted-foreground transition-transform ${open === i ? "rotate-180" : ""}`} />
              </button>
              {open === i && (
                <div className="px-5 pb-4 text-sm text-muted-foreground animate-fade-in">{f.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card p-10 lg:p-16 text-center"
          style={{ boxShadow: "var(--shadow-glow)" }}>
          <div className="absolute inset-0 -z-10 opacity-60"
            style={{ background: "radial-gradient(50% 60% at 50% 100%, oklch(0.72 0.17 155 / 0.25), transparent 70%)" }} />
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight">
            Pronto para transformar sua operação?
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Experimente 14 dias grátis. Sem cartão. Sem compromisso. Só resultado.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" className="shadow-lg text-base">
                Começar gratuitamente <ArrowRight className="size-4" />
              </Button>
            </Link>
            <a href="#planos">
              <Button size="lg" variant="outline">Ver planos</Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer id="contato" className="border-t border-border/60 bg-sidebar/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid lg:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-md grid place-items-center" style={{ background: "var(--gradient-primary)" }}>
                <Boxes className="size-4 text-primary-foreground" />
              </div>
              <span className="font-semibold tracking-tight">Estoq</span>
            </div>
            <p className="mt-4 text-sm text-muted-foreground max-w-xs">
              Sistema profissional de gestão de estoque para distribuidoras e pequenos negócios.
            </p>
          </div>
          <div>
            <div className="text-sm font-medium mb-3">Produto</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#recursos" className="hover:text-foreground">Recursos</a></li>
              <li><a href="#funcionalidades" className="hover:text-foreground">Funcionalidades</a></li>
              <li><a href="#planos" className="hover:text-foreground">Planos</a></li>
              <li><Link to="/auth" className="hover:text-foreground">Entrar</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-medium mb-3">Empresa</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#sobre" className="hover:text-foreground">Sobre</a></li>
              <li><a href="#" className="hover:text-foreground">Política de Privacidade</a></li>
              <li><a href="#" className="hover:text-foreground">Termos de Uso</a></li>
              <li><a href="#" className="hover:text-foreground">LGPD</a></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-medium mb-3">Contato</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><Mail className="size-3.5" /> contato@estoq.com.br</li>
              <li className="flex items-center gap-2"><Phone className="size-3.5" /> (11) 4000-0000</li>
              <li className="flex items-center gap-2"><MapPin className="size-3.5" /> São Paulo, SP</li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-6 border-t border-border/60 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>© {new Date().getFullYear()} Estoq. Todos os direitos reservados.</div>
          <div>Feito com precisão para quem move estoque de verdade.</div>
        </div>
      </div>
    </footer>
  );
}
