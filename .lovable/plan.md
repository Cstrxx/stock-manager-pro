# Auditoria de Funcionalidade — Plano Incremental

Seguindo sua regra ("tarefa por tarefa, aguarde confirmação"), NÃO vou reescrever tudo de uma vez. Abaixo está a auditoria real do que existe hoje e um plano priorizado. Confirme quais blocos quer que eu execute e em qual ordem.

## 1. Auditoria — o que já funciona vs. o que está "morto"

Levantamento por página (baseado no código atual do projeto):

### Landing (`/`)
- CTAs "Começar Gratuitamente" / "Assinar" / "Entrar" — **verificar**: apontam para `/auth`?
- Link "Contato" no footer — provavelmente sem destino real.
- Âncoras `#funcionalidades`, `#precos`, `#faq` — funcionais (scroll).

### Dashboard (`/_authenticated/dashboard`)
- 5 StatCards (Produtos, Itens, Receita 30d, Estoque baixo, Esgotados) — **hoje não são clicáveis**. Deveriam navegar para lista filtrada.
- "Últimas movimentações" — sem link para a página completa nem clique na linha.
- Sem gráfico ainda (o prompt pede interatividade em gráficos — só aplica se adicionarmos).

### Products
- Busca client-side, sem debounce server-side, sem paginação real (identificado na Onda 2).
- Ações: Novo/Editar/Excluir — verificar se todas abrem modal e persistem.
- Exportar CSV/PDF — **não existe**.
- Ordenação por coluna — **não existe**.

### Partners, Movements, Alerts, Reports, Faturamento, Billing
- Preciso reler cada um para listar botões/ícones sem ação. Não vou assumir.

### AppShell
- Sino de notificações — **não existe** (identificado na Onda 2 tarefa 2).
- Indicador de rota ativa — ok.

### Estados vazios / loading / erro
- Várias telas provavelmente mostram lista vazia sem CTA nem skeleton. Preciso verificar caso a caso.

## 2. Por que NÃO faço tudo agora

Fazer "tudo" nesta lista significa tocar 10+ arquivos, adicionar exportação (biblioteca nova), paginação, ordenação, gráficos interativos, sino de notificações real-time, tooltips, skeletons, modo demo, etc. Isso quebra sua regra explícita: *"Não reescreva componentes inteiros. Alterações cirúrgicas. Tarefa por tarefa."*

## 3. Plano proposto (blocos independentes, você aprova um por vez)

**🔥 Bloco A — Dashboard funcional (baixo risco, alto impacto)**
- Tornar os 5 StatCards clicáveis → navegam para lista já filtrada (`/products?filter=low`, `/products?filter=out`, `/faturamento`, etc.).
- "Últimas movimentações": linha inteira clicável → abre `/movements` com destaque no item; adicionar link "Ver todas".
- Empty states com CTA "Cadastrar primeiro produto".

**🔥 Bloco B — Sino de notificações no header** (pendente da Onda 2)
- Dropdown com contagem, marcar como lida, realtime via Supabase.

**⚡ Bloco C — Products: exportar + ordenar colunas + empty state melhorado**
- Botão "Exportar CSV" real (dados atuais filtrados).
- Header de coluna clicável para ordenar (name/quantity/price).
- Empty state ilustrado com CTA.

**⚡ Bloco D — Auditoria fina por página** (Partners, Movements, Alerts, Reports, Faturamento, Billing)
- Eu reviso cada arquivo, listo botões/ícones sem ação, e implemento em PRs pequenos separados.

**💡 Bloco E — Modo "Exemplo/Pré-visualização"** quando não há dados
- Dashboard e Relatórios mostram preview demonstrativo antes do primeiro cadastro.

**💡 Bloco F — Landing: destino do "Contato"**
- Definir: e-mail `mailto:`, WhatsApp, ou formulário real? (precisa sua decisão)

**💡 Bloco G — Acessibilidade & responsividade fina**
- Passar aria-labels em ícones, revisar overflow em mobile.

## 4. O que preciso de você antes de codar

1. Confirmar a ordem (sugiro A → B → C → D → E → F → G).
2. **Bloco C**: exportar em CSV é suficiente, ou quer PDF/Excel também? (PDF/Excel = biblioteca nova, mais peso no bundle).
3. **Bloco F**: qual canal para "Contato"? (mailto / WhatsApp / formulário no banco).
4. **Bloco E**: quer modo demo mesmo? Muitos SaaS pularam isso e usam apenas empty state com CTA — é mais leve.

Responda "vai no Bloco A" (ou a ordem que preferir) que eu executo só esse bloco e paro para sua validação.