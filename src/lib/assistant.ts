import { formatBRL, stockStatus, type Movement, type Product } from "@/lib/inventory";
import {
  ANALYSIS_WINDOW_DAYS,
  DAY,
  change,
  describeChange,
  n,
  pct,
  plural,
  startOfDay,
  statsFor,
  unitsByProduct,
} from "@/lib/insights";

/**
 * Assistente de gestão do ESTOQ.
 *
 * NÃO é um modelo de linguagem. É um roteador determinístico: cada pergunta
 * mapeia para uma análise escrita à mão sobre os dados reais já carregados
 * pelo dashboard. A consequência é que alucinação é impossível por
 * construção — nenhuma frase existe sem o dado que a sustenta.
 *
 * Consome exatamente as mesmas duas fontes do briefing (`products` e a
 * janela de movimentações) e não dispara nenhuma consulta própria.
 */

export type AnswerStat = {
  label: string;
  value: string;
  tone?: "neutral" | "primary" | "warning" | "danger";
};

export type AnswerItem = {
  id: string;
  name: string;
  value: string;
  detail?: string;
  tone?: "neutral" | "primary" | "warning" | "danger";
};

export type Answer = {
  topicId: string;
  question: string;
  headline: string;
  paragraphs: string[];
  stats?: AnswerStat[];
  items?: AnswerItem[];
  link?: { to: string; label: string; search?: Record<string, string> };
  /** Limite honesto do dado — sempre exibido quando presente. */
  caveat?: string;
};

export type Topic = {
  id: string;
  /** Rótulo curto do chip. */
  chip: string;
  /** Pergunta completa, preenchida ao clicar no chip. */
  question: string;
  keywords: string[];
};

/** Chips de pergunta rápida, na ordem de utilidade para quem gerencia. */
export const TOPICS: Topic[] = [
  { id: "overview", chip: "Como está minha empresa", question: "Como está minha empresa hoje?", keywords: ["empresa", "como esta", "resumo", "geral", "panorama", "situacao"] },
  { id: "today", chip: "Vendas de hoje", question: "Quanto vendi hoje?", keywords: ["hoje", "vendi hoje", "vendas hoje", "dia"] },
  { id: "revenue", chip: "Faturamento", question: "Qual meu faturamento?", keywords: ["faturamento", "receita", "fatura", "quanto faturei"] },
  { id: "low-stock", chip: "Estoque baixo", question: "O que está acabando?", keywords: ["acabando", "estoque baixo", "baixo", "falta", "faltando", "minimo", "zerado", "acabar"] },
  { id: "restock", chip: "Reposição", question: "O que devo repor?", keywords: ["repor", "reposicao", "comprar", "pedido", "compra"] },
  { id: "best-sellers", chip: "Mais vendidos", question: "Qual produto vende mais?", keywords: ["mais vendido", "vende mais", "campeao", "top", "melhor produto"] },
  { id: "stagnant", chip: "Produtos parados", question: "Quais produtos estão parados?", keywords: ["parado", "parados", "encalhado", "sem giro", "nao gira", "nunca vendeu", "sem venda"] },
  { id: "worst-sellers", chip: "Menos vendidos", question: "Qual produto vende menos?", keywords: ["menos vendido", "vende menos", "pior produto", "fraco"] },
  { id: "stock-value", chip: "Valor em estoque", question: "Quanto tenho em estoque?", keywords: ["quanto tenho", "valor em estoque", "estoque total", "capital", "imobilizado", "patrimonio"] },
  // Sem a keyword solta "clientes": ela é ambígua entre esta análise e a de
  // inativos, e a genérica vencia a específica em "clientes inativos".
  { id: "top-customers", chip: "Melhores clientes", question: "Quem mais compra?", keywords: ["quem mais compra", "melhor cliente", "melhores clientes", "maior cliente", "meus clientes", "comprador"] },
  { id: "inactive-customers", chip: "Clientes inativos", question: "Quais clientes estão inativos?", keywords: ["inativo", "sumiu", "nao compra", "perdido", "afastado"] },
  { id: "categories", chip: "Categorias", question: "Quais categorias crescem?", keywords: ["categoria", "categorias", "crescem", "cresce", "segmento"] },
  // Sem "semana" solta: significa a semana toda, não o fim de semana, e
  // capturava perguntas como "o que devo repor essa semana".
  { id: "weekend", chip: "Fim de semana", question: "O que vende mais no fim de semana?", keywords: ["fim de semana", "final de semana", "fds", "sabado", "domingo"] },
  { id: "margin", chip: "Margem", question: "Qual minha margem?", keywords: ["margem", "lucro", "lucratividade", "ganho"] },
];

/* ------------------------------------------------------------------ */
/* Reconhecimento de intenção                                          */
/* ------------------------------------------------------------------ */

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    // Remove acentos para que "não" e "nao" casem. Escapes explícitos em vez
    // dos caracteres combinantes literais: literais viram uma regex inválida
    // se o arquivo for reencodado por qualquer ferramenta.
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Casa texto livre com um tópico. Sem correspondência devolve null — o
 * assistente então diz honestamente que não sabe responder, em vez de
 * arriscar uma resposta aproximada.
 */
export function matchTopic(text: string): Topic | null {
  const q = normalize(text);
  if (!q) return null;

  let best: { topic: Topic; score: number } | null = null;
  for (const topic of TOPICS) {
    let score = 0;
    for (const kw of topic.keywords) {
      // Peso pelo comprimento: expressões específicas ("quem mais compra")
      // devem vencer palavras genéricas que aparecem em vários tópicos.
      if (q.includes(normalize(kw))) score += normalize(kw).length;
    }
    if (normalize(topic.question) === q) score += 100;
    if (score > 0 && (!best || score > best.score)) best = { topic, score };
  }
  return best?.topic ?? null;
}

/* ------------------------------------------------------------------ */
/* Respostas                                                           */
/* ------------------------------------------------------------------ */

const WINDOW_NOTE = `Análise limitada aos últimos ${ANALYSIS_WINDOW_DAYS} dias de movimentação.`;

function noData(topic: Topic, what: string): Answer {
  return {
    topicId: topic.id,
    question: topic.question,
    headline: "Ainda não tenho dados para responder isso",
    paragraphs: [
      `Para analisar ${what} eu preciso de movimentações registradas. Assim que as primeiras entradas e saídas forem lançadas, esta resposta passa a ser gerada automaticamente.`,
    ],
  };
}

export function answerTopic(
  topicId: string,
  products: Product[],
  movements: Movement[],
  now: Date = new Date(),
): Answer {
  const topic = TOPICS.find((t) => t.id === topicId) ?? TOPICS[0];
  const nowMs = now.getTime();
  const windowStart = nowMs - ANALYSIS_WINDOW_DAYS * DAY;
  const byId = new Map(products.map((p) => [p.id, p]));

  const today = statsFor(movements, startOfDay(nowMs), nowMs + 1);
  const yesterday = statsFor(movements, startOfDay(nowMs) - DAY, startOfDay(nowMs));
  const last30 = statsFor(movements, nowMs - 30 * DAY, nowMs + 1);
  const prev30 = statsFor(movements, nowMs - 60 * DAY, nowMs - 30 * DAY);
  const last7 = statsFor(movements, nowMs - 7 * DAY, nowMs + 1);

  const sold30 = unitsByProduct(movements, nowMs - 30 * DAY, nowMs + 1);
  const soldWindow = unitsByProduct(movements, windowStart, nowMs + 1);
  const hasSales = movements.some((m) => m.type === "out");

  const outOfStock = products.filter((p) => stockStatus(p) === "out");
  const lowStock = products.filter((p) => stockStatus(p) === "low");

  switch (topic.id) {
    /* --- Vendas de hoje ------------------------------------------- */
    case "today": {
      if (today.sales === 0) {
        const p: string[] = ["Nenhuma venda foi registrada hoje até agora."];
        if (yesterday.sales > 0) {
          p.push(
            `Ontem sua operação fechou com ${n(yesterday.sales)} ${plural(yesterday.sales, "venda", "vendas")} e ${formatBRL(yesterday.revenue)}.`,
          );
        }
        return {
          topicId: topic.id, question: topic.question,
          headline: "Ainda não houve vendas hoje",
          paragraphs: p,
          link: { to: "/movements", label: "Registrar movimentação" },
        };
      }
      const p = [
        `Hoje ${plural(today.sales, "foi registrada", "foram registradas")} ${n(today.sales)} ${plural(today.sales, "venda", "vendas")}, somando ${formatBRL(today.revenue)}.`,
      ];
      if (today.ticket != null && today.sales > 1) {
        p.push(`O ticket médio ficou em ${formatBRL(today.ticket)}, com ${n(today.unitsOut)} ${plural(today.unitsOut, "item", "itens")} saindo do estoque.`);
      }
      const d = change(today.revenue, yesterday.revenue);
      if (d != null && yesterday.sales >= 3 && Math.abs(d) >= 5) {
        p.push(`Comparado a ontem, o faturamento ${describeChange(d)}.`);
      }
      if (today.customers.size > 0) {
        p.push(`Você atendeu ${n(today.customers.size)} ${plural(today.customers.size, "cliente", "clientes")} hoje.`);
      }
      return {
        topicId: topic.id, question: topic.question,
        headline: `${formatBRL(today.revenue)} em ${n(today.sales)} ${plural(today.sales, "venda", "vendas")} hoje`,
        paragraphs: p,
        stats: [
          { label: "Faturamento", value: formatBRL(today.revenue), tone: "primary" },
          { label: "Vendas", value: n(today.sales) },
          { label: "Itens", value: n(today.unitsOut) },
          { label: "Clientes", value: n(today.customers.size) },
        ],
        link: { to: "/movements", label: "Ver movimentações" },
      };
    }

    /* --- Faturamento ---------------------------------------------- */
    case "revenue": {
      if (!hasSales) return noData(topic, "seu faturamento");
      const p = [
        `Nos últimos 30 dias seu faturamento foi de ${formatBRL(last30.revenue)}, distribuído em ${n(last30.sales)} ${plural(last30.sales, "venda", "vendas")}.`,
      ];
      if (last30.ticket != null) p.push(`Isso dá um ticket médio de ${formatBRL(last30.ticket)}.`);
      const d = change(last30.revenue, prev30.revenue);
      if (d != null && prev30.sales >= 3) {
        p.push(
          d >= 0
            ? `Frente aos 30 dias anteriores, o faturamento ${describeChange(d)} — o ritmo está favorável.`
            : `Frente aos 30 dias anteriores, o faturamento ${describeChange(d)}. Vale olhar quais produtos perderam giro.`,
        );
      }
      p.push(`Na última semana entraram ${formatBRL(last7.revenue)}.`);
      return {
        topicId: topic.id, question: topic.question,
        headline: `${formatBRL(last30.revenue)} nos últimos 30 dias`,
        paragraphs: p,
        stats: [
          { label: "30 dias", value: formatBRL(last30.revenue), tone: "primary" },
          { label: "7 dias", value: formatBRL(last7.revenue) },
          { label: "Hoje", value: formatBRL(today.revenue) },
          { label: "Ticket médio", value: last30.ticket != null ? formatBRL(last30.ticket) : "—" },
        ],
        link: { to: "/faturamento", label: "Abrir faturamento" },
      };
    }

    /* --- Estoque baixo -------------------------------------------- */
    case "low-stock": {
      const critical = [...outOfStock, ...lowStock];
      if (critical.length === 0) {
        return {
          topicId: topic.id, question: topic.question,
          headline: "Nada está acabando no momento",
          paragraphs: ["Nenhum produto está zerado ou abaixo do estoque mínimo. Seu estoque está coberto."],
        };
      }
      const p = [
        outOfStock.length > 0
          ? `${n(outOfStock.length)} ${plural(outOfStock.length, "produto já zerou", "produtos já zeraram")} e não ${plural(outOfStock.length, "pode", "podem")} ser ${plural(outOfStock.length, "vendido", "vendidos")} até a reposição.`
          : `Nenhum produto zerou, mas ${n(lowStock.length)} ${plural(lowStock.length, "está próximo", "estão próximos")} do mínimo.`,
      ];
      if (outOfStock.length > 0 && lowStock.length > 0) {
        p.push(`Outros ${n(lowStock.length)} ${plural(lowStock.length, "item está", "itens estão")} próximos do estoque mínimo e devem entrar no próximo pedido.`);
      }
      return {
        topicId: topic.id, question: topic.question,
        headline: `${n(critical.length)} ${plural(critical.length, "item precisa", "itens precisam")} de atenção`,
        paragraphs: p,
        items: critical.slice(0, 8).map((prod) => ({
          id: prod.id,
          name: prod.name,
          value: `${n(prod.quantity)} un.`,
          detail: `mínimo ${n(prod.min_stock)}`,
          tone: prod.quantity <= 0 ? "danger" : "warning",
        })),
        link: { to: "/alerts", label: "Ver todos os alertas" },
      };
    }

    /* --- Reposição -------------------------------------------------- */
    case "restock": {
      if (!hasSales) return noData(topic, "o que repor");
      /**
       * Sugestão = consumo de 30 dias projetado para os próximos 30, menos
       * o saldo atual. A conta é exibida ao usuário para que ele julgue.
       */
      const suggestions = products
        .map((prod) => {
          const sold = sold30.get(prod.id) ?? 0;
          const target = Math.max(sold, prod.min_stock);
          const buy = Math.ceil(target - prod.quantity);
          return { product: prod, sold, buy };
        })
        .filter((r) => r.buy > 0 && r.sold > 0)
        .sort((a, b) => b.sold - a.sold)
        .slice(0, 8);

      if (suggestions.length === 0) {
        return {
          topicId: topic.id, question: topic.question,
          headline: "Nada urgente para repor",
          paragraphs: ["Considerando o consumo dos últimos 30 dias, seu saldo atual cobre a demanda dos produtos que estão girando."],
        };
      }
      return {
        topicId: topic.id, question: topic.question,
        headline: `${n(suggestions.length)} ${plural(suggestions.length, "produto merece", "produtos merecem")} entrar no próximo pedido`,
        paragraphs: [
          "A sugestão abaixo compara o que saiu nos últimos 30 dias com o saldo que você tem agora. A conta é simples: repor o suficiente para cobrir o mesmo consumo no próximo mês.",
          "Trate como ponto de partida — sazonalidade e negociação com fornecedor continuam sendo sua decisão.",
        ],
        items: suggestions.map((s) => ({
          id: s.product.id,
          name: s.product.name,
          value: `comprar ${n(s.buy)}`,
          detail: `saíram ${n(s.sold)} em 30d · tem ${n(s.product.quantity)}`,
          tone: s.product.quantity <= 0 ? "danger" : "warning",
        })),
        link: { to: "/products", label: "Abrir produtos" },
        caveat: WINDOW_NOTE,
      };
    }

    /* --- Mais vendidos --------------------------------------------- */
    case "best-sellers": {
      if (!hasSales) return noData(topic, "seus produtos mais vendidos");
      const ranked = [...sold30.entries()]
        .map(([id, units]) => ({ product: byId.get(id), units }))
        .filter((r): r is { product: Product; units: number } => !!r.product)
        .sort((a, b) => b.units - a.units);
      const total = ranked.reduce((s, r) => s + r.units, 0);
      const top = ranked[0];
      const p: string[] = [];
      if (top) {
        const share = total > 0 ? (top.units / total) * 100 : 0;
        p.push(
          last30.sales >= 5 && ranked.length >= 2
            ? `${top.product.name} lidera com ${n(top.units)} ${plural(top.units, "unidade", "unidades")} nos últimos 30 dias, cerca de ${pct(share)} de tudo que saiu.`
            : `${top.product.name} teve mais saídas no período, com ${n(top.units)} ${plural(top.units, "unidade", "unidades")}.`,
        );
        const dailyRate = top.units / 30;
        if (dailyRate > 0) {
          const cover = top.product.quantity / dailyRate;
          p.push(
            cover < 10
              ? `No ritmo atual, o saldo dele cobre cerca de ${Math.max(1, Math.round(cover))} ${plural(Math.round(cover), "dia", "dias")}. Vale reforçar o estoque.`
              : `No ritmo atual, o saldo dele cobre cerca de ${Math.round(cover)} dias.`,
          );
        }
      }
      return {
        topicId: topic.id, question: topic.question,
        headline: top ? `${top.product.name} é seu carro-chefe` : "Sem vendas no período",
        paragraphs: p,
        items: ranked.slice(0, 6).map((r) => ({
          id: r.product.id,
          name: r.product.name,
          value: `${n(r.units)} un.`,
          detail: total > 0 ? `${pct((r.units / total) * 100)} das saídas` : undefined,
          tone: "primary",
        })),
        link: { to: "/reports", label: "Ver relatórios" },
      };
    }

    /* --- Menos vendidos -------------------------------------------- */
    case "worst-sellers": {
      if (!hasSales) return noData(topic, "seus produtos com menor giro");
      const withSales = products
        .map((prod) => ({ product: prod, units: sold30.get(prod.id) ?? 0 }))
        .filter((r) => r.units > 0)
        .sort((a, b) => a.units - b.units)
        .slice(0, 6);
      if (withSales.length === 0) return noData(topic, "seus produtos com menor giro");
      return {
        topicId: topic.id, question: topic.question,
        headline: "Produtos com menor giro entre os que venderam",
        paragraphs: [
          `Estes são os itens que tiveram saída nos últimos 30 dias, porém no menor volume. ${withSales[0].product.name} foi o de menor giro, com ${n(withSales[0].units)} ${plural(withSales[0].units, "unidade", "unidades")}.`,
          "Produtos sem nenhuma saída aparecem na análise de parados, que é uma situação diferente e mais crítica.",
        ],
        items: withSales.map((r) => ({
          id: r.product.id,
          name: r.product.name,
          value: `${n(r.units)} un.`,
          detail: `saldo ${n(r.product.quantity)}`,
        })),
        link: { to: "/reports", label: "Ver relatórios" },
      };
    }

    /* --- Parados ---------------------------------------------------- */
    case "stagnant": {
      const stagnant = products.filter(
        (prod) =>
          prod.quantity > 0 &&
          (soldWindow.get(prod.id) ?? 0) === 0 &&
          new Date(prod.created_at).getTime() < windowStart,
      );
      if (stagnant.length === 0) {
        return {
          topicId: topic.id, question: topic.question,
          headline: "Nenhum produto parado",
          paragraphs: [`Todos os itens com saldo tiveram alguma saída nos últimos ${ANALYSIS_WINDOW_DAYS} dias.`],
          caveat: WINDOW_NOTE,
        };
      }
      const capital = stagnant.reduce((s, prod) => s + prod.quantity * Number(prod.cost_price ?? 0), 0);
      const p = [
        `${n(stagnant.length)} ${plural(stagnant.length, "produto não teve", "produtos não tiveram")} nenhuma saída nos últimos ${ANALYSIS_WINDOW_DAYS} dias, mesmo tendo saldo disponível.`,
      ];
      if (capital > 0) {
        p.push(`Isso representa aproximadamente ${formatBRL(capital)} em custo imobilizado — dinheiro parado na prateleira que poderia estar girando.`);
      }
      p.push("Vale avaliar promoção, reposicionamento ou simplesmente parar de repor esses itens.");
      return {
        topicId: topic.id, question: topic.question,
        headline: `${n(stagnant.length)} ${plural(stagnant.length, "produto está parado", "produtos estão parados")}`,
        paragraphs: p,
        items: stagnant
          .sort((a, b) => b.quantity * Number(b.cost_price ?? 0) - a.quantity * Number(a.cost_price ?? 0))
          .slice(0, 8)
          .map((prod) => ({
            id: prod.id,
            name: prod.name,
            value: `${n(prod.quantity)} un.`,
            detail: prod.cost_price ? `${formatBRL(prod.quantity * Number(prod.cost_price))} parados` : undefined,
            tone: "warning",
          })),
        link: { to: "/products", label: "Abrir produtos" },
        caveat: WINDOW_NOTE,
      };
    }

    /* --- Valor em estoque ------------------------------------------ */
    case "stock-value": {
      let cost = 0, sale = 0, units = 0, unpriced = 0;
      for (const prod of products) {
        units += prod.quantity;
        cost += prod.quantity * Number(prod.cost_price ?? 0);
        sale += prod.quantity * Number(prod.sale_price ?? 0);
        if (prod.cost_price == null) unpriced++;
      }
      const p = [
        `Você tem ${n(units)} ${plural(units, "item", "itens")} em estoque, distribuídos em ${n(products.length)} ${plural(products.length, "produto", "produtos")}.`,
        `A preço de custo isso representa ${formatBRL(cost)}. Se tudo fosse vendido pelo preço atual de venda, entrariam ${formatBRL(sale)}.`,
      ];
      if (unpriced > 0) {
        p.push(`${n(unpriced)} ${plural(unpriced, "produto está", "produtos estão")} sem preço de custo cadastrado, então o valor real é maior que o calculado aqui.`);
      }
      return {
        topicId: topic.id, question: topic.question,
        headline: `${formatBRL(cost)} imobilizados em estoque`,
        paragraphs: p,
        stats: [
          { label: "A custo", value: formatBRL(cost), tone: "primary" },
          { label: "A venda", value: formatBRL(sale) },
          { label: "Itens", value: n(units) },
          { label: "Produtos", value: n(products.length) },
        ],
        link: { to: "/reports", label: "Ver relatórios" },
      };
    }

    /* --- Melhores clientes ------------------------------------------ */
    case "top-customers": {
      if (!hasSales) return noData(topic, "seus melhores clientes");
      const map = new Map<string, { name: string; revenue: number; orders: number }>();
      for (const m of movements) {
        if (m.type !== "out") continue;
        const raw = m.customer_name?.trim();
        if (!raw) continue;
        const key = raw.toLowerCase();
        const e = map.get(key) ?? { name: raw, revenue: 0, orders: 0 };
        e.revenue += Number(m.total_amount ?? 0);
        e.orders++;
        map.set(key, e);
      }
      const ranked = [...map.values()].sort((a, b) => b.revenue - a.revenue);
      if (ranked.length === 0) {
        return {
          topicId: topic.id, question: topic.question,
          headline: "Suas vendas não têm cliente identificado",
          paragraphs: ["As movimentações de saída registradas não trazem o nome do cliente. Preenchendo esse campo nas próximas vendas, esta análise passa a funcionar."],
          link: { to: "/movements", label: "Ver movimentações" },
        };
      }
      const total = ranked.reduce((s, c) => s + c.revenue, 0);
      const top = ranked[0];
      const p = [
        `${top.name} é seu maior cliente do período, com ${formatBRL(top.revenue)} em ${n(top.orders)} ${plural(top.orders, "compra", "compras")}.`,
      ];
      if (ranked.length >= 3 && total > 0) {
        const share = (top.revenue / total) * 100;
        p.push(
          share >= 50
            ? `Ele responde por cerca de ${pct(share)} de tudo que você faturou — uma concentração alta, que vale diluir com novos clientes.`
            : `Ele representa cerca de ${pct(share)} do seu faturamento, numa carteira de ${n(ranked.length)} clientes.`,
        );
      }
      return {
        topicId: topic.id, question: topic.question,
        headline: `${top.name} lidera sua carteira`,
        paragraphs: p,
        items: ranked.slice(0, 6).map((c, i) => ({
          id: `c${i}`,
          name: c.name,
          value: formatBRL(c.revenue),
          detail: `${n(c.orders)} ${plural(c.orders, "compra", "compras")}`,
          tone: i === 0 ? "primary" : "neutral",
        })),
        link: { to: "/partners", label: "Abrir clientes" },
        caveat: WINDOW_NOTE,
      };
    }

    /* --- Clientes inativos ------------------------------------------ */
    case "inactive-customers": {
      if (!hasSales) return noData(topic, "seus clientes inativos");
      const last = new Map<string, { name: string; at: number; revenue: number }>();
      for (const m of movements) {
        if (m.type !== "out") continue;
        const raw = m.customer_name?.trim();
        if (!raw) continue;
        const key = raw.toLowerCase();
        const t = new Date(m.created_at).getTime();
        const e = last.get(key) ?? { name: raw, at: 0, revenue: 0 };
        e.at = Math.max(e.at, t);
        e.revenue += Number(m.total_amount ?? 0);
        last.set(key, e);
      }
      const inactive = [...last.values()]
        .filter((c) => c.at < nowMs - 30 * DAY)
        .sort((a, b) => b.revenue - a.revenue);
      if (inactive.length === 0) {
        return {
          topicId: topic.id, question: topic.question,
          headline: "Nenhum cliente afastado",
          paragraphs: ["Todos os clientes que compraram no período voltaram nos últimos 30 dias."],
          caveat: WINDOW_NOTE,
        };
      }
      return {
        topicId: topic.id, question: topic.question,
        headline: `${n(inactive.length)} ${plural(inactive.length, "cliente não retornou", "clientes não retornaram")}`,
        paragraphs: [
          `${n(inactive.length)} ${plural(inactive.length, "cliente comprou com você e não voltou", "clientes compraram com você e não voltaram")} nos últimos 30 dias.`,
          "Clientes que já compraram costumam ser mais fáceis de reativar do que conquistar novos. Um contato direto costuma resolver.",
        ],
        items: inactive.slice(0, 8).map((c, i) => ({
          id: `i${i}`,
          name: c.name,
          value: formatBRL(c.revenue),
          detail: `última compra em ${new Date(c.at).toLocaleDateString("pt-BR")}`,
          tone: "warning",
        })),
        link: { to: "/partners", label: "Abrir clientes" },
        caveat: WINDOW_NOTE,
      };
    }

    /* --- Categorias -------------------------------------------------- */
    case "categories": {
      if (!hasSales) return noData(topic, "o desempenho das categorias");
      const curr = new Map<string, number>();
      const prev = new Map<string, number>();
      const soldPrev30 = unitsByProduct(movements, nowMs - 60 * DAY, nowMs - 30 * DAY);
      for (const [id, units] of sold30) {
        const c = byId.get(id)?.category?.trim();
        if (c) curr.set(c, (curr.get(c) ?? 0) + units);
      }
      for (const [id, units] of soldPrev30) {
        const c = byId.get(id)?.category?.trim();
        if (c) prev.set(c, (prev.get(c) ?? 0) + units);
      }
      if (curr.size === 0) {
        return {
          topicId: topic.id, question: topic.question,
          headline: "Seus produtos não têm categoria",
          paragraphs: ["Nenhum produto vendido no período tem categoria preenchida. Classificando os produtos, esta análise passa a mostrar quais segmentos crescem."],
          link: { to: "/products", label: "Abrir produtos" },
        };
      }
      const total = [...curr.values()].reduce((a, b) => a + b, 0);
      const ranked = [...curr.entries()].sort((a, b) => b[1] - a[1]);
      const p = [
        `${ranked[0][0]} é sua categoria mais forte, com ${n(ranked[0][1])} ${plural(ranked[0][1], "unidade", "unidades")} e cerca de ${pct((ranked[0][1] / total) * 100)} das saídas.`,
      ];
      const growing = ranked
        .map(([c, units]) => ({ c, units, d: change(units, prev.get(c) ?? 0) }))
        .filter((r) => r.d != null && (prev.get(r.c) ?? 0) >= 5);
      const up = growing.filter((r) => (r.d ?? 0) >= 15).sort((a, b) => (b.d ?? 0) - (a.d ?? 0))[0];
      const down = growing.filter((r) => (r.d ?? 0) <= -15).sort((a, b) => (a.d ?? 0) - (b.d ?? 0))[0];
      if (up) p.push(`${up.c} ${describeChange(up.d!)} frente aos 30 dias anteriores — é onde a demanda está crescendo.`);
      if (down) p.push(`Na direção oposta, ${down.c} ${describeChange(down.d!)} no mesmo período.`);
      const forgotten = [...new Set(products.map((x) => x.category?.trim()).filter(Boolean) as string[])].filter((c) => !curr.has(c));
      if (forgotten.length > 0) {
        p.push(`${n(forgotten.length)} ${plural(forgotten.length, "categoria não registrou", "categorias não registraram")} nenhuma saída no período: ${forgotten.slice(0, 3).join(", ")}.`);
      }
      return {
        topicId: topic.id, question: topic.question,
        headline: `${ranked[0][0]} puxa suas vendas`,
        paragraphs: p,
        items: ranked.slice(0, 6).map(([c, units]) => ({
          id: c, name: c, value: `${n(units)} un.`,
          detail: `${pct((units / total) * 100)} das saídas`,
        })),
        link: { to: "/reports", label: "Ver relatórios" },
      };
    }

    /* --- Fim de semana ---------------------------------------------- */
    case "weekend": {
      if (!hasSales) return noData(topic, "as vendas por dia da semana");
      let weekendRev = 0, weekRev = 0, weekendSales = 0, weekSales = 0;
      const weekendUnits = new Map<string, number>();
      for (const m of movements) {
        if (m.type !== "out") continue;
        const d = new Date(m.created_at).getDay();
        const isWeekend = d === 0 || d === 6;
        const amount = Number(m.total_amount ?? 0);
        if (isWeekend) {
          weekendRev += amount; weekendSales++;
          if (m.product_id) weekendUnits.set(m.product_id, (weekendUnits.get(m.product_id) ?? 0) + m.quantity);
        } else {
          weekRev += amount; weekSales++;
        }
      }
      if (weekendSales === 0) {
        return {
          topicId: topic.id, question: topic.question,
          headline: "Você não vende aos fins de semana",
          paragraphs: [`Nenhuma saída foi registrada em sábado ou domingo nos últimos ${ANALYSIS_WINDOW_DAYS} dias. Todo o seu movimento está concentrado em dias úteis.`],
          caveat: WINDOW_NOTE,
        };
      }
      // 2 dias de fim de semana contra 5 úteis — comparar média diária.
      const weekendDaily = weekendRev / 2;
      const weekDaily = weekRev / 5;
      const ranked = [...weekendUnits.entries()]
        .map(([id, units]) => ({ product: byId.get(id), units }))
        .filter((r): r is { product: Product; units: number } => !!r.product)
        .sort((a, b) => b.units - a.units);
      const p = [
        `Sábados e domingos somaram ${formatBRL(weekendRev)} em ${n(weekendSales)} ${plural(weekendSales, "saída", "saídas")}, contra ${formatBRL(weekRev)} nos dias úteis.`,
        weekendDaily > weekDaily
          ? "Proporcionalmente, seu fim de semana rende mais por dia do que a média dos dias úteis — vale garantir estoque na sexta-feira."
          : "Por dia, o movimento dos dias úteis ainda é maior que o do fim de semana.",
      ];
      if (ranked[0]) {
        p.push(`${ranked[0].product.name} é o produto que mais sai nesses dias, com ${n(ranked[0].units)} ${plural(ranked[0].units, "unidade", "unidades")}.`);
      }
      return {
        topicId: topic.id, question: topic.question,
        headline: weekendDaily > weekDaily ? "Seu fim de semana rende mais por dia" : "Seu movimento é maior nos dias úteis",
        paragraphs: p,
        items: ranked.slice(0, 5).map((r) => ({
          id: r.product.id, name: r.product.name, value: `${n(r.units)} un.`, detail: "sáb/dom",
        })),
        caveat: WINDOW_NOTE,
      };
    }

    /* --- Margem ------------------------------------------------------ */
    case "margin": {
      let cost = 0, sale = 0, priced = 0;
      for (const prod of products) {
        if (prod.cost_price == null || prod.sale_price == null) continue;
        priced++;
        cost += prod.quantity * Number(prod.cost_price);
        sale += prod.quantity * Number(prod.sale_price);
      }
      if (priced === 0) {
        return {
          topicId: topic.id, question: topic.question,
          headline: "Faltam preços para calcular margem",
          paragraphs: ["Nenhum produto tem preço de custo e de venda preenchidos ao mesmo tempo. Sem os dois, não é possível calcular margem sem chutar."],
          link: { to: "/products", label: "Abrir produtos" },
        };
      }
      const marginValue = sale - cost;
      const marginPct = sale > 0 ? (marginValue / sale) * 100 : 0;
      return {
        topicId: topic.id, question: topic.question,
        headline: `Margem potencial de ${pct(marginPct)}`,
        paragraphs: [
          `Considerando o estoque atual, o custo é de ${formatBRL(cost)} e o valor de venda é ${formatBRL(sale)}. A diferença — ${formatBRL(marginValue)} — é a margem que você realiza se vender tudo pelos preços cadastrados hoje.`,
          `O cálculo usa ${n(priced)} ${plural(priced, "produto que tem", "produtos que têm")} custo e venda preenchidos.`,
        ],
        stats: [
          { label: "Margem", value: formatBRL(marginValue), tone: "primary" },
          { label: "Percentual", value: pct(marginPct) },
          { label: "Custo", value: formatBRL(cost) },
          { label: "Venda", value: formatBRL(sale) },
        ],
        caveat:
          "Esta é a margem potencial do estoque parado, não o lucro realizado. O lucro real exigiria o custo de cada item no momento de cada venda, que o sistema não registra hoje.",
        link: { to: "/reports", label: "Ver relatórios" },
      };
    }

    /* --- Panorama geral (padrão) ------------------------------------ */
    default:
      return {
        topicId: "overview",
        question: TOPICS[0].question,
        headline: "",
        paragraphs: [],
      };
  }
}

/** Resposta honesta quando a pergunta não corresponde a nenhuma análise. */
export function unknownAnswer(question: string): Answer {
  return {
    topicId: "unknown",
    question,
    headline: "Ainda não sei responder isso",
    paragraphs: [
      "Essa pergunta está fora do que consigo analisar com os dados que o sistema registra hoje. Prefiro dizer que não sei a arriscar uma resposta imprecisa.",
      "Use um dos atalhos acima — eles cobrem estoque, vendas, faturamento, clientes, categorias e reposição.",
    ],
  };
}
