import { formatBRL, stockStatus, type Movement, type Product } from "@/lib/inventory";

/**
 * Motor de análise do ESTOQ.
 *
 * Funções puras: recebem produtos e movimentações já carregados e devolvem
 * um briefing pronto. Não fazem I/O e não guardam estado — a análise é
 * recalculada a cada abertura do dashboard, sempre com os dados atuais.
 *
 * REGRA CENTRAL: nada é afirmado sem dado que sustente. Toda comparação
 * exige base não-vazia; toda porcentagem exige denominador maior que zero.
 * Quando falta dado, a frase simplesmente não é gerada.
 */

/** Janela de observação. Nenhuma afirmação ultrapassa este limite. */
export const ANALYSIS_WINDOW_DAYS = 60;

export const DAY = 86_400_000;

export type InsightKind = "risk" | "opportunity" | "positive" | "neutral";

export type Insight = {
  id: string;
  kind: InsightKind;
  text: string;
  to?: string;
  search?: Record<string, string>;
};

export type Highlight = {
  id: string;
  label: string;
  value: string;
  detail?: string;
  tone: "neutral" | "primary" | "warning" | "danger";
  to?: string;
  search?: Record<string, string>;
};

/**
 * Tema de cada parágrafo do resumo.
 *
 * Rótulo de apresentação, e nada além disso: existe para o resumo executivo
 * poder ser lido em blocos ("Vendas", "Estoque") em vez de um paredão de
 * texto. Nenhum limiar, cálculo ou frase da análise depende dele.
 */
export type NarrativeTopic = "geral" | "vendas" | "produtos" | "estoque";

export type NarrativeBlock = { topic: NarrativeTopic; text: string };

export type Briefing = {
  /** Falso quando não há absolutamente nada para analisar. */
  hasData: boolean;
  /** Há produtos, mas nenhuma movimentação na janela. */
  stockOnly: boolean;
  generatedAt: Date;
  headline: string;
  tone: "positive" | "neutral" | "attention";
  /** Parágrafos em linguagem natural, cada um marcado com seu tema. */
  narrative: NarrativeBlock[];
  highlights: Highlight[];
  risks: Insight[];
  opportunities: Insight[];
  /** Alerta único, exibido em destaque quando algo é grave. */
  criticalAlert?: string;
};

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

export function startOfDay(d: Date | number): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

export function n(value: number): string {
  return value.toLocaleString("pt-BR");
}

export function pct(value: number): string {
  return `${Math.round(value)}%`;
}

/** Variação percentual. Devolve null quando a base é zero (sem base, sem %). */
export function change(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

export function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

/**
 * Amostra mínima antes de afirmar tendência ou concentração.
 *
 * Sem estes limites o motor produz frases estatisticamente vazias — "271%
 * acima de ontem" a partir de duas vendas, ou "100% do faturamento vem de
 * um cliente" quando só existe um cliente. Um gerente experiente não diria
 * nenhuma das duas; o motor também não deve.
 */
const MIN_SALES_FOR_TREND = 3; // vendas na base para citar variação %
const MIN_SALES_FOR_SHARE = 5; // vendas na janela para falar de concentração
const MIN_ENTITIES_FOR_SHARE = 2; // produtos/categorias distintos
const MIN_CUSTOMERS_FOR_SHARE = 3; // clientes distintos

/**
 * Traduz variação em linguagem de gerente.
 *
 * Acima de 200% a porcentagem deixa de comunicar e vira ruído — nesse
 * ponto a leitura humana é multiplicativa ("mais que triplicou").
 */
export function describeChange(delta: number): string {
  const abs = Math.abs(delta);
  if (abs >= 200) {
    const times = 1 + abs / 100;
    const rounded = Math.floor(times);
    if (delta > 0) {
      return rounded >= 4 ? `mais que quadruplicou` : `mais que triplicou`;
    }
    return `caiu para menos de um ${rounded >= 4 ? "quarto" : "terço"}`;
  }
  return `${delta > 0 ? "subiu" : "recuou"} ${pct(abs)}`;
}

/* ------------------------------------------------------------------ */
/* Agregação por janela                                                */
/* ------------------------------------------------------------------ */

export type WindowStats = {
  revenue: number;
  /** Vendas distintas: agrupa itens que compartilham `sale_id`. */
  sales: number;
  unitsOut: number;
  unitsIn: number;
  customers: Set<string>;
  ticket: number | null;
};

function emptyStats(): WindowStats {
  return { revenue: 0, sales: 0, unitsOut: 0, unitsIn: 0, customers: new Set(), ticket: null };
}

export function statsFor(movements: Movement[], from: number, to: number): WindowStats {
  const s = emptyStats();
  const saleIds = new Set<string>();
  let looseSales = 0;

  for (const m of movements) {
    const t = new Date(m.created_at).getTime();
    if (t < from || t >= to) continue;

    if (m.type === "in") {
      s.unitsIn += m.quantity;
      continue;
    }

    s.unitsOut += m.quantity;
    s.revenue += Number(m.total_amount ?? 0);
    if (m.sale_id) saleIds.add(m.sale_id);
    else looseSales++;

    const customer = m.customer_name?.trim();
    if (customer) s.customers.add(customer.toLowerCase());
  }

  s.sales = saleIds.size + looseSales;
  s.ticket = s.sales > 0 ? s.revenue / s.sales : null;
  return s;
}

/** Unidades vendidas por produto dentro de uma janela. */
export function unitsByProduct(
  movements: Movement[],
  from: number,
  to: number,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const m of movements) {
    if (m.type !== "out" || !m.product_id) continue;
    const t = new Date(m.created_at).getTime();
    if (t < from || t >= to) continue;
    map.set(m.product_id, (map.get(m.product_id) ?? 0) + m.quantity);
  }
  return map;
}

/* ------------------------------------------------------------------ */
/* Motor                                                               */
/* ------------------------------------------------------------------ */

export function buildBriefing(
  products: Product[],
  movements: Movement[],
  now: Date = new Date(),
): Briefing {
  const nowMs = now.getTime();
  const todayStart = startOfDay(nowMs);
  const yesterdayStart = todayStart - DAY;

  const w = {
    today: statsFor(movements, todayStart, nowMs + 1),
    yesterday: statsFor(movements, yesterdayStart, todayStart),
    last7: statsFor(movements, nowMs - 7 * DAY, nowMs + 1),
    prev7: statsFor(movements, nowMs - 14 * DAY, nowMs - 7 * DAY),
    last30: statsFor(movements, nowMs - 30 * DAY, nowMs + 1),
    prev30: statsFor(movements, nowMs - 60 * DAY, nowMs - 30 * DAY),
  };

  const hasProducts = products.length > 0;
  const hasMovements = movements.length > 0;

  const narrative: NarrativeBlock[] = [];
  /** Só anexa o tema ao parágrafo — o texto é exatamente o que já era. */
  const say = (topic: NarrativeTopic, text: string) => narrative.push({ topic, text });
  const risks: Insight[] = [];
  const opportunities: Insight[] = [];
  const highlights: Highlight[] = [];

  /* --- Estado do estoque (independe de movimentação) ---------------- */
  const outOfStock = products.filter((p) => stockStatus(p) === "out");
  const lowStock = products.filter((p) => stockStatus(p) === "low");

  if (!hasProducts) {
    return {
      hasData: false,
      stockOnly: false,
      generatedAt: now,
      headline: "Ainda não há dados para analisar",
      tone: "neutral",
      narrative: [
        {
          topic: "geral",
          text: "Cadastre seus produtos e registre as primeiras movimentações. A partir daí esta análise passa a ser gerada automaticamente todos os dias.",
        },
      ],
      highlights: [],
      risks: [],
      opportunities: [],
    };
  }

  /* --- Parágrafo 1: o dia ------------------------------------------ */
  if (w.today.sales > 0) {
    const parts: string[] = [];
    parts.push(
      `Hoje ${plural(w.today.sales, "foi registrada", "foram registradas")} ${n(w.today.sales)} ${plural(w.today.sales, "venda", "vendas")}`,
    );
    if (w.today.revenue > 0) parts.push(`somando ${formatBRL(w.today.revenue)}`);
    if (w.today.ticket != null && w.today.sales > 1) {
      parts.push(`com ticket médio de ${formatBRL(w.today.ticket)}`);
    }
    say("vendas", parts.join(", ") + ".");

    // Comparação com ontem — exige base com volume suficiente para significar algo.
    const revDelta = change(w.today.revenue, w.yesterday.revenue);
    if (revDelta != null && w.yesterday.sales >= MIN_SALES_FOR_TREND && Math.abs(revDelta) >= 5) {
      say(
        "vendas",
        revDelta > 0
          ? `Comparado a ontem, o faturamento ${describeChange(revDelta)} — um bom sinal para o ritmo da semana.`
          : `Comparado a ontem, o faturamento ${describeChange(revDelta)}, algo que vale acompanhar nas próximas horas.`,
      );
    } else if (w.yesterday.sales >= MIN_SALES_FOR_TREND && revDelta != null) {
      say("vendas", "O desempenho está praticamente no mesmo patamar de ontem.");
    }
  } else if (w.yesterday.sales > 0) {
    say(
      "vendas",
      `Ainda não há vendas registradas hoje. Ontem sua operação fechou com ${n(w.yesterday.sales)} ${plural(w.yesterday.sales, "venda", "vendas")}${w.yesterday.revenue > 0 ? ` e ${formatBRL(w.yesterday.revenue)}` : ""}.`,
    );
  } else if (w.last7.sales > 0) {
    say(
      "vendas",
      `Não houve vendas hoje nem ontem. Nos últimos 7 dias sua operação registrou ${n(w.last7.sales)} ${plural(w.last7.sales, "venda", "vendas")}.`,
    );
  }

  /* --- Parágrafo 2: a semana e o mês -------------------------------- */
  if (w.last7.sales > 0 && w.prev7.sales >= MIN_SALES_FOR_TREND) {
    const d7 = change(w.last7.revenue, w.prev7.revenue);
    if (d7 != null && Math.abs(d7) >= 8) {
      say(
        "vendas",
        `Na comparação de 7 dias, o faturamento ${describeChange(d7)} ${d7 > 0 ? "sobre" : "frente à"} a semana anterior.`,
      );
    }
  }

  if (w.last30.sales > 0) {
    const base: string[] = [
      `Nos últimos 30 dias ${plural(w.last30.sales, "foi", "foram")} ${n(w.last30.sales)} ${plural(w.last30.sales, "venda", "vendas")}`,
    ];
    if (w.last30.revenue > 0) base.push(`e ${formatBRL(w.last30.revenue)} de faturamento`);
    if (w.last30.customers.size > 0) {
      base.push(
        `, atendendo ${n(w.last30.customers.size)} ${plural(w.last30.customers.size, "cliente", "clientes")}`,
      );
    }
    say("vendas", base.join(" ").replace(" ,", ",") + ".");

    const d30 = change(w.last30.revenue, w.prev30.revenue);
    if (d30 != null && w.prev30.sales >= MIN_SALES_FOR_TREND && Math.abs(d30) >= 8) {
      if (d30 > 0) {
        opportunities.push({
          id: "growth-30d",
          kind: "positive",
          text: `Em 30 dias o faturamento ${describeChange(d30)} frente ao período anterior. O ritmo de crescimento está consistente.`,
          to: "/faturamento",
        });
      } else {
        risks.push({
          id: "decline-30d",
          kind: "risk",
          text: `Em 30 dias o faturamento ${describeChange(d30)} frente ao período anterior. Vale investigar quais produtos perderam giro.`,
          to: "/reports",
        });
      }
    }
  }

  /* --- Produtos: campeão, concentração, crescimento ------------------ */
  const byId = new Map(products.map((p) => [p.id, p]));
  const sold30 = unitsByProduct(movements, nowMs - 30 * DAY, nowMs + 1);
  const sold7 = unitsByProduct(movements, nowMs - 7 * DAY, nowMs + 1);
  const soldPrev7 = unitsByProduct(movements, nowMs - 14 * DAY, nowMs - 7 * DAY);

  const totalUnits30 = [...sold30.values()].reduce((a, b) => a + b, 0);
  const ranked30 = [...sold30.entries()]
    .map(([id, units]) => ({ product: byId.get(id), units }))
    .filter((r): r is { product: Product; units: number } => !!r.product)
    .sort((a, b) => b.units - a.units);

  const champion = ranked30[0];

  /**
   * Falar de concentração exige amostra: com poucas vendas ou um único
   * produto vendido, "100% das saídas" é aritmética trivial, não análise.
   */
  const shareIsMeaningful =
    w.last30.sales >= MIN_SALES_FOR_SHARE && ranked30.length >= MIN_ENTITIES_FOR_SHARE;

  if (champion && totalUnits30 > 0) {
    if (!shareIsMeaningful) {
      // Sem base para percentual — reporta o fato, sem interpretá-lo.
      say(
        "produtos",
        `${champion.product.name} foi o produto com mais saídas no período, com ${n(champion.units)} ${plural(champion.units, "unidade", "unidades")}.`,
      );
    } else {
      const share = (champion.units / totalUnits30) * 100;
      if (share >= 35) {
        say(
          "produtos",
          `${champion.product.name} concentra cerca de ${pct(share)} de tudo que saiu no período — é o produto que sustenta a operação hoje.`,
        );
        if (share >= 50) {
          risks.push({
            id: "concentration",
            kind: "risk",
            text: `Metade ou mais das saídas depende de um único produto (${champion.product.name}). Uma ruptura nesse item afeta a operação inteira.`,
            to: "/products",
          });
        }
      } else {
        say(
          "produtos",
          `${champion.product.name} foi o produto mais vendido, com ${n(champion.units)} ${plural(champion.units, "unidade", "unidades")} e cerca de ${pct(share)} das saídas.`,
        );
      }
    }
  }

  // Crescimento e queda por produto (7d vs 7d anteriores).
  let bestGrowth: { p: Product; delta: number } | null = null;
  let worstDrop: { p: Product; delta: number } | null = null;
  for (const [id, curr] of sold7) {
    const prev = soldPrev7.get(id) ?? 0;
    // Base mínima em unidades: variação sobre 1 ou 2 unidades é ruído.
    if (prev < 5) continue;
    const d = change(curr, prev);
    if (d == null) continue;
    const p = byId.get(id);
    if (!p) continue;
    if (d >= 25 && (!bestGrowth || d > bestGrowth.delta)) bestGrowth = { p, delta: d };
    if (d <= -25 && (!worstDrop || d < worstDrop.delta)) worstDrop = { p, delta: d };
  }

  if (bestGrowth) {
    opportunities.push({
      id: "growth-product",
      kind: "opportunity",
      text: `A saída de ${bestGrowth.p.name} ${describeChange(bestGrowth.delta)} nos últimos 7 dias. Vale garantir estoque para não perder venda.`,
      to: "/products",
    });
  }
  if (worstDrop) {
    risks.push({
      id: "drop-product",
      kind: "risk",
      text: `A saída de ${worstDrop.p.name} ${describeChange(worstDrop.delta)} nos últimos 7 dias frente à semana anterior.`,
      to: "/reports",
    });
  }

  /* --- Giro rápido com estoque curto (oportunidade concreta) -------- */
  for (const r of ranked30.slice(0, 5)) {
    const dailyRate = r.units / 30;
    if (dailyRate <= 0) continue;
    const daysOfCover = r.product.quantity / dailyRate;
    if (daysOfCover < 7 && r.product.quantity > 0) {
      opportunities.push({
        id: `cover-${r.product.id}`,
        kind: "opportunity",
        text: `${r.product.name} vende rápido e o saldo atual cobre menos de ${Math.max(1, Math.round(daysOfCover))} ${plural(Math.round(daysOfCover), "dia", "dias")} no ritmo atual.`,
        to: "/products",
      });
      break;
    }
  }

  /* --- Produtos sem giro na janela ---------------------------------- */
  const soldWindow = unitsByProduct(movements, nowMs - ANALYSIS_WINDOW_DAYS * DAY, nowMs + 1);
  const windowStart = nowMs - ANALYSIS_WINDOW_DAYS * DAY;
  const stagnant = products.filter((p) => {
    if (p.quantity <= 0) return false;
    if ((soldWindow.get(p.id) ?? 0) > 0) return false;
    // Produto cadastrado dentro da janela ainda não teve tempo de girar.
    return new Date(p.created_at).getTime() < windowStart;
  });

  const noSale30 = products.filter(
    (p) =>
      p.quantity > 0 &&
      (sold30.get(p.id) ?? 0) === 0 &&
      new Date(p.created_at).getTime() < nowMs - 30 * DAY,
  );

  if (hasMovements && noSale30.length > 0) {
    say(
      "produtos",
      `${n(noSale30.length)} ${plural(noSale30.length, "produto ficou", "produtos ficaram")} sem nenhuma saída nos últimos 30 dias.`,
    );
  }

  if (stagnant.length > 0) {
    risks.push({
      id: "stagnant",
      kind: "risk",
      text: `${n(stagnant.length)} ${plural(stagnant.length, "produto está parado", "produtos estão parados")} há mais de ${ANALYSIS_WINDOW_DAYS} dias, com estoque imobilizado e sem giro.`,
      to: "/products",
    });
  }

  /* --- Capital imobilizado em item encalhado ------------------------ */
  const stagnantCapital = stagnant.reduce(
    (sum, p) => sum + p.quantity * Number(p.cost_price ?? 0),
    0,
  );
  if (stagnantCapital > 0) {
    risks.push({
      id: "stagnant-capital",
      kind: "risk",
      text: `Há aproximadamente ${formatBRL(stagnantCapital)} em custo parado nesses itens sem giro.`,
      to: "/reports",
    });
  }

  /* --- Categorias ---------------------------------------------------- */
  const catUnits = new Map<string, number>();
  for (const [id, units] of sold30) {
    const cat = byId.get(id)?.category?.trim();
    if (!cat) continue;
    catUnits.set(cat, (catUnits.get(cat) ?? 0) + units);
  }
  const topCat = [...catUnits.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topCat && totalUnits30 > 0 && shareIsMeaningful && catUnits.size >= MIN_ENTITIES_FOR_SHARE) {
    const share = (topCat[1] / totalUnits30) * 100;
    if (share >= 30) {
      opportunities.push({
        id: "top-category",
        kind: "opportunity",
        text: `A categoria ${topCat[0]} responde por cerca de ${pct(share)} das saídas do período. É onde sua operação tem mais tração.`,
        to: "/reports",
      });
    }
  }

  const allCats = new Set(products.map((p) => p.category?.trim()).filter(Boolean) as string[]);
  const forgottenCats = [...allCats].filter((c) => !catUnits.has(c));
  if (hasMovements && forgottenCats.length > 0 && allCats.size > 1) {
    risks.push({
      id: "forgotten-categories",
      kind: "risk",
      text:
        forgottenCats.length === 1
          ? `A categoria ${forgottenCats[0]} não registrou nenhuma saída nos últimos 30 dias.`
          : `${n(forgottenCats.length)} categorias não registraram saída nos últimos 30 dias, entre elas ${forgottenCats.slice(0, 2).join(" e ")}.`,
      to: "/products",
    });
  }

  /* --- Clientes ------------------------------------------------------ */
  const revenueByCustomer = new Map<string, { name: string; revenue: number; lastAt: number }>();
  const firstSeen = new Map<string, number>();
  for (const m of movements) {
    if (m.type !== "out") continue;
    const raw = m.customer_name?.trim();
    if (!raw) continue;
    const key = raw.toLowerCase();
    const t = new Date(m.created_at).getTime();
    const entry = revenueByCustomer.get(key) ?? { name: raw, revenue: 0, lastAt: 0 };
    entry.revenue += Number(m.total_amount ?? 0);
    entry.lastAt = Math.max(entry.lastAt, t);
    revenueByCustomer.set(key, entry);
    firstSeen.set(key, Math.min(firstSeen.get(key) ?? t, t));
  }

  const topCustomer = [...revenueByCustomer.values()].sort((a, b) => b.revenue - a.revenue)[0];
  const totalCustomerRevenue = [...revenueByCustomer.values()].reduce((a, b) => a + b.revenue, 0);
  // Concentração de cliente só é análise quando há uma carteira para comparar.
  if (
    topCustomer &&
    topCustomer.revenue > 0 &&
    totalCustomerRevenue > 0 &&
    revenueByCustomer.size >= MIN_CUSTOMERS_FOR_SHARE &&
    w.last30.sales >= MIN_SALES_FOR_SHARE
  ) {
    const share = (topCustomer.revenue / totalCustomerRevenue) * 100;
    if (share >= 25) {
      const line = `${topCustomer.name} é seu maior cliente do período, com cerca de ${pct(share)} do faturamento.`;
      if (share >= 50) {
        risks.push({
          id: "customer-concentration",
          kind: "risk",
          text: `${line} Uma dependência desse tamanho de um único cliente é um risco relevante.`,
          to: "/partners",
        });
      } else {
        opportunities.push({
          id: "top-customer",
          kind: "opportunity",
          text: line,
          to: "/partners",
        });
      }
    }
  }

  // Inativos: compraram na janela anterior, sumiram nos últimos 30 dias.
  const inactive = [...revenueByCustomer.values()].filter(
    (c) => c.lastAt < nowMs - 30 * DAY && c.lastAt >= windowStart,
  );
  if (inactive.length > 0) {
    risks.push({
      id: "inactive-customers",
      kind: "risk",
      text:
        inactive.length === 1
          ? `${inactive[0].name} comprava com você e não retorna há mais de 30 dias. Um contato pode reativar.`
          : `${n(inactive.length)} clientes que compravam regularmente não retornam há mais de 30 dias.`,
      to: "/partners",
    });
  }

  // Novos: primeira compra dentro dos últimos 30 dias.
  const newCustomers = [...firstSeen.entries()].filter(([, t]) => t >= nowMs - 30 * DAY);
  if (newCustomers.length > 0 && revenueByCustomer.size > newCustomers.length) {
    opportunities.push({
      id: "new-customers",
      kind: "opportunity",
      text: `${n(newCustomers.length)} ${plural(newCustomers.length, "novo cliente comprou", "novos clientes compraram")} pela primeira vez nos últimos 30 dias.`,
      to: "/partners",
    });
  }

  /* --- Estoque: risco e saúde --------------------------------------- */
  if (outOfStock.length > 0) {
    risks.push({
      id: "out-of-stock",
      kind: "risk",
      text: `${n(outOfStock.length)} ${plural(outOfStock.length, "produto está zerado e não pode ser vendido", "produtos estão zerados e não podem ser vendidos")} até a reposição.`,
      to: "/products",
      search: { filter: "out" },
    });
  }
  if (lowStock.length > 0) {
    risks.push({
      id: "low-stock",
      kind: "risk",
      text: `${n(lowStock.length)} ${plural(lowStock.length, "produto está próximo", "produtos estão próximos")} do estoque mínimo.`,
      to: "/products",
      search: { filter: "low" },
    });
  }

  if (outOfStock.length === 0 && lowStock.length === 0) {
    say("estoque", "Seu estoque permanece saudável: nenhum item zerado ou abaixo do mínimo.");
  } else if (outOfStock.length === 0 && lowStock.length <= 2) {
    say(
      "estoque",
      `O estoque está sob controle — apenas ${n(lowStock.length)} ${plural(lowStock.length, "item está próximo", "itens estão próximos")} do mínimo.`,
    );
  }

  /* --- Produtos novos ------------------------------------------------ */
  const recentlyAdded = products.filter((p) => new Date(p.created_at).getTime() >= nowMs - 7 * DAY);
  if (recentlyAdded.length > 0) {
    opportunities.push({
      id: "recent-products",
      kind: "opportunity",
      text: `${n(recentlyAdded.length)} ${plural(recentlyAdded.length, "produto foi cadastrado", "produtos foram cadastrados")} nos últimos 7 dias.`,
      to: "/products",
    });
  }

  /* --- Destaques do dia --------------------------------------------- */
  highlights.push({
    id: "revenue",
    label: "Faturamento hoje",
    value: formatBRL(w.today.revenue),
    detail: w.yesterday.revenue > 0 ? `ontem ${formatBRL(w.yesterday.revenue)}` : undefined,
    tone: w.today.revenue > 0 ? "primary" : "neutral",
    to: "/faturamento",
  });
  highlights.push({
    id: "units",
    label: "Produtos vendidos",
    value: n(w.today.unitsOut),
    detail:
      w.today.sales > 0
        ? `em ${n(w.today.sales)} ${plural(w.today.sales, "venda", "vendas")}`
        : undefined,
    tone: "neutral",
    to: "/movements",
  });
  highlights.push({
    id: "customers",
    label: "Clientes atendidos",
    value: n(w.today.customers.size),
    detail: "hoje",
    tone: "neutral",
    to: "/partners",
  });
  if (champion) {
    highlights.push({
      id: "champion",
      label: "Produto campeão",
      value: champion.product.name,
      detail: `${n(champion.units)} un. em 30 dias`,
      tone: "primary",
      to: "/products",
    });
  }
  if (stagnant.length > 0) {
    highlights.push({
      id: "stagnant",
      label: "Produto parado",
      value: stagnant[0].name,
      detail:
        stagnant.length > 1
          ? `e mais ${n(stagnant.length - 1)}`
          : `sem saída há ${ANALYSIS_WINDOW_DAYS}+ dias`,
      tone: "warning",
      to: "/products",
    });
  }
  highlights.push({
    id: "critical",
    label: "Estoque crítico",
    value: n(outOfStock.length + lowStock.length),
    detail:
      outOfStock.length > 0
        ? `${n(outOfStock.length)} ${plural(outOfStock.length, "zerado", "zerados")}`
        : lowStock.length > 0
          ? "abaixo do mínimo"
          : "tudo certo",
    tone: outOfStock.length > 0 ? "danger" : lowStock.length > 0 ? "warning" : "neutral",
    to: "/alerts",
  });

  /* --- Alerta crítico único ----------------------------------------- */
  let criticalAlert: string | undefined;
  if (outOfStock.length >= 3) {
    criticalAlert = `Atenção: ${n(outOfStock.length)} produtos estão zerados e indisponíveis para venda.`;
  } else if (stagnant.length >= 5) {
    criticalAlert = `Atenção: ${n(stagnant.length)} produtos não registram nenhuma venda há mais de ${ANALYSIS_WINDOW_DAYS} dias.`;
  } else if (w.last30.sales > 0 && w.prev30.revenue > 0) {
    const d = change(w.last30.revenue, w.prev30.revenue);
    if (d != null && d <= -30) {
      criticalAlert = `Atenção: o faturamento caiu ${pct(Math.abs(d))} em relação aos 30 dias anteriores.`;
    }
  }

  /* --- Headline e tom ------------------------------------------------ */
  const d30Head = change(w.last30.revenue, w.prev30.revenue);
  let tone: Briefing["tone"] = "neutral";
  let headline: string;

  if (criticalAlert || risks.length >= 4) {
    tone = "attention";
    headline = "Sua operação pede atenção em alguns pontos";
  } else if (d30Head != null && d30Head >= 8) {
    tone = "positive";
    headline = "Sua operação está em crescimento";
  } else if (w.today.sales > 0 && outOfStock.length === 0) {
    tone = "positive";
    headline = "Sua operação está saudável hoje";
  } else if (!hasMovements) {
    tone = "neutral";
    headline = "Panorama do seu estoque";
  } else {
    tone = "neutral";
    headline = "Panorama da sua operação";
  }

  /* --- Sem movimentação: análise só de estoque ---------------------- */
  const stockOnly = !hasMovements;
  if (stockOnly) {
    narrative.length = 0;
    say(
      "geral",
      `Você tem ${n(products.length)} ${plural(products.length, "produto cadastrado", "produtos cadastrados")}, mas ainda não há movimentações registradas na janela de ${ANALYSIS_WINDOW_DAYS} dias.`,
    );
    say(
      "geral",
      "Assim que as primeiras entradas e saídas forem lançadas, esta análise passa a comparar períodos, identificar produtos em alta e apontar riscos automaticamente.",
    );
    if (outOfStock.length > 0 || lowStock.length > 0) {
      say(
        "estoque",
        `Por ora, ${n(outOfStock.length + lowStock.length)} ${plural(outOfStock.length + lowStock.length, "item requer", "itens requerem")} atenção no estoque.`,
      );
    } else {
      say("estoque", "Seu estoque atual não apresenta itens zerados ou abaixo do mínimo.");
    }
  }

  return {
    hasData: true,
    stockOnly,
    generatedAt: now,
    headline,
    tone,
    narrative,
    highlights,
    risks: risks.slice(0, 5),
    opportunities: opportunities.slice(0, 4),
    criticalAlert,
  };
}
