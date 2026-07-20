# Cerrado Calc — Rebalanceamento por aporte (design)

Data: 2026-07-20
Status: aprovado para virar plano de implementação

## Contexto

Diego é aluno da AUVP e monta a carteira seguindo a lógica do **Diagrama do Cerrado**: bons ativos, diversificação e aporte constante, rebalanceando **sempre comprando** (buy and hold, nunca vendendo). Ele já tem um artefato React ("Calculadora de Investimentos") que reparte um valor de aporte entre 4 ativos usando percentuais **fixos e hardcoded**:

- AUPO11 — ETF Renda Fixa (Selic + IPCA+) — 28%
- AUVP11 — ETF Ações Fundamentalistas BR — 39%
- SPHQ — ETF Internacional Quality (S&P 500) — 19%
- Bitcoin — 14%

## Problema

O artefato atual é um **repartidor estático**: para qualquer valor, divide sempre na mesma proporção. Ele **ignora quanto já existe acumulado em cada ativo**, então nunca rebalanceia — o aporte não reage à carteira real. Se um ativo valoriza e ultrapassa o alvo, continua recebendo aporte do mesmo jeito.

## Objetivo

Adicionar a **dinâmica de rebalanceamento por aporte** do Diagrama do Cerrado: dado o que já existe na carteira e o alvo de cada ativo, direcionar o aporte do mês para os ativos **abaixo do alvo**, sem vender nada.

## Escopo

### Em escopo
1. Entrada do **valor atual (R$)** de cada ativo na carteira.
2. Entrada do **aporte do mês**.
3. Pesos-alvo com padrão 28/39/19/14, **editáveis na tela** (sem mexer no código).
4. Cálculo de distribuição do aporte por defasagem (algoritmo abaixo).
5. Saída: quanto aportar em cada ativo + % antes/depois + marcação de acima/abaixo do alvo.
6. Persistência dos valores no navegador (**localStorage**), para não redigitar todo mês.
7. Manter a identidade visual atual (cards, tabela resumo, seção de observações).

### Fora de escopo (por enquanto)
- Sistema de **notas** (perguntas sim/não que geram o peso-alvo). Fica para uma fase 2; nesta fase os alvos são definidos manualmente.
- Venda de ativos / rebalanceamento por venda. É buy and hold: só compra.
- Preço/cotação em tempo real. O usuário digita o valor atual de cada ativo.
- Cadastro dinâmico de novos ativos (a lista dos 4 é fixa nesta fase; a estrutura deve facilitar adicionar depois).

## Algoritmo de distribuição do aporte

Dado:
- `atual_i` = valor atual (R$) do ativo i
- `alvo_i` = peso-alvo do ativo i (soma dos alvos = 100%)
- `aporte` = valor novo a investir

Passos:
1. `totalAtual = Σ atual_i`
2. `novoTotal = totalAtual + aporte`
3. Para cada ativo: `ideal_i = novoTotal × alvo_i`
4. `falta_i = max(0, ideal_i − atual_i)` (quanto falta pra chegar no ideal pós-aporte)
5. `somaFaltas = Σ falta_i`
6. Distribuição: `aportar_i = aporte × (falta_i / somaFaltas)`.
7. Ativos já acima do alvo têm `falta_i = 0`, logo recebem `aportar_i = 0` automaticamente.

> **Nota matemática:** `somaFaltas ≥ aporte` sempre. Como `Σ(ideal_i − atual_i) = novoTotal − totalAtual = aporte` e cortar os termos negativos (ativos acima do alvo) só aumenta a soma, nunca sobra aporte depois de cobrir as defasagens. Por isso a distribuição é sempre proporcional à defasagem — não existe caso de "excedente". Guarda defensiva: se `aporte = 0` ou `somaFaltas = 0`, todos os `aportar_i = 0`.

Saída por ativo: `aportar_i`, `%_antes = atual_i / totalAtual`, `%_depois = (atual_i + aportar_i) / novoTotal`, e flag `acima/abaixo/ok` vs alvo.

### Exemplo
Carteira R$ 10.000 com Bitcoin em 20% (acima dos 14%), aporte R$ 3.000. Bitcoin recebe R$ 0; os R$ 3.000 vão para AUPO11/AUVP11/SPHQ proporcional às suas defasagens, puxando a carteira de volta aos alvos.

## Casos de borda
- **Carteira zerada** (primeiro aporte, todos os `atual_i = 0`): `falta_i = novoTotal × alvo_i`, então o aporte é dividido exatamente pelos pesos-alvo (comportamento igual ao artefato atual — correto).
- **Aporte = 0**: mostra só a foto atual da carteira vs alvo, sem distribuição.
- **Soma dos alvos ≠ 100%**: avisar o usuário (validação visual) e normalizar para o cálculo.
- **Valores não numéricos / negativos**: tratar como 0.
- **Arredondamento**: exibir em BRL (2 casas); a soma dos `aportar_i` deve bater com o aporte (ajustar a última fração para fechar o total).

## Componentes (organização)
- **Estado**: `holdings` (valor atual por ativo), `targets` (peso-alvo por ativo), `aporte`.
- **Lógica pura** `computeDistribution(holdings, targets, aporte)` → retorna por ativo `{ aportar, pctAntes, pctDepois, status }`. Isolada da UI, testável sozinha.
- **Persistência**: hook que sincroniza `holdings`/`targets` com localStorage.
- **UI**: reaproveita cards + tabela resumo do artefato atual, agora com inputs de valor atual e alvo editável, e colunas "aportar agora / % antes / % depois".

## Stack
- React (single-file component, como o artefato atual), Tailwind, ícones lucide-react. Objetivo: continuar publicável como Artifact.

## Critérios de sucesso
- Ao informar carteira + aporte, o app mostra exatamente quanto pôr em cada ativo, priorizando os atrasados, e nunca sugere venda.
- Reabrir o app mantém os valores da carteira (localStorage).
- Com carteira zerada, replica o comportamento de repartição por peso do artefato atual.
