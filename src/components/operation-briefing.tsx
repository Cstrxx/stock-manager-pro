import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Boxes,
  Lightbulb,
  Package,
  Radar,
  TrendingUp,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Briefing, Highlight, Insight, NarrativeTopic } from "@/lib/insights";

const TONE_CHIP: Record<Briefing["tone"], { label: string; className: string }> = {
  positive: { label: "Em crescimento", className: "border-primary/25 bg-primary/10 text-primary" },
  neutral: { label: "Estável", className: "border-border bg-secondary/60 text-muted-foreground" },
  attention: { label: "Requer atenção", className: "border-warning/25 bg-warning/10 text-warning" },
};

const HIGHLIGHT_TONE: Record<Highlight["tone"], string> = {
  neutral: "text-foreground",
  primary: "text-primary",
  warning: "text-warning",
  danger: "text-destructive",
};

/**
 * Título e ícone de cada bloco do resumo executivo.
 *
 * O motor de análise (`lib/insights.ts`) já marca cada parágrafo com seu
 * tema; aqui só decidimos como esse tema se apresenta. Nenhuma frase é
 * escrita ou reescrita nesta camada.
 */
const TOPIC: Record<NarrativeTopic, { title: string; icon: LucideIcon }> = {
  geral: { title: "Panorama geral", icon: Radar },
  vendas: { title: "Vendas", icon: TrendingUp },
  produtos: { title: "Produtos", icon: Package },
  estoque: { title: "Estoque", icon: Boxes },
};

/** Chip de tom do briefing, exibido no cabeçalho do painel. */
export function BriefingToneChip({ tone }: { tone: Briefing["tone"] }) {
  const chip = TONE_CHIP[tone];
  return (
    <span
      className={cn(
        "shrink-0 rounded-md border px-2.5 py-1 text-[11px] font-medium leading-none",
        chip.className,
      )}
    >
      {chip.label}
    </span>
  );
}

/**
 * Corpo do Resumo Inteligente da Operação.
 *
 * Renderiza apenas o conteúdo — o card externo, o cabeçalho e a camada de
 * perguntas pertencem ao `IntelligencePanel`. Não faz análise nem busca
 * dados: todo texto vem do motor em `lib/insights.ts`.
 *
 * A leitura é em faixas: resumo → recomendações → indicadores. Cada faixa é
 * separada por hairline e mantém a mesma calha horizontal de 24px do painel.
 */
export function BriefingContent({ briefing }: { briefing: Briefing }) {
  const sections = groupByTopic(briefing.narrative);
  const hasSignals = briefing.risks.length > 0 || briefing.opportunities.length > 0;

  return (
    <>
      {/* --- Alerta crítico -------------------------------------------- */}
      {briefing.criticalAlert && (
        <div className="px-6 pt-6">
          <div className="flex items-start gap-3 rounded-lg border border-warning/25 bg-warning/[0.07] px-4 py-3">
            <TriangleAlert
              className="mt-px size-4 shrink-0 text-warning"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <p className="text-[13px] font-medium leading-relaxed text-warning">
              {briefing.criticalAlert}
            </p>
          </div>
        </div>
      )}

      {/* --- Resumo executivo ------------------------------------------- */}
      <div className="px-6 py-6">
        <SectionLabel>Resumo executivo</SectionLabel>

        <p className="mt-3 max-w-[46ch] text-[19px] font-semibold leading-[1.35] tracking-[-0.016em] text-foreground">
          {briefing.headline}
        </p>

        {sections.length > 0 && (
          <div className="mt-6 grid gap-x-10 gap-y-6 md:grid-cols-2">
            {sections.map(({ topic, texts }) => {
              const meta = TOPIC[topic];
              return (
                <section key={topic}>
                  <div className="flex items-center gap-2">
                    <meta.icon
                      className="size-3.5 shrink-0 text-text-tertiary"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                    <h3 className="text-[11px] font-medium uppercase leading-none tracking-[0.07em] text-text-tertiary">
                      {meta.title}
                    </h3>
                  </div>
                  <div className="mt-2.5 space-y-2">
                    {texts.map((text, i) => (
                      <p key={i} className="text-[14px] leading-[1.7] text-muted-foreground">
                        {text}
                      </p>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      {/* --- Recomendações e pontos de atenção -------------------------- */}
      {hasSignals && (
        <div className="grid gap-px border-t border-border-subtle bg-border-subtle md:grid-cols-2">
          {briefing.opportunities.length > 0 && (
            <SignalColumn
              title="Hoje recomendamos"
              icon={Lightbulb}
              accent="text-primary"
              items={briefing.opportunities}
            />
          )}
          {briefing.risks.length > 0 && (
            <SignalColumn
              title="Pontos de atenção"
              icon={TriangleAlert}
              accent="text-warning"
              items={briefing.risks}
            />
          )}
        </div>
      )}

      {/* --- Indicadores da análise ------------------------------------- */}
      {briefing.highlights.length > 0 && (
        <div className="border-t border-border-subtle px-6 py-6">
          <SectionLabel>Indicadores da análise</SectionLabel>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {briefing.highlights.map((h) => (
              <HighlightCell key={h.id} highlight={h} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/** Rótulo de faixa. Um único estilo para todas as divisões do painel. */
export function SectionLabel({ children }: { children: string }) {
  return (
    <span className="text-[11px] font-medium uppercase leading-none tracking-[0.07em] text-text-tertiary">
      {children}
    </span>
  );
}

/**
 * Agrupa os parágrafos por tema, preservando a ordem em que o motor os
 * gerou. Um tema que não produziu nenhuma frase simplesmente não vira
 * seção — seção vazia comunica menos que seção ausente.
 */
function groupByTopic(narrative: Briefing["narrative"]) {
  const order: NarrativeTopic[] = [];
  const byTopic = new Map<NarrativeTopic, string[]>();

  for (const block of narrative) {
    if (!byTopic.has(block.topic)) {
      byTopic.set(block.topic, []);
      order.push(block.topic);
    }
    byTopic.get(block.topic)!.push(block.text);
  }

  return order.map((topic) => ({ topic, texts: byTopic.get(topic)! }));
}

function SignalColumn({
  title,
  icon: Icon,
  accent,
  items,
}: {
  title: string;
  icon: LucideIcon;
  accent: string;
  items: Insight[];
}) {
  return (
    <div className="bg-card px-6 py-6">
      <div className="flex items-center gap-2">
        <Icon className={cn("size-3.5 shrink-0", accent)} strokeWidth={1.75} aria-hidden="true" />
        <h3 className="text-[11px] font-medium uppercase leading-none tracking-[0.07em] text-text-tertiary">
          {title}
        </h3>
      </div>
      <ul className="mt-3 space-y-1">
        {items.map((item) => (
          <li key={item.id}>
            {item.to ? (
              <Link
                to={item.to}
                search={item.search as never}
                className={cn(
                  "group -mx-2 flex items-start gap-2.5 rounded-lg px-2 py-2",
                  "transition-colors duration-150 ease-out hover:bg-secondary/40",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                <Bullet kind={item.kind} />
                <span className="text-[13px] leading-relaxed text-muted-foreground transition-colors duration-150 group-hover:text-foreground">
                  {item.text}
                </span>
                <ArrowUpRight
                  className="ml-auto mt-0.5 size-3.5 shrink-0 text-text-tertiary opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </Link>
            ) : (
              <div className="-mx-2 flex items-start gap-2.5 px-2 py-2">
                <Bullet kind={item.kind} />
                <span className="text-[13px] leading-relaxed text-muted-foreground">
                  {item.text}
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Bullet({ kind }: { kind: Insight["kind"] }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "mt-[7px] size-1.5 shrink-0 rounded-full",
        kind === "risk" ? "bg-warning" : "bg-primary",
      )}
    />
  );
}

function HighlightCell({ highlight: h }: { highlight: Highlight }) {
  const body = (
    <>
      <div className="truncate text-[10px] font-medium uppercase leading-none tracking-[0.07em] text-text-tertiary">
        {h.label}
      </div>
      <div
        className={cn(
          "mt-2 truncate text-[17px] font-bold leading-none tracking-[-0.025em] tabular-nums",
          HIGHLIGHT_TONE[h.tone],
        )}
        title={h.value}
      >
        {h.value}
      </div>
      <div className="mt-1.5 truncate text-[11px] leading-none text-text-tertiary">
        {h.detail ?? " "}
      </div>
    </>
  );

  const cls = "min-w-0 rounded-lg border border-border-subtle bg-surface-sunken px-3.5 py-3";

  if (!h.to) return <div className={cls}>{body}</div>;

  return (
    <Link
      to={h.to}
      search={h.search as never}
      className={cn(
        cls,
        "block transition-[border-color,background-color] duration-150 ease-out",
        "hover:border-border hover:bg-secondary/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
      )}
    >
      {body}
    </Link>
  );
}

export function BriefingSkeleton() {
  return (
    <section className="rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-3 px-6 pb-5 pt-6">
        <Skeleton className="size-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-2.5 w-32" />
        </div>
      </div>
      <div className="space-y-3 px-6 pb-6">
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-3 w-full max-w-[62ch]" />
        <Skeleton className="h-3 w-full max-w-[58ch]" />
        <Skeleton className="h-3 w-full max-w-[44ch]" />
      </div>
      <div className="grid grid-cols-2 gap-3 border-t border-border-subtle px-6 py-6 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="space-y-2 rounded-lg border border-border-subtle bg-surface-sunken px-3.5 py-3"
          >
            <Skeleton className="h-2 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    </section>
  );
}
