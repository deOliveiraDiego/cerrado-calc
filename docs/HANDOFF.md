# Handoff: Calculadora do Cerrado — app de rebalanceamento por aporte

**Data:** 2026-07-20
**Status:** concluído e em produção (GitHub Pages). Melhorias pendentes são opcionais.

## 1. Objetivo

App React estático que ajuda a rebalancear uma carteira de investimentos **por aporte** (lógica do "Diagrama do Cerrado", da AUVP): dado o quanto já se tem em cada ativo + o aporte do mês, o app direciona o dinheiro para os ativos **abaixo do alvo**, sem nunca sugerir venda (buy and hold). Uso pessoal do Diego (dono do repo).

## 2. Contexto essencial

- **Stack:** Vite + React 18 (JSX), Tailwind v4 (`@tailwindcss/vite`), lucide-react, Vitest + Testing Library (jsdom). 100% estático/client-side, sem backend.
- **Deploy:** GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`), a cada push na `main`: `npm ci` → `npm test` → `npm run build` → publica `dist/`. Vite com `base: '/cerrado-calc/'`.
- **Repo:** `github.com/deOliveiraDiego/cerrado-calc` (público). Site: **https://deoliveiradiego.github.io/cerrado-calc/**.
- **Ativos fixos (nesta fase):** AUPO11 (alvo 28%, BRL), AUVP11 (39%, BRL), SPHQ (19%, **USD**), Bitcoin (14%, BRL).
- **Decisões-chave:**
  - Lógica pura `computeDistribution` isolada e **intocável** por features de UI/moeda — só opera em R$. Conversão de moeda mora na borda (`App`).
  - Distribuição: `aportar_i = aporte × (falta_i / somaFaltas)`, `falta_i = max(0, novoTotal×alvo_i − atual_i)`. Arredondamento por **maior resto** pra soma bater exatamente com o aporte.
  - Persistência em **localStorage** (`usePersistentState`).
  - Entrada numérica pt-BR (`parseNumber`: ponto = milhar, vírgula = decimal). Campos de dinheiro usam **máscara estilo centavos** (`maskCents`); campos de % (alvo) e cotação manual são texto livre.
  - SPHQ em dólar: cotação USD→BRL da **AwesomeAPI** (`economia.awesomeapi.com.br/last/USD-BRL`, campo `bid`, sem chave, CORS ok), com override manual + cache em localStorage. Sem cotação → SPHQ sai do cálculo e mostra "—" (nunca R$ 0).
  - Paleta **neutro clean**: fundo slate, accent esmeralda; AUPO11 mudou de roxo (`#9b59b6`) pra teal (`#0d9488`).

## 3. O que já foi feito (cronológico)

1. **Scaffold** Vite+React+Tailwind+Vitest (smoke test).
2. **`computeDistribution`** (lógica de distribuição por defasagem) — TDD.
3. **`usePersistentState`** (localStorage) — TDD.
4. **UI inicial** (`App.jsx`): cards dos 4 ativos, alvos editáveis, aviso de soma ≠ 100%, persistência.
5. **Deploy GitHub Pages** (`deploy.yml` + `public/.nojekyll` + `base`).
6. **Teste E2E (Playwright)** + **revisão das 10 heurísticas de Nielsen** (paralelo).
7. **Fixes de UX** a partir do Nielsen:
   - `parseNumber` pt-BR extraído pra `src/lib/format.js` (corrigiu "10.000" virar 1).
   - Arredondamento por maior resto (`distribution.js`).
   - `inputMode="decimal"`, botões "Restaurar alvos padrão"/"Zerar carteira", "Total a aportar", label "no alvo", tooltip do R$ 0, aviso de localStorage indisponível.
   - Rótulo "Valor atual (R$)" → **"Quanto você tem (R$)"** (era ambíguo).
   - Inputs guardam o texto digitado (não engolem a vírgula ao digitar centavos).
8. **Feature dólar (SPHQ em USD):** brainstorming → spec → plano → implementação (Tasks 1-3, TDD, subagents em paralelo pras Tasks 1 e 2). `money(value,currency)`, hook `useExchangeRate`, `currency` por ativo, conversão na borda, barra de cotação, card em US$/R$.
9. **Máscara de dinheiro (centavos) + paleta neutra clean.**
10. **Favicon** SVG (`public/favicon.svg`, ref via `%BASE_URL%`).
11. **Deploy publicado e verificado** (site + favicon HTTP 200, Actions verde).

## 4. Estado atual

- **Tudo funciona.** `npm test` → **51 testes passando** (5 arquivos). `npm run build` → OK.
- Site **no ar** e verificado por E2E real (cotação ao vivo da AwesomeAPI retornou ~R$ 5,11; conversões e override manual OK).
- Branch de trabalho: `implement-cerrado`. `main` local e remota sincronizadas no mesmo tip (favicon = `5e0241f`, mais o commit de handoff por cima).
- **Nada quebrado.** Único ruído conhecido: nenhum agora (o favicon 404 já foi resolvido).

## 5. Próximos passos (opcionais / fase 2)

1. Sistema de **notas** (perguntas sim/não que geram o peso-alvo automaticamente) — está fora de escopo desde o spec original.
2. **Adicionar/remover ativos pela UI** (hoje os 4 são fixos em `src/assets.js`; a estrutura já facilita).
3. Suporte a **outras moedas** além de USD (o campo `currency` já é genérico).
4. Escolher cotação de compra/venda/média (hoje usa `bid`).
5. Digitação decimal "suave" nos campos de % (menor prioridade).
6. Fechar/limpar a branch `implement-cerrado` após matar o worktree.

## 6. Perguntas em aberto

- Nenhuma bloqueante. A fase 2 (sistema de notas) precisa de brainstorming próprio quando o Diego quiser.

## 7. Artefatos relevantes

- **Specs:** `docs/superpowers/specs/2026-07-20-rebalanceamento-por-aporte-design.md`, `docs/superpowers/specs/2026-07-20-multimoeda-sphq-dolar-design.md`.
- **Planos:** `docs/superpowers/plans/2026-07-20-rebalanceamento-por-aporte.md`, `docs/superpowers/plans/2026-07-20-multimoeda-sphq-dolar.md`.
- **Código:**
  - `src/lib/distribution.js` — lógica pura (NÃO acoplar moeda aqui).
  - `src/lib/format.js` — `parseNumber`, `money(v,currency)`, `brl`, `pct`, `amount`, `maskCents`.
  - `src/hooks/usePersistentState.js` — `usePersistentState`, `isLocalStorageAvailable`.
  - `src/hooks/useExchangeRate.js` — cotação USD→BRL (AwesomeAPI + cache + manual).
  - `src/assets.js` — os 4 ativos (com `currency`).
  - `src/App.jsx` — UI; conversão de moeda na borda.
- **Comandos:**
  - Dev: `npm run dev` → `http://localhost:5173/cerrado-calc/` (atenção ao subcaminho `/cerrado-calc/`).
  - Testes: `npm test`. Build: `npm run build`.
  - Deploy: push na `main` (automático). Status do Actions: `gh run list --repo deOliveiraDiego/cerrado-calc`.

## 8. Instruções pra próxima sessão

- **NÃO** colocar lógica de moeda dentro de `computeDistribution` — ela é pura e testada; converta na borda (`App`).
- A **AwesomeAPI devolve número em formato US** (ponto decimal) → usar `Number()`, nunca `parseNumber` (que é pt-BR).
- Testes de `App` **mockam** `useExchangeRate` via `vi.hoisted`; o hook tem teste próprio com `fetch` mockado. Testes de `computeDistribution` não devem depender de rede.
- Máscara de dinheiro: campos de dinheiro usam `maskCents` (dígitos entram como centavos) + `amount()` no `value`; % e cotação manual usam `cleanNum`.
- Convenção de commit do ambiente: terminar mensagens com `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- Trabalhar em branch (não direto na `main`); deploy é automático e trava se um teste falhar.
- Tom: direto, em português, com recomendação em vez de survey exaustivo. O Diego itera rápido e gosta de ver rodando no navegador.
