import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  CornerDownLeft,
  Loader2,
  Package,
  Radar,
  Search,
  Sparkles,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

import { EstoqLogo } from "@/components/brand";
import { NAV_GROUPS } from "@/components/app-nav";
import { useMediaQuery } from "@/hooks/use-media-query";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { formatBRL } from "@/lib/inventory";
import { cn } from "@/lib/utils";

/**
 * Encenação do ESTOQ na tela de acesso.
 *
 * Não é ilustração, screenshot nem vídeo: é o próprio produto rodando em
 * miniatura. O chrome (sidebar, header) vem de `NAV_GROUPS` — a mesma fonte
 * da aplicação real — e cada cena reconstrói uma tela com os mesmos tokens,
 * a mesma métrica tipográfica e os mesmos componentes de status.
 *
 * Um relógio único percorre sete cenas em ~29s e volta ao início. Dentro da
 * cena, o movimento é local: números contam, traços são desenhados, linhas
 * entram escalonadas, a pergunta é digitada. Nada pisca, nada salta — só
 * transform e opacity, na curva do sistema.
 *
 * Com `prefers-reduced-motion: reduce` o relógio não corre: a cena inicial
 * é renderizada completa e estática, e a navegação por capítulos continua
 * disponível no rodapé.
 */

/* ================================================================== */
/* Primitivas de tempo                                                 */
/* ================================================================== */

function usePrefersReducedMotion() {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

/** Verdadeiro depois de `ms` — usado para encadear momentos dentro da cena. */
function useAfter(ms: number) {
  const reduced = usePrefersReducedMotion();
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (reduced) {
      setOn(true);
      return;
    }
    const t = setTimeout(() => setOn(true), ms);
    return () => clearTimeout(t);
  }, [ms, reduced]);
  return on;
}

/** Número contando até o valor final. O dado é o herói — ele se constrói. */
function CountUp({
  to,
  from = 0,
  duration = 1100,
  delay = 160,
  format,
  className,
}: {
  to: number;
  from?: number;
  duration?: number;
  delay?: number;
  format: (v: number) => string;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(from);

  useEffect(() => {
    if (reduced) {
      setValue(to);
      return;
    }
    let raf = 0;
    let origin = 0;
    const tick = (now: number) => {
      if (!origin) origin = now;
      const p = (now - origin - delay) / duration;
      if (p < 0) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const eased = 1 - Math.pow(1 - Math.min(1, p), 4);
      setValue(from + (to - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, from, duration, delay, reduced]);

  return <span className={className}>{format(value)}</span>;
}

/** Pergunta sendo digitada no assistente, caractere a caractere. */
function useTypewriter(text: string, { delay = 420, speed = 38 } = {}) {
  const reduced = usePrefersReducedMotion();
  const [n, setN] = useState(0);

  useEffect(() => {
    if (reduced) {
      setN(text.length);
      return;
    }
    setN(0);
    let interval: ReturnType<typeof setInterval>;
    const start = setTimeout(() => {
      interval = setInterval(() => {
        setN((prev) => {
          if (prev >= text.length) {
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, speed);
    }, delay);
    return () => {
      clearTimeout(start);
      clearInterval(interval);
    };
  }, [text, delay, speed, reduced]);

  return { shown: text.slice(0, n), done: n >= text.length };
}

/* ================================================================== */
/* Dados da encenação — uma distribuidora de bebidas plausível          */
/* ================================================================== */

const int = (v: number) => Math.round(v).toLocaleString("pt-BR");

type CatalogItem = {
  name: string;
  category: string;
  qty: number;
  status: StatusTone;
  detail: string;
};

const CATALOG: CatalogItem[] = [
  {
    name: "Água Mineral 500ml",
    category: "Bebidas",
    qty: 1420,
    status: "in-stock",
    detail: "R$ 2,40",
  },
  {
    name: "Cerveja Pilsen 350ml",
    category: "Bebidas",
    qty: 4960,
    status: "in-stock",
    detail: "R$ 3,70",
  },
  {
    name: "Refrigerante Cola 2L",
    category: "Bebidas",
    qty: 380,
    status: "low-stock",
    detail: "R$ 8,90",
  },
  {
    name: "Energético Tropical 250ml",
    category: "Energéticos",
    qty: 870,
    status: "low-stock",
    detail: "R$ 6,20",
  },
  {
    name: "Suco de Uva Integral 1L",
    category: "Sucos",
    qty: 0,
    status: "out-of-stock",
    detail: "R$ 14,50",
  },
];

const REVENUE_SERIES = [42, 48, 44, 57, 52, 63, 59, 71, 66, 78, 74, 89];

/* ================================================================== */
/* Chrome — a moldura da aplicação real, em miniatura                  */
/* ================================================================== */

function MiniSidebar({ active }: { active: string }) {
  return (
    <div className="flex w-[124px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar @[560px]:w-[152px]">
      <div className="flex h-9 shrink-0 items-center border-b border-sidebar-border px-3">
        <EstoqLogo markClassName="size-[15px]" className="[&>span:last-child]:text-[9.5px]" />
      </div>
      <div className="border-b border-sidebar-border px-3 py-1.5">
        <span className="block truncate text-[9.5px] leading-none text-muted-foreground">
          Distribuidora Vale Verde
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden px-1.5 py-1.5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="px-2 pb-0.5 pt-2.5 text-[8.5px] font-medium uppercase tracking-[0.09em] text-text-tertiary first:pt-0">
              {group.label}
            </div>
            <div className="space-y-px">
              {group.items.map((item) => {
                const on = item.to === active;
                return (
                  <div
                    key={item.to}
                    className={cn(
                      "relative flex items-center gap-1.5 rounded-[5px] py-[5px] pl-2 pr-1.5",
                      "text-[10px] leading-none transition-colors duration-300 ease-out",
                      on
                        ? "bg-sidebar-accent/85 font-medium text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute left-0 top-1/2 h-3 w-[2px] -translate-y-1/2 rounded-r-full bg-primary",
                        "origin-center transition-transform duration-300 ease-out",
                        on ? "scale-y-100" : "scale-y-0",
                      )}
                    />
                    <item.icon
                      className={cn(
                        "size-[11px] shrink-0",
                        on ? "text-foreground" : "text-text-tertiary",
                      )}
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                    <span className="truncate">{item.label}</span>
                    {item.to === "/alerts" && (
                      <span className="ml-auto rounded-[3px] bg-destructive/15 px-1 text-[8px] font-semibold leading-[12px] tabular-nums text-destructive">
                        3
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1.5 border-t border-sidebar-border px-2.5 py-2">
        <span className="grid size-[18px] shrink-0 place-items-center rounded-full border border-border bg-card text-[7.5px] font-semibold text-muted-foreground">
          RM
        </span>
        <div className="min-w-0">
          <div className="truncate text-[9px] font-medium leading-tight text-foreground">
            Renata Moraes
          </div>
          <div className="truncate text-[8px] leading-tight text-text-tertiary">Operação</div>
        </div>
      </div>
    </div>
  );
}

function MiniHeader({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border bg-background/85 px-3">
      <Icon className="size-3 shrink-0 text-text-tertiary" strokeWidth={1.75} aria-hidden="true" />
      <span className="text-[10.5px] font-medium leading-none text-foreground">{title}</span>
      <div className="flex-1" />
      <span className="hidden h-[22px] w-[132px] items-center gap-1.5 rounded-[5px] border border-border bg-surface-sunken px-2 sm:flex">
        <Search
          className="size-[11px] shrink-0 text-text-tertiary"
          strokeWidth={1.75}
          aria-hidden="true"
        />
        <span className="flex-1 text-left text-[9.5px] leading-none text-text-tertiary">
          Buscar...
        </span>
        <span className="rounded-[3px] border border-border bg-card px-1 text-[8px] font-medium leading-[12px] text-text-tertiary">
          ⌘K
        </span>
      </span>
      <span className="relative grid size-[22px] place-items-center text-text-tertiary">
        <Bell className="size-3" strokeWidth={1.75} aria-hidden="true" />
        <span className="absolute right-[3px] top-[3px] size-1 rounded-full bg-destructive ring-2 ring-background" />
      </span>
      <span className="grid size-[20px] place-items-center rounded-full border border-border bg-card text-[8px] font-semibold text-muted-foreground">
        RM
      </span>
    </div>
  );
}

/* ================================================================== */
/* Peças compartilhadas entre cenas                                    */
/* ================================================================== */

function Panel({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={cn(
        "animate-enter rounded-lg border border-border bg-card shadow-[var(--shadow-card)]",
        className,
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function PanelTitle({
  icon: Icon,
  children,
  trailing,
}: {
  icon?: LucideIcon;
  children: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5 border-b border-border-subtle px-3 py-2">
      {Icon && (
        <Icon
          className="size-3 shrink-0 text-text-tertiary"
          strokeWidth={1.75}
          aria-hidden="true"
        />
      )}
      <span className="text-[10px] font-semibold leading-none text-foreground">{children}</span>
      {trailing && <span className="ml-auto">{trailing}</span>}
    </div>
  );
}

const STAT_TONE = {
  neutral: "text-foreground",
  primary: "text-primary",
  warning: "text-warning",
  danger: "text-destructive",
} as const;

function MiniStat({
  label,
  icon: Icon,
  tone = "neutral",
  value,
  hint,
  delay = 0,
}: {
  label: string;
  icon: LucideIcon;
  tone?: keyof typeof STAT_TONE;
  value: ReactNode;
  hint?: ReactNode;
  delay?: number;
}) {
  return (
    <Panel className="px-2.5 py-2" delay={delay}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[8.5px] font-medium uppercase leading-none tracking-[0.06em] text-text-tertiary">
          {label}
        </span>
        <Icon
          className={cn(
            "size-3 shrink-0",
            tone === "neutral" ? "text-text-tertiary" : STAT_TONE[tone],
          )}
          strokeWidth={1.75}
          aria-hidden="true"
        />
      </div>
      <div
        className={cn(
          "mt-1.5 text-[17px] font-bold leading-none tracking-[-0.03em] tabular-nums",
          STAT_TONE[tone],
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-1 text-[8.5px] leading-none text-text-tertiary">{hint}</div>}
    </Panel>
  );
}

/** Traço de faturamento desenhado da esquerda para a direita. */
function AreaChart({ series, className }: { series: number[]; className?: string }) {
  const w = 240;
  const h = 62;
  const max = Math.max(...series) * 1.08;
  const min = Math.min(...series) * 0.72;
  const x = (i: number) => (i / (series.length - 1)) * w;
  const y = (v: number) => h - ((v - min) / (max - min)) * h;
  const line = series
    .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
    >
      {[0.25, 0.5, 0.75].map((g) => (
        <line
          key={g}
          x1="0"
          x2={w}
          y1={h * g}
          y2={h * g}
          className="stroke-border-subtle"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <path
        d={`${line} L ${w} ${h} L 0 ${h} Z`}
        className="fill-primary/10"
        style={{ animation: "estoq-enter 900ms var(--ease-out) 320ms both" }}
      />
      <path
        d={line}
        fill="none"
        className="stroke-primary"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        style={{
          strokeDasharray: 420,
          strokeDashoffset: 420,
          animation: "estoq-draw 1500ms var(--ease-out) 180ms forwards",
        }}
      />
      <circle
        cx={x(series.length - 1)}
        cy={y(series[series.length - 1])}
        r="2.5"
        className="fill-primary"
        style={{ animation: "estoq-enter 400ms var(--ease-out) 1500ms both" }}
      />
    </svg>
  );
}

/* ================================================================== */
/* Cena 1 — Dashboard                                                  */
/* ================================================================== */

function SceneDashboard() {
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="grid grid-cols-2 gap-2 @[560px]:grid-cols-4">
        <MiniStat
          label="Receita 30d"
          icon={TrendingUp}
          delay={0}
          value={<CountUp to={18240} format={(v) => formatBRL(v).replace(/\s/g, " ")} />}
          hint={
            <span className="inline-flex items-center gap-0.5 text-primary">
              <TrendingUp className="size-2.5" strokeWidth={2.5} aria-hidden="true" />
              +12,4%
            </span>
          }
        />
        <MiniStat
          label="Itens em estoque"
          icon={Package}
          delay={45}
          value={<CountUp to={7630} format={int} />}
          hint="42 produtos ativos"
        />
        <MiniStat
          label="Baixo estoque"
          icon={AlertTriangle}
          tone="warning"
          delay={90}
          value={<CountUp to={7} duration={900} format={int} />}
          hint="repor esta semana"
        />
        <MiniStat
          label="Sem estoque"
          icon={AlertTriangle}
          tone="danger"
          delay={135}
          value={<CountUp to={3} duration={900} format={int} />}
          hint="venda bloqueada"
        />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 @[560px]:grid-cols-[1.35fr_1fr]">
        <Panel className="flex min-h-0 flex-col overflow-hidden" delay={180}>
          <PanelTitle
            trailing={
              <span className="rounded-[3px] border border-primary/25 bg-primary/10 px-1.5 py-px text-[8.5px] font-medium leading-[13px] text-primary">
                12 semanas
              </span>
            }
          >
            Faturamento
          </PanelTitle>
          <div className="flex min-h-0 flex-1 flex-col p-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[15px] font-bold leading-none tracking-[-0.03em] tabular-nums text-foreground">
                <CountUp to={18240} delay={260} format={(v) => formatBRL(v)} />
              </span>
              <span className="text-[9px] leading-none text-text-tertiary">últimos 30 dias</span>
            </div>
            <AreaChart series={REVENUE_SERIES} className="mt-2 min-h-0 w-full flex-1" />
          </div>
        </Panel>

        <Panel className="hidden min-h-0 flex-col overflow-hidden @[560px]:flex" delay={225}>
          <PanelTitle icon={Radar}>Movimentações recentes</PanelTitle>
          <div className="min-h-0 flex-1 divide-y divide-border-subtle">
            {[
              {
                name: "Cerveja Pilsen 350ml",
                qty: "−120 un.",
                who: "Bar do Porto",
                tone: "out" as const,
              },
              {
                name: "Água Mineral 500ml",
                qty: "+600 un.",
                who: "Nota 4471",
                tone: "in" as const,
              },
              {
                name: "Energético Tropical",
                qty: "−48 un.",
                who: "Adega Central",
                tone: "out" as const,
              },
            ].map((m, i) => (
              <div
                key={m.name}
                className="animate-enter flex items-center justify-between gap-2 px-3 py-[9px]"
                style={{ animationDelay: `${320 + i * 70}ms` }}
              >
                <span className="min-w-0">
                  <span className="block truncate text-[10px] font-medium leading-tight text-foreground">
                    {m.name}
                  </span>
                  <span className="block truncate text-[8.5px] leading-tight text-text-tertiary">
                    {m.who}
                  </span>
                </span>
                <span
                  className={cn(
                    "shrink-0 text-[10px] font-semibold tabular-nums",
                    m.tone === "in" ? "text-primary" : "text-info",
                  )}
                >
                  {m.qty}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ================================================================== */
/* Cena 2 — Produtos                                                   */
/* ================================================================== */

function SceneProducts() {
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="flex h-[26px] flex-1 items-center gap-1.5 rounded-md border border-border bg-surface-sunken px-2">
          <Search
            className="size-3 shrink-0 text-text-tertiary"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <span className="truncate text-[9.5px] leading-none text-text-tertiary">
            Buscar por nome, categoria ou nota
          </span>
        </span>
        {["Todos", "Baixo estoque", "Sem estoque"].map((chip, i) => (
          <span
            key={chip}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-[5px] border px-2 py-[5px] text-[9.5px] font-medium leading-none",
              i === 0
                ? "border-primary/30 bg-primary/10 text-primary"
                : "hidden border-border bg-surface-sunken text-muted-foreground @[560px]:inline-block",
            )}
          >
            {chip}
          </span>
        ))}
        <span className="shrink-0 whitespace-nowrap rounded-[5px] bg-primary px-2 py-[5px] text-[9.5px] font-medium leading-none text-primary-foreground">
          Novo produto
        </span>
      </div>

      <Panel className="flex min-h-0 flex-1 flex-col overflow-hidden" delay={60}>
        <div className="grid shrink-0 grid-cols-[1.9fr_0.8fr_0.9fr] gap-2 border-b border-border-subtle bg-surface-sunken px-3 py-[7px] text-[8.5px] font-medium uppercase tracking-[0.06em] text-text-tertiary @[560px]:grid-cols-[1.9fr_1fr_0.8fr_0.9fr]">
          <span>Produto</span>
          <span className="hidden @[560px]:block">Categoria</span>
          <span className="text-right">Estoque</span>
          <span className="text-right">Situação</span>
        </div>
        <div className="min-h-0 flex-1 divide-y divide-border-subtle">
          {CATALOG.map((p, i) => (
            <div
              key={p.name}
              className="animate-enter grid grid-cols-[1.9fr_0.8fr_0.9fr] items-center gap-2 px-3 py-[9px] @[560px]:grid-cols-[1.9fr_1fr_0.8fr_0.9fr]"
              style={{ animationDelay: `${140 + i * 80}ms` }}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <Package
                  className="size-3 shrink-0 text-text-tertiary"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className="block truncate text-[10px] font-medium leading-tight text-foreground">
                    {p.name}
                  </span>
                  <span className="block text-[8.5px] leading-tight text-text-tertiary">
                    {p.detail} / un.
                  </span>
                </span>
              </span>
              <span className="hidden truncate text-[9.5px] text-muted-foreground @[560px]:block">
                {p.category}
              </span>
              <span className="text-right text-[10px] font-semibold tabular-nums text-foreground">
                {int(p.qty)}
              </span>
              <span className="flex justify-end">
                <StatusBadge status={p.status} className="scale-[0.82] origin-right" />
              </span>
            </div>
          ))}
        </div>
        <div className="flex shrink-0 items-center justify-between border-t border-border-subtle px-3 py-[7px] text-[8.5px] text-text-tertiary">
          <span>42 produtos · 7.630 unidades</span>
          <span>1 – 5 de 42</span>
        </div>
      </Panel>
    </div>
  );
}

/* ================================================================== */
/* Cena 3 — Venda registrada e estoque atualizado                      */
/* ================================================================== */

function SceneSale() {
  const showCustomer = useAfter(500);
  const showQty = useAfter(950);
  const showTotal = useAfter(1350);
  const submitting = useAfter(1750);
  const confirmed = useAfter(2250);

  return (
    <div className="grid h-full grid-cols-[1fr_1.15fr] gap-2">
      <Panel className="flex flex-col overflow-hidden">
        <PanelTitle icon={ArrowRight}>Registrar saída</PanelTitle>
        <div className="flex flex-1 flex-col gap-2.5 p-3">
          <SaleField label="Produto" value="Água Mineral 500ml" shown />
          <SaleField label="Cliente" value="Mercado São Jorge" shown={showCustomer} />
          <div className="grid grid-cols-2 gap-2">
            <SaleField label="Quantidade" value="240 un." shown={showQty} />
            <SaleField label="Preço unitário" value="R$ 2,40" shown={showQty} />
          </div>

          <div
            className={cn(
              "mt-auto flex items-baseline justify-between rounded-md border border-border-subtle bg-surface-sunken px-2.5 py-2",
              "transition-[opacity,transform] duration-300 ease-out",
              showTotal ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1",
            )}
          >
            <span className="truncate text-[8.5px] font-medium uppercase tracking-[0.06em] text-text-tertiary">
              Total da venda
            </span>
            <span className="shrink-0 whitespace-nowrap text-[15px] font-bold leading-none tracking-[-0.03em] tabular-nums text-foreground">
              {showTotal ? (
                <CountUp to={576} delay={0} duration={700} format={(v) => formatBRL(v)} />
              ) : (
                "—"
              )}
            </span>
          </div>

          <div
            className={cn(
              "flex h-[26px] items-center justify-center gap-1.5 rounded-md text-[10px] font-medium leading-none",
              "transition-colors duration-300 ease-out",
              confirmed ? "bg-primary/15 text-primary" : "bg-primary text-primary-foreground",
            )}
          >
            {confirmed ? (
              <>
                <CheckCircle2 className="size-3" strokeWidth={2} aria-hidden="true" /> Saída
                confirmada
              </>
            ) : submitting ? (
              <>
                <Loader2 className="size-3 animate-spin" strokeWidth={2} aria-hidden="true" />{" "}
                Registrando...
              </>
            ) : (
              "Confirmar saída"
            )}
          </div>
        </div>
      </Panel>

      <Panel className="flex flex-col overflow-hidden" delay={60}>
        <PanelTitle
          icon={Package}
          trailing={
            <span
              className={cn(
                "rounded-[3px] border px-1.5 py-px text-[8.5px] font-medium leading-[13px]",
                "transition-colors duration-500 ease-out",
                confirmed
                  ? "border-primary/25 bg-primary/10 text-primary"
                  : "border-border bg-surface-sunken text-text-tertiary",
              )}
            >
              {confirmed ? "sincronizado" : "aguardando"}
            </span>
          }
        >
          Posição do estoque
        </PanelTitle>

        <div className="flex flex-1 flex-col justify-center gap-3 p-3">
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[10px] font-medium text-foreground">Água Mineral 500ml</span>
              <span className="text-[8.5px] text-text-tertiary">mínimo 400 un.</span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-[24px] font-bold leading-none tracking-[-0.03em] tabular-nums text-foreground">
                {confirmed ? (
                  <CountUp to={1180} from={1420} delay={0} duration={1000} format={int} />
                ) : (
                  int(1420)
                )}
              </span>
              <span className="text-[9.5px] leading-none text-text-tertiary">unidades</span>
              <span
                className={cn(
                  "ml-auto text-[10px] font-semibold tabular-nums text-info",
                  "transition-opacity duration-500 ease-out",
                  confirmed ? "opacity-100" : "opacity-0",
                )}
              >
                −240 un.
              </span>
            </div>
            <div className="mt-2 h-[5px] overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-[1100ms]"
                style={{
                  width: confirmed ? "58%" : "71%",
                  transitionTimingFunction: "var(--ease-out)",
                }}
              />
            </div>
          </div>

          <div className="space-y-px rounded-md border border-border-subtle">
            {[
              { label: "Saída registrada", value: "240 un.", tone: "text-info" },
              { label: "Receita reconhecida", value: "R$ 576,00", tone: "text-primary" },
              { label: "Cobertura estimada", value: "18 dias", tone: "text-foreground" },
            ].map((r, i) => (
              <div
                key={r.label}
                className={cn(
                  "flex items-center justify-between px-2.5 py-[7px] [&+&]:border-t [&+&]:border-border-subtle",
                  "transition-[opacity,transform] duration-500 ease-out",
                  confirmed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1",
                )}
                style={{ transitionDelay: `${i * 90}ms` }}
              >
                <span className="truncate text-[9.5px] text-muted-foreground">{r.label}</span>
                <span
                  className={cn(
                    "shrink-0 whitespace-nowrap text-[10px] font-semibold tabular-nums",
                    r.tone,
                  )}
                >
                  {r.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  );
}

function SaleField({ label, value, shown }: { label: string; value: string; shown: boolean }) {
  return (
    <div>
      <span className="block truncate text-[8.5px] font-medium uppercase tracking-[0.06em] text-text-tertiary">
        {label}
      </span>
      <div
        className={cn(
          "mt-1 flex h-[26px] items-center overflow-hidden rounded-md border bg-surface-sunken px-2",
          "transition-[border-color,background-color] duration-300 ease-out",
          shown ? "border-border-strong" : "border-border",
        )}
      >
        <span
          className={cn(
            "truncate text-[10px] font-medium text-foreground",
            "transition-[opacity,transform] duration-300 ease-out",
            shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-0.5",
          )}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

/* ================================================================== */
/* Cena 4 — Assistente inteligente                                     */
/* ================================================================== */

const AI_QUESTION = "o que está acabando?";

function SceneAssistant() {
  const { shown, done } = useTypewriter(AI_QUESTION, { delay: 420, speed: 42 });
  const thinking = useAfter(1500);
  const answered = useAfter(2200);

  return (
    <Panel className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-2 px-3 pb-2.5 pt-3">
        <span className="grid size-6 shrink-0 place-items-center rounded-md border border-border-subtle bg-surface-sunken text-primary">
          <Radar className="size-3" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <span className="block text-[11px] font-semibold leading-tight text-foreground">
            Assistente da operação
          </span>
          <span className="block text-[8.5px] leading-tight text-text-tertiary">
            Responde sobre os seus dados, não sobre generalidades
          </span>
        </div>
        <span className="ml-auto rounded-[3px] border border-primary/25 bg-primary/10 px-1.5 py-px text-[8.5px] font-medium leading-[13px] text-primary">
          {answered ? "análise pronta" : "analisando"}
        </span>
      </div>

      <div className="border-b border-border-subtle px-3 pb-3">
        <div className="relative flex h-[28px] items-center rounded-md border border-primary/45 bg-surface-sunken pl-7 pr-16 ring-2 ring-ring/25">
          <Search
            className="pointer-events-none absolute left-2.5 size-3 text-text-tertiary"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <span className="text-[10px] leading-none text-foreground">
            {shown}
            {!done && (
              <span
                className="ml-px inline-block h-[11px] w-px translate-y-[1.5px] bg-primary"
                style={{ animation: "estoq-caret 1s steps(1) infinite" }}
              />
            )}
          </span>
          <span className="pointer-events-none absolute right-2.5 flex items-center gap-1 text-[8.5px] text-text-tertiary">
            <CornerDownLeft className="size-2.5" strokeWidth={2} aria-hidden="true" /> Enter
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {["Resumo do dia", "O que está acabando", "Sem giro", "Melhores clientes"].map(
            (chip, i) => (
              <span
                key={chip}
                className={cn(
                  "rounded-[3px] border px-1.5 py-[3px] text-[8.5px] font-medium leading-none",
                  i === 1
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-surface-sunken text-muted-foreground",
                )}
              >
                {chip}
              </span>
            ),
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {!answered ? (
          <div className="space-y-2 px-3 py-3">
            <div
              className={cn(
                "h-2 rounded-full bg-secondary transition-opacity duration-300",
                thinking ? "opacity-100 animate-pulse" : "opacity-0",
              )}
              style={{ width: "62%" }}
            />
            <div
              className={cn(
                "h-2 rounded-full bg-secondary transition-opacity duration-300",
                thinking ? "opacity-100 animate-pulse" : "opacity-0",
              )}
              style={{ width: "88%" }}
            />
            <div
              className={cn(
                "h-2 rounded-full bg-secondary transition-opacity duration-300",
                thinking ? "opacity-100 animate-pulse" : "opacity-0",
              )}
              style={{ width: "45%" }}
            />
          </div>
        ) : (
          <div className="animate-enter">
            <div className="px-3 pb-2.5 pt-3">
              <p className="text-[8.5px] font-medium uppercase tracking-[0.06em] text-text-tertiary">
                O que está acabando?
              </p>
              <p className="mt-1 text-[11.5px] font-semibold leading-snug tracking-[-0.012em] text-foreground">
                3 produtos ficam sem cobertura nos próximos 7 dias.
              </p>
              <p className="mt-1.5 max-w-[62ch] text-[9.5px] leading-[1.65] text-muted-foreground">
                Considerando o giro dos últimos 30 dias, Refrigerante Cola 2L é o mais urgente: sai
                em média 92 un./dia e a posição atual cobre 4 dias. Suco de Uva já está zerado há 2
                dias e bloqueou 3 pedidos.
              </p>
            </div>
            <div className="divide-y divide-border-subtle border-t border-border-subtle">
              {[
                {
                  name: "Suco de Uva Integral 1L",
                  value: "0 un.",
                  detail: "esgotado há 2 dias",
                  tone: "text-destructive",
                },
                {
                  name: "Refrigerante Cola 2L",
                  value: "380 un.",
                  detail: "cobertura de 4 dias",
                  tone: "text-warning",
                },
                {
                  name: "Energético Tropical 250ml",
                  value: "870 un.",
                  detail: "cobertura de 6 dias",
                  tone: "text-warning",
                },
              ].map((item, i) => (
                <div
                  key={item.name}
                  className="animate-enter flex items-center justify-between gap-2 px-3 py-[7px]"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <span className="truncate text-[10px] font-medium text-foreground">
                    {item.name}
                  </span>
                  <span className="shrink-0 text-right">
                    <span
                      className={cn(
                        "block text-[10px] font-semibold leading-tight tabular-nums",
                        item.tone,
                      )}
                    >
                      {item.value}
                    </span>
                    <span className="block text-[8.5px] leading-tight text-text-tertiary">
                      {item.detail}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}

/* ================================================================== */
/* Cena 5 — Relatórios                                                 */
/* ================================================================== */

const REPORT_BARS = [38, 52, 44, 61, 49, 72, 58, 80, 67, 91, 76, 100];
const REPORT_MONTHS = [
  "set",
  "out",
  "nov",
  "dez",
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
];

function SceneReports() {
  return (
    <div className="flex h-full flex-col gap-2">
      <Panel className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <PanelTitle
          trailing={
            <span className="rounded-[3px] border border-border bg-surface-sunken px-1.5 py-px text-[8.5px] font-medium leading-[13px] text-muted-foreground">
              12 meses
            </span>
          }
        >
          Faturamento por mês
        </PanelTitle>
        <div className="flex min-h-0 flex-1 flex-col p-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[19px] font-bold leading-none tracking-[-0.03em] tabular-nums text-foreground">
              <CountUp to={214380} delay={200} duration={1300} format={(v) => formatBRL(v)} />
            </span>
            <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-primary">
              <TrendingUp className="size-2.5" strokeWidth={2.5} aria-hidden="true" />
              +31% no ano
            </span>
          </div>
          <div className="mt-3 flex min-h-0 flex-1 items-end gap-[5px]">
            {REPORT_BARS.map((b, i) => (
              <div
                key={REPORT_MONTHS[i]}
                className="flex min-w-0 flex-1 flex-col items-center gap-1"
              >
                <div
                  className={cn(
                    "w-full origin-bottom rounded-[2px]",
                    i === REPORT_BARS.length - 1 ? "bg-primary" : "bg-primary/35",
                  )}
                  style={{
                    height: `${b}%`,
                    animation: `estoq-grow 700ms var(--ease-out) ${180 + i * 55}ms both`,
                  }}
                />
                <span className="text-[7.5px] leading-none text-text-tertiary">
                  {REPORT_MONTHS[i]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <div className="grid shrink-0 grid-cols-4 gap-2">
        {[
          { label: "Ticket médio", value: "R$ 412", hint: "+8% vs. mês anterior" },
          { label: "Itens vendidos", value: "28.4k", hint: "no período" },
          { label: "Margem bruta", value: "31,2%", hint: "estável" },
          { label: "Pedidos", value: "521", hint: "média 17/dia" },
        ].map((s, i) => (
          <Panel key={s.label} className="px-2.5 py-2" delay={220 + i * 45}>
            <span className="block text-[8.5px] font-medium uppercase leading-none tracking-[0.06em] text-text-tertiary">
              {s.label}
            </span>
            <span className="mt-1.5 block text-[14px] font-bold leading-none tracking-[-0.03em] tabular-nums text-foreground">
              {s.value}
            </span>
            <span className="mt-1 block text-[8.5px] leading-none text-text-tertiary">
              {s.hint}
            </span>
          </Panel>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/* Cena 6 — Faturamento                                                */
/* ================================================================== */

function SceneBilling() {
  return (
    <div className="grid h-full grid-cols-[0.85fr_1.3fr] gap-2 @[560px]:grid-cols-[0.95fr_1.3fr]">
      <div className="flex flex-col gap-2">
        <Panel className="flex-1 p-3">
          <span className="block text-[8.5px] font-medium uppercase leading-none tracking-[0.06em] text-text-tertiary">
            Recebido no mês
          </span>
          <span className="mt-2 block text-[22px] font-bold leading-none tracking-[-0.03em] tabular-nums text-foreground">
            <CountUp to={16840} duration={1200} format={(v) => formatBRL(v)} />
          </span>
          <div className="mt-3 h-[5px] overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full origin-left rounded-full bg-primary"
              style={{ width: "78%", animation: "estoq-widen 1100ms var(--ease-out) 200ms both" }}
            />
          </div>
          <span className="mt-1.5 block text-[8.5px] leading-none text-text-tertiary">
            78% do faturado · 22% em aberto
          </span>
        </Panel>
        <Panel className="flex-1 p-3" delay={60}>
          <span className="block text-[8.5px] font-medium uppercase leading-none tracking-[0.06em] text-text-tertiary">
            A receber
          </span>
          <span className="mt-2 block text-[22px] font-bold leading-none tracking-[-0.03em] tabular-nums text-warning">
            <CountUp to={4720} duration={1200} delay={260} format={(v) => formatBRL(v)} />
          </span>
          <span className="mt-3 block text-[8.5px] leading-none text-text-tertiary">
            9 títulos · 2 vencem em 3 dias
          </span>
        </Panel>
      </div>

      <Panel className="flex flex-col overflow-hidden" delay={120}>
        <PanelTitle icon={Sparkles}>Títulos do período</PanelTitle>
        <div className="min-h-0 flex-1 divide-y divide-border-subtle">
          {[
            {
              doc: "NF 4482",
              who: "Mercado São Jorge",
              value: "R$ 576,00",
              state: "Recebido",
              tone: "in-stock" as StatusTone,
            },
            {
              doc: "NF 4479",
              who: "Bar do Porto",
              value: "R$ 1.284,00",
              state: "Recebido",
              tone: "in-stock" as StatusTone,
            },
            {
              doc: "NF 4471",
              who: "Adega Central",
              value: "R$ 2.140,00",
              state: "Vence em 3 dias",
              tone: "low-stock" as StatusTone,
            },
            {
              doc: "NF 4468",
              who: "Empório Vila Nova",
              value: "R$ 890,00",
              state: "Recebido",
              tone: "in-stock" as StatusTone,
            },
            {
              doc: "NF 4460",
              who: "Conveniência 24h",
              value: "R$ 1.690,00",
              state: "Em aberto",
              tone: "inactive" as StatusTone,
            },
          ].map((t, i) => (
            <div
              key={t.doc}
              className="animate-enter grid grid-cols-[1.4fr_0.9fr_1fr] items-center gap-2 px-3 py-[9px] @[560px]:grid-cols-[0.7fr_1.4fr_0.9fr_1fr]"
              style={{ animationDelay: `${180 + i * 75}ms` }}
            >
              <span className="hidden text-[9.5px] font-medium tabular-nums text-muted-foreground @[560px]:block">
                {t.doc}
              </span>
              <span className="truncate text-[10px] font-medium text-foreground">{t.who}</span>
              <span className="text-right text-[10px] font-semibold tabular-nums text-foreground">
                {t.value}
              </span>
              <span className="flex justify-end">
                <StatusBadge
                  status={t.tone}
                  label={t.state}
                  className="scale-[0.82] origin-right"
                />
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* ================================================================== */
/* Cena 7 — Clientes                                                   */
/* ================================================================== */

const PARTNERS = [
  { name: "Bar do Porto", city: "Santos · SP", orders: "34 pedidos", total: "R$ 18.420" },
  { name: "Mercado São Jorge", city: "Guarujá · SP", orders: "28 pedidos", total: "R$ 14.980" },
  { name: "Adega Central", city: "Santos · SP", orders: "21 pedidos", total: "R$ 11.360" },
  { name: "Empório Vila Nova", city: "Praia Grande · SP", orders: "17 pedidos", total: "R$ 8.740" },
];

function ScenePartners() {
  const created = useAfter(1400);
  const initials = (name: string) =>
    name
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("");

  return (
    <div className="flex h-full flex-col gap-2">
      {/* Em moldura curta (mobile) a lista é a prova — os KPIs saem. */}
      <div className="hidden shrink-0 grid-cols-3 gap-2 @[400px]:grid">
        <MiniStat
          label="Clientes ativos"
          icon={Users}
          value={<CountUp to={68} duration={900} format={int} />}
          hint="nos últimos 90 dias"
        />
        <MiniStat
          label="Ticket médio"
          icon={TrendingUp}
          delay={45}
          value={<CountUp to={412} duration={900} format={(v) => formatBRL(v)} />}
          hint="+8% no mês"
        />
        <MiniStat
          label="Sem comprar há 30d"
          icon={AlertTriangle}
          tone="warning"
          delay={90}
          value={<CountUp to={5} duration={900} format={int} />}
          hint="vale um contato"
        />
      </div>

      <Panel className="flex min-h-0 flex-1 flex-col overflow-hidden" delay={135}>
        <PanelTitle icon={Users}>Clientes</PanelTitle>
        <div className="min-h-0 flex-1 divide-y divide-border-subtle">
          <div
            className={cn(
              "grid grid-cols-[1.6fr_0.9fr] items-center gap-2 overflow-hidden px-3 @[560px]:grid-cols-[1.6fr_1fr_0.9fr]",
              "transition-[opacity,transform,max-height,padding] duration-500 ease-out",
              created
                ? "max-h-16 py-[9px] opacity-100 translate-y-0"
                : "max-h-0 py-0 opacity-0 -translate-y-1",
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="grid size-[22px] shrink-0 place-items-center rounded-full border border-primary/30 bg-primary/10 text-[8px] font-semibold text-primary">
                DN
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[10px] font-medium leading-tight text-foreground">
                  Distribuidora Nova Era
                </span>
                <span className="block truncate text-[8.5px] leading-tight text-text-tertiary">
                  São Vicente · SP
                </span>
              </span>
            </span>
            <span className="hidden text-[9.5px] text-muted-foreground @[560px]:block">
              1º pedido
            </span>
            <span className="flex justify-end">
              <StatusBadge status="in-stock" label="Novo" className="scale-[0.82] origin-right" />
            </span>
          </div>

          {PARTNERS.map((p, i) => (
            <div
              key={p.name}
              className="animate-enter grid grid-cols-[1.6fr_0.9fr] items-center gap-2 px-3 py-[9px] @[560px]:grid-cols-[1.6fr_1fr_0.9fr]"
              style={{ animationDelay: `${220 + i * 80}ms` }}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="grid size-[22px] shrink-0 place-items-center rounded-full border border-border bg-card text-[8px] font-semibold text-muted-foreground">
                  {initials(p.name)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[10px] font-medium leading-tight text-foreground">
                    {p.name}
                  </span>
                  <span className="block truncate text-[8.5px] leading-tight text-text-tertiary">
                    {p.city}
                  </span>
                </span>
              </span>
              <span className="hidden text-[9.5px] text-muted-foreground @[560px]:block">
                {p.orders}
              </span>
              <span className="text-right text-[10px] font-semibold tabular-nums text-foreground">
                {p.total}
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* ================================================================== */
/* Roteiro                                                             */
/* ================================================================== */

type StageToast = { at: number; text: string; tone: "success" | "warning" | "info" };

type Scene = {
  id: string;
  /** Rota destacada na sidebar — a navegação acontece de verdade. */
  nav: string;
  ms: number;
  chapter: string;
  headline: string;
  render: () => ReactNode;
  toasts?: StageToast[];
};

const SCENES: Scene[] = [
  {
    id: "dashboard",
    nav: "/dashboard",
    ms: 4400,
    chapter: "Dashboard",
    headline: "Sua operação inteira em uma tela.",
    render: () => <SceneDashboard />,
  },
  {
    id: "products",
    nav: "/products",
    ms: 3800,
    chapter: "Produtos",
    headline: "Cada item com posição, custo e situação.",
    render: () => <SceneProducts />,
    toasts: [{ at: 1200, text: "42 produtos sincronizados", tone: "info" }],
  },
  {
    id: "sale",
    nav: "/movements",
    ms: 5200,
    chapter: "Venda",
    headline: "Vendeu aqui, o estoque já sabe.",
    render: () => <SceneSale />,
    toasts: [
      { at: 2350, text: "Venda registrada · R$ 576,00", tone: "success" },
      { at: 3300, text: "Estoque sincronizado · −240 un.", tone: "success" },
      { at: 4100, text: "Cola 2L próximo do estoque mínimo", tone: "warning" },
    ],
  },
  {
    id: "assistant",
    nav: "/dashboard",
    ms: 5000,
    chapter: "Inteligência",
    headline: "Pergunte. Ele responde com os seus dados.",
    render: () => <SceneAssistant />,
    toasts: [{ at: 2400, text: "Análise concluída · 30 dias", tone: "info" }],
  },
  {
    id: "reports",
    nav: "/reports",
    ms: 4000,
    chapter: "Relatórios",
    headline: "Relatórios prontos, sem planilha.",
    render: () => <SceneReports />,
    toasts: [{ at: 1600, text: "Relatório atualizado · agosto", tone: "success" }],
  },
  {
    id: "billing",
    nav: "/faturamento",
    ms: 3600,
    chapter: "Faturamento",
    headline: "Quanto entrou, quanto falta, quando vence.",
    render: () => <SceneBilling />,
    toasts: [{ at: 1400, text: "2 títulos vencem em 3 dias", tone: "warning" }],
  },
  {
    id: "partners",
    nav: "/partners",
    ms: 3800,
    chapter: "Clientes",
    headline: "Todo cliente com histórico completo.",
    render: () => <ScenePartners />,
    toasts: [{ at: 1600, text: "Novo cliente cadastrado", tone: "success" }],
  },
];

const NAV_LOOKUP = NAV_GROUPS.flatMap((g) => g.items);

/* ================================================================== */
/* Notificações                                                        */
/* ================================================================== */

type LiveToast = StageToast & { id: number; expires: number; leaving?: boolean };

const TOAST_TONE = {
  success: { icon: Check, ring: "border-primary/30 bg-primary/12 text-primary" },
  warning: { icon: AlertTriangle, ring: "border-warning/30 bg-warning/12 text-warning" },
  info: { icon: Radar, ring: "border-info/30 bg-info/12 text-info" },
} as const;

function ToastStack({ toasts }: { toasts: LiveToast[] }) {
  return (
    <div className="pointer-events-none absolute bottom-3 right-3 z-20 flex w-[210px] flex-col items-end gap-1.5">
      {toasts.map((t) => {
        const tone = TOAST_TONE[t.tone];
        return (
          <div
            key={t.id}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg border border-border bg-popover/95 px-2.5 py-[7px]",
              "shadow-[var(--shadow-overlay)] backdrop-blur-sm",
              "transition-[opacity,transform] duration-300 ease-out",
              t.leaving ? "translate-y-1 opacity-0" : "translate-y-0 opacity-100",
            )}
            style={
              t.leaving ? undefined : { animation: "estoq-toast-in 320ms var(--ease-out) both" }
            }
          >
            <span
              className={cn(
                "grid size-4 shrink-0 place-items-center rounded-full border",
                tone.ring,
              )}
            >
              <tone.icon className="size-2.5" strokeWidth={2.5} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 truncate text-[9.5px] font-medium leading-none text-foreground">
              {t.text}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ================================================================== */
/* Palco                                                               */
/* ================================================================== */

/**
 * Relógio do roteiro.
 *
 * Um único lugar governa cena atual, cena que sai, remontagem e fila de
 * notificações — o palco de desktop e o de mobile são só duas molduras
 * diferentes em volta deste estado.
 */
function useShowreel() {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [run, setRun] = useState(0);
  const [toasts, setToasts] = useState<LiveToast[]>([]);
  const toastId = useRef(0);

  const scene = SCENES[index];
  const navItem = NAV_LOOKUP.find((i) => i.to === scene.nav);

  function goTo(next: number) {
    if (next === index) return;
    setPrev(index);
    setIndex(next);
    setRun((r) => r + 1);
  }

  useEffect(() => {
    if (reduced) return;
    const t = setTimeout(() => goTo((index + 1) % SCENES.length), scene.ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, run, reduced]);

  /* A cena anterior permanece montada só o tempo da fusão. */
  useEffect(() => {
    if (prev === null) return;
    const t = setTimeout(() => setPrev(null), 620);
    return () => clearTimeout(t);
  }, [prev, index]);

  /* Notificações da cena atual. */
  useEffect(() => {
    if (reduced) return;
    const timers = (scene.toasts ?? []).map((t) =>
      window.setTimeout(() => {
        const id = ++toastId.current;
        setToasts((list) => [...list.slice(-2), { ...t, id, expires: Date.now() + 2700 }]);
      }, t.at),
    );
    return () => timers.forEach(clearTimeout);
  }, [index, run, reduced, scene.toasts]);

  /* Varredura única de expiração — sobrevive à troca de cena. */
  useEffect(() => {
    if (toasts.length === 0) return;
    const id = setInterval(() => {
      const now = Date.now();
      setToasts((list) =>
        list
          .filter((t) => now < t.expires)
          .map((t) => (now > t.expires - 320 ? { ...t, leaving: true } : t)),
      );
    }, 180);
    return () => clearInterval(id);
  }, [toasts.length]);

  return { reduced, index, prev, run, scene, navItem, goTo, toasts };
}

type Showreel = ReturnType<typeof useShowreel>;

/** A moldura da aplicação. Em `compact` a sidebar sai e sobra a tela. */
function StageFrame({
  reel,
  compact,
  className,
}: {
  reel: Showreel;
  compact?: boolean;
  className?: string;
}) {
  const { index, prev, run, scene, navItem, toasts } = reel;
  return (
    <div
      className={cn(
        "@container relative flex w-full overflow-hidden rounded-2xl border border-border bg-background",
        "shadow-[var(--shadow-overlay)]",
        className,
      )}
    >
      {!compact && <MiniSidebar active={scene.nav} />}

      <div className="flex min-w-0 flex-1 flex-col">
        <MiniHeader icon={navItem?.icon ?? Package} title={navItem?.label ?? "Dashboard"} />

        <div className="relative min-h-0 flex-1 bg-background p-3">
          {SCENES.map((s, i) => {
            const active = i === index;
            const leaving = i === prev;
            if (!active && !leaving) return null;
            return (
              <div
                key={s.id}
                aria-hidden={!active}
                className={cn(
                  "absolute inset-0 p-3",
                  "transition-[opacity,transform] duration-500 ease-out",
                  active
                    ? "translate-y-0 opacity-100"
                    : "pointer-events-none -translate-y-1.5 opacity-0",
                )}
              >
                {/* `run` remonta a cena para que todo o movimento recomece. */}
                <div key={active ? run : "out"} className="h-full">
                  {s.render()}
                </div>
              </div>
            );
          })}

          <ToastStack toasts={toasts} />
        </div>
      </div>
    </div>
  );
}

/** Capítulos: progresso do atual e atalho para qualquer outro. */
function ChapterRail({
  reel,
  className,
  offsetColor = "sidebar",
}: {
  reel: Showreel;
  className?: string;
  offsetColor?: "sidebar" | "background";
}) {
  const { index, run, scene, goTo, reduced } = reel;
  return (
    <div
      className={cn("flex items-center gap-1.5", className)}
      role="group"
      aria-label="Capítulos da demonstração"
    >
      {SCENES.map((s, i) => (
        <button
          key={s.id}
          type="button"
          onClick={() => goTo(i)}
          aria-current={i === index}
          aria-label={s.chapter}
          title={s.chapter}
          className={cn(
            "relative h-[3px] overflow-hidden rounded-full transition-[width,background-color] duration-300 ease-out",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4",
            offsetColor === "sidebar"
              ? "focus-visible:ring-offset-sidebar"
              : "focus-visible:ring-offset-background",
            i === index ? "w-10 bg-border" : "w-4 bg-border hover:bg-border-strong",
          )}
        >
          {i === index && (
            <span
              key={run}
              aria-hidden="true"
              className="absolute inset-0 origin-left rounded-full bg-primary"
              style={
                reduced
                  ? { transform: "scaleX(1)" }
                  : { animation: `estoq-progress ${scene.ms}ms linear both` }
              }
            />
          )}
        </button>
      ))}
      <span className="ml-2 text-[10px] font-medium leading-none text-text-tertiary">
        {scene.chapter}
      </span>
    </div>
  );
}

/** Frase da cena — troca junto com a tela que está sendo demonstrada. */
function StageHeadline({ index, className }: { index: number; className?: string }) {
  return (
    <div className={className}>
      {SCENES.map((s, i) => (
        <p
          key={s.id}
          aria-hidden={i !== index}
          className={cn(
            "font-semibold leading-[1.25] tracking-[-0.022em] text-foreground",
            "transition-[opacity,transform] duration-500 ease-out",
            i === index
              ? "translate-y-0 opacity-100"
              : "pointer-events-none absolute translate-y-1.5 opacity-0",
          )}
        >
          {s.headline}
        </p>
      ))}
    </div>
  );
}

export function AuthStage() {
  const reel = useShowreel();
  const { reduced, index } = reel;

  /* Fixo em 100vh: o formulário de cadastro é alto e rola do lado direito,
     enquanto a demonstração permanece inteira no campo de visão. */
  return (
    <div className="relative hidden flex-col overflow-hidden border-r border-sidebar-border bg-sidebar px-10 py-9 lg:sticky lg:top-0 lg:flex lg:h-screen xl:px-12">
      {/* Malha de fundo — profundidade sem gradiente colorido nem blur pesado. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage:
            "linear-gradient(oklch(1 0 0 / 2.5%) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 2.5%) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse 80% 62% at 50% 42%, black, transparent)",
        }}
      />

      {/* --- Cabeçalho do palco ---------------------------------------- */}
      <div className="relative z-10 flex shrink-0 items-center justify-between">
        <EstoqLogo />
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/70 py-1 pl-2 pr-2.5">
          <span className="relative grid size-1.5 place-items-center">
            <span className="absolute inset-0 rounded-full bg-primary" />
            {!reduced && (
              <span className="absolute inset-0 animate-ping rounded-full bg-primary/60" />
            )}
          </span>
          <span className="text-[10px] font-medium leading-none text-muted-foreground">
            Demonstração ao vivo
          </span>
        </span>
      </div>

      {/* --- O produto rodando ------------------------------------------ */}
      {/* Proporção de tela real (16:10) — a miniatura precisa ler como um
          monitor, não como um bloco esticado até o rodapé. */}
      <div className="relative z-10 my-8 flex min-h-[340px] flex-1 flex-col justify-center">
        <StageFrame reel={reel} className="aspect-[16/10] max-h-full min-h-[340px]" />
      </div>

      {/* --- Legenda e capítulos ---------------------------------------- */}
      <div className="relative z-10 shrink-0">
        <StageHeadline index={index} className="min-h-[56px] max-w-[26ch] text-[22px]" />
        <ChapterRail reel={reel} className="mt-6" />
        <p className="mt-8 text-[11px] leading-none text-text-tertiary">
          © {new Date().getFullYear()} Estoq · Gestão de estoque para distribuidoras
        </p>
      </div>
    </div>
  );
}

/**
 * Versão para telas estreitas.
 *
 * Mesma encenação, mesmo relógio — sem a sidebar e em altura reduzida, para
 * caber acima do formulário sem empurrar os campos para fora da dobra. Não
 * baixa nenhum recurso extra: é o mesmo DOM da versão de desktop.
 */
export function AuthStageCompact() {
  const reel = useShowreel();

  return (
    <div className="lg:hidden">
      <div className="mb-3 flex items-center justify-between">
        <EstoqLogo />
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/70 py-1 pl-2 pr-2.5">
          <span className="relative grid size-1.5 place-items-center">
            <span className="absolute inset-0 rounded-full bg-primary" />
            {!reel.reduced && (
              <span className="absolute inset-0 animate-ping rounded-full bg-primary/60" />
            )}
          </span>
          <span className="text-[10px] font-medium leading-none text-muted-foreground">
            Demonstração ao vivo
          </span>
        </span>
      </div>

      <StageFrame reel={reel} compact className="h-[232px]" />

      <StageHeadline index={reel.index} className="relative mt-3 min-h-[36px] text-[17px]" />
      <ChapterRail reel={reel} className="mt-2.5" offsetColor="background" />
    </div>
  );
}
