# Stock Manager Pro

Crie um sistema web profissional focado EXCLUSIVAMENTE em gestão interna de distribuidoras e pequenas empresas, com foco em controle de estoque, registro de entradas e saídas e relatórios de movimentação.

IMPORTANTE:

Este sistema NÃO é um marketplace, NÃO é um aplicativo de delivery e NÃO deve ter foco em clientes finais navegando produtos.

O sistema é interno, voltado apenas para a empresa (B2B), como uma ferramenta de gestão.

⸻

OBJETIVO DO SISTEMA:

Criar uma plataforma onde empresas possam:

* Controlar seu estoque com precisão

* Registrar entrada de mercadorias (compras)

* Registrar saída de mercadorias (vendas)

* Acompanhar relatórios claros de movimentação

* Receber alertas sobre produtos em falta ou acabando

⸻

1. ACESSO E USUÁRIO

* Sistema com login obrigatório

* Acesso apenas para a empresa

* Após login, ir direto para o dashboard

* Interface profissional e limpa

⸻

2. DASHBOARD (VISÃO GERAL)

Criar um painel inicial com:

* Total de produtos em estoque

* Produtos com estoque baixo

* Produtos esgotados

* Quantidade total de itens movimentados

* Últimas movimentações (entradas e saídas)

Adicionar:

* Indicador: “Última atualização do sistema”

* Layout visual com cards organizados

⸻

3. CADASTRO DE PRODUTOS

Permitir cadastro completo:

* Nome do produto

* Categoria

* Quantidade atual

* Estoque mínimo (configurável)

* Preço de custo (opcional)

* Preço de venda (opcional)

Sistema deve:

* Atualizar status automaticamente:

    * Em estoque

    * Baixo estoque

    * Esgotado

⸻

4. CONTROLE DE ESTOQUE (FUNÇÃO PRINCIPAL)

ENTRADA DE PRODUTOS:

* Registro de entrada manual:

    * Produto

    * Quantidade

    * Data

    * Observação

* Somar automaticamente ao estoque

* Estruturar para futura importação de nota fiscal (XML), mas não implementar agora

⸻

SAÍDA DE PRODUTOS:

* Registro de venda simples:

    * Produto

    * Quantidade vendida

    * Data

* Baixar automaticamente do estoque

REGRAS:

* Não permitir estoque negativo

* Atualização em tempo real

* Registrar histórico completo de movimentações

⸻

5. ALERTAS AUTOMÁTICOS

Criar sistema de alertas:

* Produto com estoque baixo

* Produto esgotado

Exibir:

* Lista clara de itens que precisam reposição

* Destaque visual (sem poluição)

⸻

6. RELATÓRIOS

Criar relatórios simples e úteis:

* Histórico de entradas (compras)

* Histórico de saídas (vendas)

* Produtos mais movimentados

* Produtos parados (sem saída)

Resumo:

* Total de produtos movimentados

* Quantidade vendida por período

(Preparar estrutura para futuro relatório financeiro)

⸻

7. EXPERIÊNCIA DO USUÁRIO

* Interface simples e profissional

* Fácil de usar (até para iniciantes)

* Foco em produtividade

* Poucos cliques para executar ações

* Botões claros (Entrada / Saída)

⸻

8. PERFORMANCE

* Sistema rápido

* Sem travamentos

* Carregamento leve

* Atualizações fluidas

⸻

9. VISÃO DE PRODUTO

O sistema deve parecer:

* Um software empresarial

* Uma ferramenta confiável

* Algo que empresas pagariam mensalmente

⸻

10. MODELO DE NEGÓCIO (IMPORTANTE)

Preparar o sistema para funcionar como SaaS:

* Empresas pagam mensalidade para usar

* Tela de plano e assinatura (simples)

* Controle de acesso baseado no plano

⸻

11. FUTURO (NÃO IMPLEMENTAR AGORA)

Preparar para evolução futura:

* Importação de nota fiscal (XML)

* Integração com emissão de NF

* Controle financeiro completo

* Multiusuários (funcionários)

⸻

FOCO PRINCIPAL:

Criar um sistema simples, funcional, rápido e profissional, voltado para gestão interna de empresas, sem qualquer característica de marketplace ou aplicativo de delivery.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c2b379e4-6a89-4bf8-9cf1-e45a6b0fbe83).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
