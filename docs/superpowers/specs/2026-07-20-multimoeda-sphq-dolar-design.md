# Cerrado Calc — Suporte a ativo em dólar (SPHQ em USD) — design

Data: 2026-07-20
Status: aprovado para virar plano de implementação

## Contexto

A Calculadora do Cerrado hoje trata todos os valores em reais (R$). Mas o SPHQ (Invesco S&P 500 Quality ETF) é dolarizado: tanto o que o usuário **já tem** quanto o que ele **investe** nele são em US$. Digitar o SPHQ em R$ obriga o usuário a converter de cabeça a cada mês, com risco de erro e defasagem de cotação.

## Objetivo

Permitir que o SPHQ seja informado e exibido em **dólar (US$)**, mantendo a lógica de rebalanceamento por aporte funcionando numa moeda-base única (R$). A cotação USD→BRL é buscada automaticamente, com ajuste manual e cache.

## Escopo

### Em escopo
1. Cada ativo passa a ter uma **moeda** (`currency`). Nesta fase, só o SPHQ é `USD`; os demais são `BRL`.
2. Entrada do saldo atual do SPHQ em **US$**.
3. Cotação **USD→BRL automática** (API grátis, client-side), com **override manual** e **cache** em localStorage.
4. Conversão na borda da UI: saldo do SPHQ em US$ → R$ para o cálculo; aporte do SPHQ em R$ → US$ para exibição.
5. Card do SPHQ exibe o "aportar agora" em **US$ e R$**.
6. Barra de cotação no topo, mostrando valor, fonte e opção de editar.
7. Rodapé (patrimônio / total a aportar) segue em R$ (moeda-base), já somando o SPHQ convertido.

### Fora de escopo (por enquanto)
- Múltiplas moedas estrangeiras além de USD (a estrutura suporta, mas a UI/experiência foca em USD).
- Aporte mensal em moeda diferente de R$ (o aporte continua sendo definido em reais).
- Histórico de cotações / gráfico de câmbio.
- Conversão de AUPO11, AUVP11 e Bitcoin (permanecem em R$).
- Escolha de cotação de compra vs. venda vs. média (usamos uma cotação de referência única — ver abaixo).

## Decisões de design

### Onde a conversão mora
A lógica pura `computeDistribution` **não muda** e continua operando 100% em R$. A conversão USD↔BRL é um adaptador na camada `App`:
- Antes do cálculo: `holdingSPHQ_BRL = holdingSPHQ_USD × rate`.
- Depois do cálculo: `aportarSPHQ_USD = aportarSPHQ_BRL / rate`.

Isso mantém a lib pura testável e isola moeda como preocupação de apresentação. (Alternativas descartadas: tornar `computeDistribution` ciente de moeda — mais acoplamento, sem ganho; calculadora de dólar separada — perde a entrada nativa em US$.)

### Fonte da cotação
- API primária: **AwesomeAPI** — `GET https://economia.awesomeapi.com.br/last/USD-BRL`. Grátis, sem chave, CORS liberado. Resposta: `{ "USDBRL": { "bid": "5.4321", ... } }`. Usamos o campo `bid` como cotação de referência.
- É uma chamada **client-side** (navegador do usuário), então não fere a regra de "app 100% estático, sem backend".
- **Cache**: a última cotação bem-sucedida é gravada em localStorage (`{ rate, timestamp }`) e usada imediatamente ao abrir e como fallback se a API falhar.
- **Override manual**: campo onde o usuário digita a cotação; enquanto preenchido, ele tem prioridade sobre a API. Botão "voltar ao automático" limpa o override.
- Precedência da cotação efetiva: `manual` → `api` (busca da sessão) → `cache` → nenhuma.

## Componentes (organização)

- **Dados** — `src/assets.js`: adicionar `currency: 'BRL' | 'USD'` a cada ativo (SPHQ = `'USD'`).
- **Formatação** — `src/lib/format.js`: função genérica `money(value, currency)` formatando em locale pt-BR com a moeda dada (`Intl.NumberFormat('pt-BR', { style: 'currency', currency })` → `R$ 1.234,56` / `US$ 1.234,56`). `brl` vira um atalho de `money(v, 'BRL')`. `parseNumber` continua pt-BR (vírgula decimal, ponto milhar), inclusive para valores em US$ digitados pelo usuário brasileiro.
- **Cotação** — `src/hooks/useExchangeRate.js` (novo): busca USD→BRL, faz cache e aceita override manual. Interface:
  `useExchangeRate() → { rate: number|null, source: 'manual'|'api'|'cache'|null, updatedAt: number|null, loading: boolean, error: boolean, manualRate: string, setManualRate: (v)=>void, refresh: ()=>void }`.
  A cotação efetiva `rate` segue a precedência acima; `null` quando não há nenhuma disponível.
- **UI** — `src/App.jsx`:
  - Barra de cotação no topo: *"Dólar: R$ 5,43 · via AwesomeAPI · [editar]"* (ou "cotação em cache de {data}", ou "digite a cotação do dólar" quando não há valor). Editar abre input de override + "voltar ao automático".
  - Card do SPHQ: label do saldo vira **"Quanto você tem (US$)"**; "aportar agora" mostra **US$ X** com **≈ R$ Y** abaixo. Demais cards inalterados (R$).
  - Rodapé em R$, somando o SPHQ convertido.

## Fluxo de dados

1. `useExchangeRate` resolve `rate` (manual/api/cache).
2. `App` monta `holdingsBRL`: para cada ativo, se `currency === 'USD'`, multiplica o valor digitado pela `rate`; senão usa direto.
3. `computeDistribution(holdingsBRL, targets, aporteBRL)` roda em R$ (sem alteração).
4. Para o card do SPHQ, `aportarUSD = aportarBRL / rate` (exibido junto do R$).

## Casos de borda / erros
- **API falha e não há cache**: banner "Não consegui buscar o dólar — digite a cotação". Sem `rate`, o SPHQ não é convertido: o card mostra "—" no aporte em R$/US$ e o ativo fica de fora da distribuição até haver cotação (os demais continuam calculando normalmente entre si).
- **Cotação inválida / 0 / negativa**: tratada como ausente (evita divisão por zero na volta US$).
- **API lenta**: mostra o cache (se houver) na hora e atualiza quando a resposta chega; indicador de `loading` discreto.
- **Valores não numéricos / negativos**: continuam tratados como 0 (via `parseNumber`/`clampNonNegative`).
- **localStorage indisponível**: cache e override simplesmente não persistem; a sessão ainda busca da API. (Reaproveita o aviso já existente de localStorage.)

## Stack / hospedagem
- Sem mudança de stack: React 18 + Vite + Tailwind v4 + Vitest. Continua estático no GitHub Pages.
- A única dependência externa nova é a chamada HTTP client-side à AwesomeAPI (sem chave, sem backend).

## Testes
- `useExchangeRate` com `fetch` mockado: (a) sucesso → `rate` da API + grava cache; (b) falha com cache → usa cache; (c) falha sem cache → `error`, `rate` null; (d) override manual tem prioridade; (e) limpar override volta pra API/cache.
- `format.money`: formata BRL e USD com locale pt-BR.
- `App` (integração): saldo do SPHQ em US$ com cotação fixa entra no patrimônio em R$ correto; card do SPHQ mostra aporte em US$ e R$; sem cotação, SPHQ mostra "—" e não quebra o resto.
- `computeDistribution`: **inalterada** — nenhum teste tocado.

## Princípios de UX (heurísticas de Nielsen aplicadas ao câmbio)

Critérios de aceitação derivados de uma revisão pré-desenvolvimento, focados na superfície nova (barra de cotação, entrada em US$, exibição dupla, estados de erro):

1. **Visibilidade do status** *(prioridade máxima)*: a barra sempre mostra a cotação em uso, sua **fonte** (`automático` / `em cache de {data}` / `manual`) e o horário; indicador de `loading` discreto durante a busca. Nunca uma cotação silenciosa/implícita.
2. **Prevenção de erro** *(crítico)*: sem cotação válida, o SPHQ **nunca** é tratado como R$ 0 — sai da distribuição e mostra "—". Cotação 0/negativa/não-numérica é tratada como ausente (sem divisão por zero).
3. **Recuperação de erro**: quando a API falha, banner acionável ("não consegui o dólar — digite a cotação") que aponta para o campo manual; distinção visual entre "em cache" (funciona, só está velho) e "sem cotação" (SPHQ bloqueado).
4. **Controle e liberdade**: override manual + botão "voltar ao automático" + "atualizar" (refresh) — o usuário nunca fica preso a uma cotação errada.
5. **Reconhecer, não lembrar**: o card do SPHQ exibe o `≈ R$ Y` ao lado do `US$ X`, para o usuário não precisar recordar a cotação nem fazer a conta.
6. **Correspondência + consistência**: `US$` e `R$` sempre rotulados; mesma formatação via `money(v, currency)`; card do SPHQ com layout idêntico aos demais, mudando só a moeda.
7. **Minimalismo**: a barra de cotação ocupa uma linha compacta, sem poluir o topo.
8. **Eficiência + ajuda**: o cache faz o app abrir instantâneo; um micro-hint (tooltip) indica que o SPHQ é em dólar e a cotação é aproximada.

## Critérios de sucesso
- O usuário digita o saldo do SPHQ em US$ e vê quanto aportar nele em US$ (e o equivalente em R$), sem converter nada de cabeça.
- A cotação aparece automaticamente ao abrir, pode ser ajustada à mão e sobrevive a falhas da API via cache.
- O rebalanceamento continua correto: o SPHQ é comparado aos alvos pela sua proporção em R$, e a lógica pura de distribuição permanece intocada.
