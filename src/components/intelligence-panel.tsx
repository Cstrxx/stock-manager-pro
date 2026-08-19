import { Link } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  ArrowRight,
  BarChart3,
  BellRing,
  CornerDownLeft,
  Info,
  Package,
  Radar,
  RotateCcw,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  BriefingContent,
  BriefingSkeleton,
  BriefingToneChip,
  SectionLabel,
} from "@/components/operation-briefing";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Briefing } from "@/lib/insights";
import {
  TOPICS,
  answerTopic,
  matchTopic,
  unknownAnswer,
  type Answer,
  type AnswerItem,
} from "@/lib/assistant";
import type { Movement, Product } from "@/lib/inventory";

const HISTORY_KEY = "estoq:assistant:history";
const HISTORY_MAX = 5;

const ITEM_TONE: Record<NonNullable<AnswerItem["tone"]>, string> = {
  neutral: "text-foreground",
  primary: "text-primary",
  warning: "text-warning",
  danger: "text-destructive",
};

/** Atalhos de navegação — mesmas rotas do menu, ao alcance da análise. */
const NEXT_ACTIONS = [
  { to: "/products", label: "Ver produtos", icon: Package },
  { to: "/movements", label: "Registrar movimentação", icon: ArrowLeftRight },
  { to: "/reports", label: "Abrir relatórios", icon: BarChart3 },
  { to: "/alerts", label: "Ver alertas", icon: BellRing },
] as const;

type Asked = { topicId: string; question: string };

/**
 * Centro de comando do dashboard.
 *
 * Funde o briefing diário e o assistente num único bloco: ao abrir, mostra
 * a análise do dia; ao perguntar, troca a resposta no mesmo lugar. Não é um
 * chat — não há conversa, apenas consulta.
 *
 * A leitura desce em faixas de peso decrescente — identidade, pergunta,
 * análise, ações — separadas por hairline e alinhadas a uma calha única de
 * 24px. É o bloco mais alto e mais largo da página por decisão: é aqui que
 * o usuário entende a operação antes de navegar para qualquer tela.
 *
 * Não busca dados: recebe `products` e `movements` já carregados pelo
 * dashboard e roda o roteador determinístico de `lib/assistant.ts` sobre
 * eles. Nenhuma consulta adicional é disparada.
 */
export function IntelligencePanel({
  briefing,
  products,
  movements,
  isLoading,
  userName,
}: {
  briefing: Briefing | null;
  products: Product[];
  movements: Movement[];
  isLoading: boolean;
  userName?: string | null;
}) {
  const [asked, setAsked] = useState<Asked | null>(null);
  const [draft, setDraft] = useState("");
  const [notFound, setNotFound] = useState<string | null>(null);
  const [history, setHistory] = useState<Asked[]>([]);
  const answerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {
      // Histórico é conveniência — falha de leitura não quebra o painel.
    }
  }, []);

  function remember(entry: Asked) {
    setHistory((prev) => {
      const next = [entry, ...prev.filter((h) => h.topicId !== entry.topicId)].slice(
        0,
        HISTORY_MAX,
      );
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      } catch {
        // Sem persistência disponível, o histórico segue apenas em memória.
      }
      return next;
    });
  }

  function ask(topicId: string, question: string) {
    setNotFound(null);
    setAsked({ topicId, question });
    setDraft("");
    remember({ topicId, question });
    // Leitor de tela e foco vão para a resposta recém-gerada.
    requestAnimationFrame(() => answerRef.current?.focus());
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const topic = matchTopic(text);
    if (!topic) {
      setAsked(null);
      setNotFound(text);
      setDraft("");
      return;
    }
    ask(topic.id, topic.question);
  }

  const answer = useMemo<Answer | null>(() => {
    if (!asked || asked.topicId === "overview") return null;
    return answerTopic(asked.topicId, products, movements);
  }, [asked, products, movements]);

  if (isLoading || !briefing) return <BriefingSkeleton />;

  const showingBriefing = !answer && !notFound;
  const greeting = greetingFor(new Date(), userName);

  return (
    <section
      aria-label="Centro de comando"
      className="animate-enter relative overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]"
    >
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-x-0 top-0 h-px",
          briefing.tone === "attention"
            ? "bg-gradient-to-r from-transparent via-warning/45 to-transparent"
            : "bg-gradient-to-r from-transparent via-primary/45 to-transparent",
        )}
      />

      {/* --- Identidade -------------------------------------------------- */}
      <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-6">
        <div className="flex min-w-0 items-start gap-3.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-border-subtle bg-surface-sunken text-primary">
            <Radar className="size-5" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <SectionLabel>Assistente inteligente</SectionLabel>
            <h2 className="mt-2 text-[20px] font-semibold leading-none tracking-[-0.018em] text-foreground">
              {greeting}
            </h2>
            <p className="mt-2 text-[12px] leading-none text-text-tertiary">
              Análise de{" "}
              {briefing.generatedAt.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
              {" · "}
              {briefing.generatedAt.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {showingBriefing && <BriefingToneChip tone={briefing.tone} />}
          {!showingBriefing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAsked(null);
                setNotFound(null);
              }}
            >
              <RotateCcw strokeWidth={1.75} /> Voltar ao resumo
            </Button>
          )}
        </div>
      </div>

      {/* --- Pergunta ---------------------------------------------------- */}
      <div className="border-t border-border-subtle px-6 py-6">
        <form onSubmit={submit} className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-tertiary"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Pergunte sobre sua operação — ex.: o que está acabando?"
            aria-label="Perguntar ao assistente"
            className={cn(
              "h-11 w-full rounded-lg border border-border bg-surface-sunken pl-10 pr-24",
              "text-[14px] text-foreground placeholder:text-text-tertiary",
              "transition-[border-color,box-shadow] duration-150 ease-out",
              "hover:border-border-strong",
              "focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45",
            )}
          />
          {draft.trim() && (
            <span className="pointer-events-none absolute right-3.5 top-1/2 flex -translate-y-1/2 items-center gap-1 text-[11px] text-text-tertiary">
              <CornerDownLeft className="size-3" strokeWidth={2} aria-hidden="true" /> Enter
            </span>
          )}
        </form>

        <div className="mt-5">
          <SectionLabel>Perguntas rápidas</SectionLabel>
          <div className="mt-3 flex flex-wrap gap-2">
            {TOPICS.map((t) => {
              const active = asked?.topicId === t.id || (showingBriefing && t.id === "overview");
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() =>
                    t.id === "overview"
                      ? (setAsked(null), setNotFound(null))
                      : ask(t.id, t.question)
                  }
                  aria-pressed={active}
                  className={cn(
                    "inline-flex h-8 items-center rounded-lg border px-3",
                    "text-[12px] font-medium leading-none whitespace-nowrap",
                    "transition-[background-color,border-color,color] duration-150 ease-out",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                    active
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border bg-surface-sunken text-muted-foreground hover:border-border-strong hover:text-foreground",
                  )}
                >
                  {t.chip}
                </button>
              );
            })}
          </div>
        </div>

        {history.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
            <SectionLabel>Recentes</SectionLabel>
            {history.map((h) => (
              <button
                key={h.topicId}
                type="button"
                onClick={() =>
                  h.topicId === "overview" ? setAsked(null) : ask(h.topicId, h.question)
                }
                className="text-[12px] text-muted-foreground underline-offset-4 transition-colors duration-150 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {h.question}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* --- Análise ----------------------------------------------------- */}
      <div
        ref={answerRef}
        tabIndex={-1}
        aria-live="polite"
        className="border-t border-border-subtle focus:outline-none"
      >
        {notFound ? (
          <AnswerView answer={unknownAnswer(notFound)} />
        ) : answer ? (
          <AnswerView answer={answer} />
        ) : (
          <BriefingContent briefing={briefing} />
        )}
      </div>

      {/* --- Próximas ações ---------------------------------------------- */}
      <div className="border-t border-border-subtle px-6 py-6">
        <SectionLabel>Próximas ações</SectionLabel>
        <div className="mt-3 flex flex-wrap gap-2">
          {NEXT_ACTIONS.map((a) => (
            <Button key={a.to} asChild variant="outline" size="sm">
              <Link to={a.to}>
                <a.icon strokeWidth={1.75} /> {a.label}
              </Link>
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}

function AnswerView({ answer }: { answer: Answer }) {
  return (
    <>
      <div className="px-6 py-6">
        <SectionLabel>{answer.question}</SectionLabel>
        <p className="mt-3 max-w-[46ch] text-[19px] font-semibold leading-[1.35] tracking-[-0.016em] text-foreground">
          {answer.headline}
        </p>
        <div className="mt-4 max-w-[68ch] space-y-2">
          {answer.paragraphs.map((p, i) => (
            <p key={i} className="text-[14px] leading-[1.7] text-muted-foreground">
              {p}
            </p>
          ))}
        </div>

        {answer.caveat && (
          <p className="mt-4 flex items-start gap-2 text-[12px] leading-relaxed text-text-tertiary">
            <Info className="mt-px size-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
            {answer.caveat}
          </p>
        )}

        {answer.link && (
          <Button asChild variant="outline" size="sm" className="mt-5">
            <Link to={answer.link.to} search={answer.link.search as never}>
              {answer.link.label} <ArrowRight strokeWidth={1.75} />
            </Link>
          </Button>
        )}
      </div>

      {answer.items && answer.items.length > 0 && (
        <ul className="divide-y divide-border-subtle border-t border-border-subtle">
          {answer.items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-4 px-6 py-3 transition-colors duration-150 ease-out hover:bg-secondary/25"
            >
              <span className="min-w-0 truncate text-[13px] font-medium text-foreground">
                {item.name}
              </span>
              <span className="shrink-0 text-right">
                <span
                  className={cn(
                    "block text-[13px] font-semibold leading-tight tabular-nums",
                    ITEM_TONE[item.tone ?? "neutral"],
                  )}
                >
                  {item.value}
                </span>
                {item.detail && (
                  <span className="mt-0.5 block text-[11px] leading-tight text-text-tertiary">
                    {item.detail}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {answer.stats && answer.stats.length > 0 && (
        <div className="border-t border-border-subtle px-6 py-6">
          <SectionLabel>Indicadores da análise</SectionLabel>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {answer.stats.map((s) => (
              <div
                key={s.label}
                className="min-w-0 rounded-lg border border-border-subtle bg-surface-sunken px-3.5 py-3"
              >
                <div className="truncate text-[10px] font-medium uppercase leading-none tracking-[0.07em] text-text-tertiary">
                  {s.label}
                </div>
                <div
                  className={cn(
                    "mt-2 truncate text-[17px] font-bold leading-none tracking-[-0.025em] tabular-nums",
                    ITEM_TONE[s.tone ?? "neutral"],
                  )}
                >
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/** Saudação por período do dia — o primeiro contato humano da tela. */
function greetingFor(now: Date, userName?: string | null): string {
  const h = now.getHours();
  const period = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  const first = userName?.trim().split(/\s+/)[0];
  return first ? `${period}, ${first}` : period;
}
