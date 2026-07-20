# Suporte a ativo em dólar (SPHQ em USD) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir informar/exibir o SPHQ em dólar (US$), convertendo para R$ na hora do cálculo, com cotação USD→BRL automática (API grátis), ajuste manual e cache.

**Architecture:** A lógica pura `computeDistribution` **não muda** e segue operando em R$. A conversão USD↔BRL é um adaptador na `App`. A cotação vem de um hook isolado `useExchangeRate` (fetch + cache em localStorage + override manual). A moeda de cada ativo é um dado em `assets.js`.

**Tech Stack:** React 18 (JSX) + Vite, Tailwind v4, lucide-react, Vitest + Testing Library (jsdom). App 100% estático/client-side (GitHub Pages).

## Global Constraints

- Buy and hold: o app **nunca** sugere vender; aportes são sempre ≥ 0. `computeDistribution` permanece **intocada**.
- Ativos fixos: AUPO11 (28%, BRL), AUVP11 (39%, BRL), SPHQ (19%, **USD**), Bitcoin (14%, BRL).
- Aporte mensal sempre em **R$**. Moeda-base de cálculo é **R$**.
- Cotação USD→BRL: API primária **AwesomeAPI** `GET https://economia.awesomeapi.com.br/last/USD-BRL`, campo `USDBRL.bid` (string em formato US, decimal com ponto → usar `Number()`, **não** `parseNumber`). Sem chave, CORS ok, chamada client-side.
- Precedência da cotação efetiva: `manual` (se > 0) → `api` (sessão) → `cache` (localStorage) → nenhuma (`null`).
- Sem cotação válida: o SPHQ **sai do cálculo** e o card mostra "—" (nunca tratar como R$ 0). Cotação 0/negativa/não-numérica = ausente.
- Formatação via `money(value, currency)` com `Intl.NumberFormat('pt-BR', { style: 'currency', currency })`. Percentuais com 1 casa. Entrada numérica do usuário continua pt-BR (`parseNumber`: vírgula decimal, ponto milhar).
- Persistência: `cerrado.fxCache` = `{ rate, timestamp }`, `cerrado.fxManual` = string. (Reaproveita `usePersistentState`.)

---

## File Structure

- `src/lib/format.js` + `.test.js` — adicionar `money(value, currency)`; `brl` vira atalho. (Task 1)
- `src/hooks/useExchangeRate.js` + `.test.js` — hook de cotação (fetch/cache/manual). (Task 2)
- `src/assets.js` — adicionar `currency` a cada ativo. (Task 3)
- `src/App.jsx` + `src/App.test.jsx` — conversão na borda, barra de cotação, card do SPHQ em US$/R$. (Task 3)

Tasks 1 e 2 são independentes entre si (arquivos diferentes, sem estado compartilhado). A Task 3 consome ambas.

---

### Task 1: Formatador genérico `money(value, currency)`

**Files:**
- Modify: `src/lib/format.js`
- Test: `src/lib/format.test.js`

**Interfaces:**
- Produces:
  - `money(value: number|string, currency = 'BRL'): string` — formata em locale pt-BR com a moeda dada (`'BRL'` → `R$ 1.234,56`, `'USD'` → `US$ 1.234,56`). Valores inválidos viram 0.
  - `brl(value): string` — atalho de `money(value, 'BRL')` (mantido para compatibilidade).
  - `parseNumber`, `pct` — inalterados.

- [ ] **Step 1: Escrever o teste que falha**

Adicionar este bloco ao final de `src/lib/format.test.js` (e trocar o import da primeira linha para incluir `money`):

Trocar a linha 2:
```js
import { parseNumber, brl, pct } from './format.js';
```
por:
```js
import { parseNumber, brl, pct, money } from './format.js';
```

Adicionar ao final do arquivo:
```js
describe('money', () => {
  it('formata BRL com R$ e padrão pt-BR', () => {
    expect(money(1000, 'BRL')).toContain('1.000,00');
    expect(money(1000, 'BRL')).toContain('R$');
  });
  it('formata USD com US$ e padrão pt-BR', () => {
    expect(money(1000, 'USD')).toContain('1.000,00');
    expect(money(1000, 'USD')).toContain('US$');
  });
  it('assume BRL por padrão e trata lixo como 0', () => {
    expect(money(1234.56)).toContain('1.234,56');
    expect(money('lixo', 'USD')).toContain('0,00');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- format`
Expected: FAIL (`money` não é exportado).

- [ ] **Step 3: Implementar**

Em `src/lib/format.js`, substituir a definição atual de `brl`:
```js
export const brl = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);
```
por:
```js
export const money = (value, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(Number(value) || 0);

export const brl = (v) => money(v, 'BRL');
```
(Manter `parseNumber` e `pct` como estão.)

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- format`
Expected: todos PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/format.js src/lib/format.test.js
git commit -m "feat: money(value, currency) para formatar BRL e USD"
```

---

### Task 2: Hook de cotação `useExchangeRate`

**Files:**
- Create: `src/hooks/useExchangeRate.js`
- Test: `src/hooks/useExchangeRate.test.js`

**Interfaces:**
- Consumes: `usePersistentState` (existente), `parseNumber` (Task 1 já existia).
- Produces:
  `useExchangeRate(): { rate: number|null, source: 'manual'|'api'|'cache'|null, updatedAt: number|null, loading: boolean, error: boolean, manualRate: string, setManualRate: (v: string) => void, refresh: () => void }`

- [ ] **Step 1: Escrever os testes que falham**

Criar `src/hooks/useExchangeRate.test.js`:
```js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useExchangeRate } from './useExchangeRate.js';

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

function mockFetchOnce(bid) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ USDBRL: { bid: String(bid) } }),
  });
}

describe('useExchangeRate', () => {
  it('busca a cotação da API e expõe como fonte "api"', async () => {
    mockFetchOnce('5.4321');
    const { result } = renderHook(() => useExchangeRate());
    await waitFor(() => expect(result.current.rate).toBe(5.4321));
    expect(result.current.source).toBe('api');
    expect(result.current.error).toBe(false);
  });

  it('grava a cotação em cache no localStorage', async () => {
    mockFetchOnce('5.5');
    const { result } = renderHook(() => useExchangeRate());
    await waitFor(() => expect(result.current.rate).toBe(5.5));
    const cache = JSON.parse(window.localStorage.getItem('cerrado.fxCache'));
    expect(cache.rate).toBe(5.5);
  });

  it('usa o cache quando a API falha', async () => {
    window.localStorage.setItem('cerrado.fxCache', JSON.stringify({ rate: 5.0, timestamp: 111 }));
    global.fetch = vi.fn().mockRejectedValue(new Error('rede'));
    const { result } = renderHook(() => useExchangeRate());
    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.rate).toBe(5.0);
    expect(result.current.source).toBe('cache');
  });

  it('sem cache e com falha: rate null e error true', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('rede'));
    const { result } = renderHook(() => useExchangeRate());
    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.rate).toBeNull();
    expect(result.current.source).toBeNull();
  });

  it('override manual tem prioridade sobre a API', async () => {
    mockFetchOnce('5.4321');
    const { result } = renderHook(() => useExchangeRate());
    await waitFor(() => expect(result.current.rate).toBe(5.4321));
    act(() => result.current.setManualRate('6'));
    expect(result.current.rate).toBe(6);
    expect(result.current.source).toBe('manual');
  });

  it('limpar o override volta para a cotação da API', async () => {
    mockFetchOnce('5.4321');
    const { result } = renderHook(() => useExchangeRate());
    await waitFor(() => expect(result.current.rate).toBe(5.4321));
    act(() => result.current.setManualRate('6'));
    expect(result.current.source).toBe('manual');
    act(() => result.current.setManualRate(''));
    expect(result.current.rate).toBe(5.4321);
    expect(result.current.source).toBe('api');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- useExchangeRate`
Expected: FAIL (módulo/export inexistente).

- [ ] **Step 3: Implementar**

Criar `src/hooks/useExchangeRate.js`:
```js
import { useCallback, useEffect, useState } from 'react';
import { usePersistentState } from './usePersistentState.js';
import { parseNumber } from '../lib/format.js';

const FX_URL = 'https://economia.awesomeapi.com.br/last/USD-BRL';

export function useExchangeRate() {
  // cache: { rate, timestamp } | null
  const [cache, setCache] = usePersistentState('cerrado.fxCache', null);
  const [manualRate, setManualRate] = usePersistentState('cerrado.fxManual', '');
  const [apiRate, setApiRate] = useState(null); // { rate, timestamp } | null
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(FX_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // A API devolve o número em formato US (ponto decimal): usar Number, não parseNumber.
      const bid = Number(data?.USDBRL?.bid);
      if (!Number.isFinite(bid) || bid <= 0) throw new Error('cotação inválida');
      const entry = { rate: bid, timestamp: Date.now() };
      setApiRate(entry);
      setCache(entry);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [setCache]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const manualNum = parseNumber(manualRate);
  let rate = null;
  let source = null;
  let updatedAt = null;
  if (manualNum > 0) {
    rate = manualNum;
    source = 'manual';
  } else if (apiRate && apiRate.rate > 0) {
    rate = apiRate.rate;
    source = 'api';
    updatedAt = apiRate.timestamp;
  } else if (cache && cache.rate > 0) {
    rate = cache.rate;
    source = 'cache';
    updatedAt = cache.timestamp;
  }

  return { rate, source, updatedAt, loading, error, manualRate, setManualRate, refresh };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- useExchangeRate`
Expected: todos PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useExchangeRate.js src/hooks/useExchangeRate.test.js
git commit -m "feat: hook useExchangeRate (AwesomeAPI + cache + override manual)"
```

---

### Task 3: Integração na UI (moeda por ativo + conversão + barra de cotação + card SPHQ)

**Files:**
- Modify: `src/assets.js`
- Modify: `src/App.jsx`
- Test: `src/App.test.jsx`

**Interfaces:**
- Consumes: `money` (Task 1), `useExchangeRate` (Task 2), `computeDistribution`, `usePersistentState`, `isLocalStorageAvailable`, `parseNumber`.
- Produces: `App` default export — UI completa com suporte a dólar.

**Nota de teste:** os testes de `App` **mockam** `useExchangeRate` (via `vi.hoisted`) para controlar a cotação de forma determinística e evitar rede — o hook em si já é testado na Task 2.

- [ ] **Step 1: Adicionar `currency` em `src/assets.js`**

Substituir o conteúdo de `src/assets.js` por:
```js
export const ASSETS = [
  { name: 'AUPO11', fullName: 'ETF Renda Fixa (Selic + IPCA+)', type: 'ETF Renda Fixa', risk: 'Baixo', color: '#9b59b6', icon: 'shield', defaultTarget: 28, currency: 'BRL' },
  { name: 'AUVP11', fullName: 'ETF Ações Fundamentalistas', type: 'ETF Ações BR', risk: 'Médio', color: '#f39c12', icon: 'trending', defaultTarget: 39, currency: 'BRL' },
  { name: 'SPHQ', fullName: 'Invesco S&P 500 Quality ETF', type: 'ETF Internacional (Quality)', risk: 'Médio-Alto', color: '#3498db', icon: 'trending', defaultTarget: 19, currency: 'USD' },
  { name: 'Bitcoin', fullName: 'Bitcoin (BTC)', type: 'Criptomoeda', risk: 'Alto', color: '#f1c40f', icon: 'bitcoin', defaultTarget: 14, currency: 'BRL' },
];
```

- [ ] **Step 2: Substituir o topo de `src/App.test.jsx` e adicionar os novos testes**

Substituir o cabeçalho do arquivo (imports + `beforeEach`) por:
```jsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App.jsx';

const { fx } = vi.hoisted(() => ({ fx: { current: null } }));
vi.mock('./hooks/useExchangeRate.js', () => ({
  useExchangeRate: () => fx.current,
}));

function setFx(partial) {
  fx.current = {
    rate: 5,
    source: 'api',
    updatedAt: 1,
    loading: false,
    error: false,
    manualRate: '',
    setManualRate: vi.fn(),
    refresh: vi.fn(),
    ...partial,
  };
}

beforeEach(() => {
  window.localStorage.clear();
  setFx();
});
```

Depois, **adicionar** estes testes ao final do `describe('App', ...)` (antes do `});` que fecha o describe):
```jsx
  it('converte o saldo do SPHQ de US$ para R$ no patrimônio', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Aporte deste mês'), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText('Quanto você tem SPHQ'), { target: { value: '100' } });
    // 100 US$ × 5 = R$ 500,00
    expect(screen.getByText(/Patrimônio atual:\s*R\$\s*500,00/)).toBeInTheDocument();
  });

  it('mostra o aporte do SPHQ em US$ e em R$', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Aporte deste mês'), { target: { value: '1000' } });
    // carteira zerada, alvo do SPHQ 19% → R$ 190,00 → US$ 38,00 (÷5)
    expect(screen.getByText(/US\$\s*38,00/)).toBeInTheDocument();
    expect(screen.getByText(/≈\s*R\$\s*190,00/)).toBeInTheDocument();
  });

  it('sem cotação, o SPHQ fica de fora e mostra "—"', () => {
    setFx({ rate: null, source: null, error: true });
    render(<App />);
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText(/sem cotação do dólar/i)).toBeInTheDocument();
    expect(screen.getByText(/não consegui buscar o dólar/i)).toBeInTheDocument();
  });

  it('a barra de cotação mostra o valor e a fonte', () => {
    render(<App />);
    expect(screen.getByText(/Dólar:/)).toBeInTheDocument();
    expect(screen.getByText(/via AwesomeAPI/)).toBeInTheDocument();
  });

  it('sinaliza quando a cotação vem do cache', () => {
    setFx({ source: 'cache' });
    render(<App />);
    expect(screen.getByText(/cotação em cache/i)).toBeInTheDocument();
  });

  it('permite editar a cotação manualmente', () => {
    render(<App />);
    fireEvent.click(screen.getByText('editar'));
    fireEvent.change(screen.getByLabelText('Cotação do dólar'), { target: { value: '6,10' } });
    expect(fx.current.setManualRate).toHaveBeenCalledWith('6,10');
  });
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npm test -- App`
Expected: FAIL (labels/textos e conversão ainda não existem).

- [ ] **Step 4: Implementar `src/App.jsx`**

Substituir o conteúdo inteiro de `src/App.jsx` por:
```jsx
import { useState } from 'react';
import { DollarSign, TrendingUp, Bitcoin, Shield, RotateCcw, Eraser, RefreshCw } from 'lucide-react';
import { ASSETS } from './assets.js';
import { computeDistribution } from './lib/distribution.js';
import { usePersistentState, isLocalStorageAvailable } from './hooks/usePersistentState.js';
import { useExchangeRate } from './hooks/useExchangeRate.js';
import { money, pct, parseNumber } from './lib/format.js';

const ICONS = { shield: Shield, trending: TrendingUp, bitcoin: Bitcoin };
const STATUS_LABEL = { acima: 'acima', abaixo: 'abaixo', ok: 'no alvo' };
const SOURCE_LABEL = { manual: 'cotação manual', api: 'via AwesomeAPI', cache: 'cotação em cache' };

// Mantém o texto digitado (só filtra caracteres inválidos); converte só no cálculo.
const cleanNum = (v) => String(v).replace(/[^\d.,]/g, '');

const initialHoldings = Object.fromEntries(ASSETS.map((a) => [a.name, 0]));
const initialTargets = Object.fromEntries(ASSETS.map((a) => [a.name, a.defaultTarget]));
const storageOk = isLocalStorageAvailable();

export default function App() {
  const [holdings, setHoldings] = usePersistentState('cerrado.holdings', initialHoldings);
  const [targets, setTargets] = usePersistentState('cerrado.targets', initialTargets);
  const [aporte, setAporte] = usePersistentState('cerrado.aporte', 3000);
  const { rate, source, loading, error, manualRate, setManualRate, refresh } = useExchangeRate();
  const [editandoCotacao, setEditandoCotacao] = useState(false);

  const aporteNum = parseNumber(aporte);
  const temCotacao = rate != null && rate > 0;

  // BRL sempre entra; USD só quando há cotação.
  const ativosCalculo = ASSETS.filter((a) => a.currency === 'BRL' || temCotacao);
  const holdingsBRL = {};
  const targetsCalculo = {};
  for (const a of ativosCalculo) {
    const nativo = parseNumber(holdings[a.name]);
    holdingsBRL[a.name] = a.currency === 'USD' ? nativo * rate : nativo;
    targetsCalculo[a.name] = parseNumber(targets[a.name]);
  }
  const rows = computeDistribution(holdingsBRL, targetsCalculo, aporteNum);
  const byName = Object.fromEntries(rows.map((r) => [r.name, r]));

  const somaAlvos = ASSETS.reduce((a, x) => a + parseNumber(targets[x.name]), 0);
  const totalAtual = ASSETS.reduce((a, x) => {
    const nativo = parseNumber(holdings[x.name]);
    if (x.currency === 'USD') return a + (temCotacao ? nativo * rate : 0);
    return a + nativo;
  }, 0);
  const totalAportar = rows.reduce((a, r) => a + r.aportar, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-6 sm:p-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">Calculadora do Cerrado</h1>
            <p className="text-gray-600">Aporte direcionado aos ativos abaixo do alvo — buy and hold, sem vender.</p>
          </div>

          {!storageOk && (
            <div className="mb-6 text-center text-sm text-amber-700 bg-amber-100 rounded-xl py-2 px-4">
              Não foi possível acessar o armazenamento do navegador — seus valores não serão salvos entre visitas.
            </div>
          )}

          <div className="max-w-md mx-auto mb-6 text-center text-sm">
            <div className="inline-flex flex-wrap items-center justify-center gap-2 bg-gray-100 rounded-xl py-2 px-4 text-gray-700">
              {temCotacao ? (
                <span>Dólar: <strong>{money(rate, 'BRL')}</strong> · {SOURCE_LABEL[source]}</span>
              ) : (
                <span className="text-amber-700">Informe a cotação do dólar para calcular o SPHQ.</span>
              )}
              {loading && <span className="text-gray-400">atualizando…</span>}
              <button type="button" aria-label="Atualizar cotação" onClick={refresh} className="text-gray-500 hover:text-gray-700">
                <RefreshCw className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => setEditandoCotacao((v) => !v)} className="text-purple-700 underline">
                editar
              </button>
            </div>
            {editandoCotacao && (
              <div className="mt-2 flex items-center justify-center gap-3">
                <label className="text-gray-600">
                  Cotação (R$)
                  <input
                    aria-label="Cotação do dólar"
                    type="text"
                    inputMode="decimal"
                    value={manualRate}
                    onChange={(e) => setManualRate(cleanNum(e.target.value))}
                    className="ml-2 w-28 px-2 py-1 border rounded-lg"
                  />
                </label>
                {manualRate !== '' && (
                  <button type="button" onClick={() => setManualRate('')} className="text-purple-700 underline">
                    voltar ao automático
                  </button>
                )}
              </div>
            )}
          </div>

          {error && !temCotacao && (
            <div className="mb-6 text-center text-sm text-amber-700 bg-amber-100 rounded-xl py-2 px-4">
              Não consegui buscar o dólar. Clique em “editar” e digite a cotação para calcular o SPHQ.
            </div>
          )}

          <div className="max-w-md mx-auto mb-8">
            <label htmlFor="aporte" className="block text-sm font-semibold text-gray-700 mb-2 text-center">Aporte deste mês</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <DollarSign className="h-6 w-6 text-gray-400" />
              </div>
              <input
                id="aporte"
                aria-label="Aporte deste mês"
                type="text"
                inputMode="decimal"
                value={aporte}
                onChange={(e) => setAporte(cleanNum(e.target.value))}
                className="w-full pl-12 pr-4 py-4 text-2xl font-bold text-center border-2 border-purple-300 rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-400"
              />
            </div>
            <div className="mt-2 text-center text-gray-600 font-semibold">{money(aporteNum, 'BRL')}</div>
          </div>

          <div className="flex flex-wrap justify-center gap-3 mb-6">
            <button
              type="button"
              onClick={() => setTargets(initialTargets)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-xl py-2 px-4 transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Restaurar alvos padrão
            </button>
            <button
              type="button"
              onClick={() => setHoldings(initialHoldings)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl py-2 px-4 transition-colors"
            >
              <Eraser className="w-4 h-4" /> Zerar carteira
            </button>
          </div>

          {Math.abs(somaAlvos - 100) > 0.01 && (
            <div className="mb-6 text-center text-sm text-amber-700 bg-amber-100 rounded-xl py-2 px-4">
              A soma dos alvos é {somaAlvos.toFixed(0)}% (o ideal é 100%). O cálculo normaliza automaticamente.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {ASSETS.map((asset) => {
              const Icon = ICONS[asset.icon];
              const r = byName[asset.name];
              const isUSD = asset.currency === 'USD';
              const holdingLabel = isUSD ? 'Quanto você tem (US$)' : 'Quanto você tem (R$)';
              const statusColor = r
                ? r.status === 'acima'
                  ? 'text-red-600'
                  : r.status === 'abaixo'
                  ? 'text-emerald-600'
                  : 'text-gray-500'
                : 'text-gray-400';
              const zeroPorAcima = r && r.aportar === 0 && r.status === 'acima';
              return (
                <div key={asset.name} className="bg-white rounded-2xl p-6 shadow-lg border-l-4" style={{ borderLeftColor: asset.color }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-xl" style={{ backgroundColor: `${asset.color}20` }}>
                      <Icon className="w-6 h-6" style={{ color: asset.color }} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{asset.name}</h3>
                      <p className="text-sm text-gray-500">{asset.fullName}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <label className="text-sm text-gray-600">
                      {holdingLabel}
                      <input
                        aria-label={`Quanto você tem ${asset.name}`}
                        type="text"
                        inputMode="decimal"
                        value={holdings[asset.name]}
                        onChange={(e) => setHoldings({ ...holdings, [asset.name]: cleanNum(e.target.value) })}
                        className="mt-1 w-full px-3 py-2 border rounded-lg"
                      />
                    </label>
                    <label className="text-sm text-gray-600">
                      Alvo (%)
                      <input
                        aria-label={`Alvo ${asset.name}`}
                        type="text"
                        inputMode="decimal"
                        value={targets[asset.name]}
                        onChange={(e) => setTargets({ ...targets, [asset.name]: cleanNum(e.target.value) })}
                        className="mt-1 w-full px-3 py-2 border rounded-lg"
                      />
                    </label>
                  </div>

                  <div className="pt-3 border-t border-gray-100">
                    <div className="text-sm text-gray-500">Aportar agora</div>
                    {r ? (
                      isUSD ? (
                        <>
                          <div
                            className="text-2xl font-bold"
                            style={{ color: asset.color }}
                            title={zeroPorAcima ? 'Já está acima do alvo — não recebe aporte (buy and hold: nunca vende).' : undefined}
                          >
                            {money(r.aportar / rate, 'USD')}
                          </div>
                          <div className="text-xs text-gray-500">≈ {money(r.aportar, 'BRL')}</div>
                        </>
                      ) : (
                        <div
                          className="text-2xl font-bold"
                          style={{ color: asset.color }}
                          title={zeroPorAcima ? 'Já está acima do alvo — não recebe aporte (buy and hold: nunca vende).' : undefined}
                        >
                          {money(r.aportar, 'BRL')}
                        </div>
                      )
                    ) : (
                      <div className="text-2xl font-bold text-gray-300">—</div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      {r ? (
                        <>
                          {pct(r.pctAntes)} → {pct(r.pctDepois)} · alvo {pct(r.alvo)}{' '}
                          <span className={statusColor}>({STATUS_LABEL[r.status]})</span>
                        </>
                      ) : (
                        <span className="text-amber-600">sem cotação do dólar</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-6 flex flex-col sm:flex-row justify-between gap-2 text-gray-700 font-semibold">
            <span>Patrimônio atual: {money(totalAtual, 'BRL')}</span>
            <span>Total a aportar: {money(totalAportar, 'BRL')}</span>
            <span>Após aporte: {money(totalAtual + aporteNum, 'BRL')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Rodar todos os testes e o build**

Run: `npm test`
Expected: todos PASS (format, distribution, usePersistentState, useExchangeRate, App).
Run: `npm run build`
Expected: build sem erro.

- [ ] **Step 6: Conferir na mão**

Run: `npm run dev`
Conferir em `http://localhost:5173/cerrado-calc/`: a barra mostra o dólar (ou "cotação em cache"); o card do SPHQ pede o saldo em US$ e mostra "Aportar agora" em US$ com "≈ R$"; com a cotação vazia (clicar "editar" e apagar), o SPHQ mostra "—" e os outros três seguem calculando.

- [ ] **Step 7: Commit**

```bash
git add src/assets.js src/App.jsx src/App.test.jsx
git commit -m "feat: SPHQ em dólar — conversão na borda, barra de cotação e card em US$/R$"
```

---

## Notas de verificação (self-review)

- **Cobertura do spec:** moeda por ativo em `assets.js` (Task 3); saldo do SPHQ em US$ (Task 3); cotação automática + cache + manual (Task 2); conversão na borda mantendo `computeDistribution` intocada (Task 3); card do SPHQ em US$ e R$ (Task 3); barra de cotação com fonte/loading (Task 3); rodapé em R$ (Task 3); `money(value, currency)` (Task 1). ✔
- **Princípios de UX do spec:** visibilidade (barra com fonte + loading — Task 3); prevenção de erro (SPHQ fora do cálculo sem cotação, nunca R$ 0 — Task 3); recuperação (banner acionável — Task 3); controle (manual + voltar ao automático + refresh — Tasks 2/3); reconhecer (≈ R$ ao lado do US$ — Task 3); consistência (`money` + layout idêntico — Tasks 1/3). ✔
- **Sem placeholders:** todos os steps têm código/comando reais. ✔
- **Consistência de tipos:** `useExchangeRate` retorna `{ rate, source, updatedAt, loading, error, manualRate, setManualRate, refresh }`, consumido igual na `App`. `money(value, currency)` usado com a mesma assinatura em ambos. `computeDistribution` recebe apenas números em R$. ✔
- **API em formato US:** a cotação da AwesomeAPI vem com ponto decimal, por isso usa `Number()` e não `parseNumber` (que é pt-BR). ✔
- **`computeDistribution` inalterada:** nenhum teste dela é tocado. ✔
