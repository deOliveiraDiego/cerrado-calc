# Calculadora do Cerrado — Rebalanceamento por Aporte — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar a calculadora estática em uma que direciona o aporte do mês para os ativos abaixo do alvo, considerando a carteira atual, sem sugerir vendas.

**Architecture:** Lógica pura isolada (`computeDistribution`) + hook de persistência (`usePersistentState`) + um único componente React (`App`) que consome ambos. Publicável como Claude Artifact ao final.

**Tech Stack:** Vite + React 18 (JSX), Tailwind v4 (`@tailwindcss/vite`), lucide-react, Vitest + Testing Library (jsdom).

## Global Constraints

- Buy and hold: o app **nunca** sugere vender; aportes são sempre ≥ 0.
- Ativos fixos nesta fase: AUPO11 (alvo 28%), AUVP11 (39%), SPHQ (19%), Bitcoin (14%).
- Pesos-alvo editáveis na tela; se a soma ≠ 100%, avisar e normalizar no cálculo.
- Distribuição: `aportar_i = aporte × (falta_i / somaFaltas)`, `falta_i = max(0, novoTotal×alvo_i − atual_i)`. Se `aporte=0` ou `somaFaltas=0`, todos `aportar_i=0`.
- Persistência de `holdings`, `targets` e `aporte` em localStorage.
- Moeda em BRL (`Intl.NumberFormat('pt-BR')`), percentuais com 1 casa.

---

## File Structure

- `package.json`, `vite.config.js`, `index.html`, `src/main.jsx`, `src/index.css`, `src/test/setup.js` — scaffold (Task 1)
- `src/App.jsx` — UI (placeholder na Task 1, versão final na Task 4)
- `src/lib/distribution.js` + `src/lib/distribution.test.js` — lógica pura (Task 2)
- `src/hooks/usePersistentState.js` + `.test.js` — persistência (Task 3)
- `src/assets.js` — constante dos 4 ativos (Task 4)
- `src/App.test.jsx` — testes de integração da UI (Task 4)

---

### Task 1: Scaffold do projeto (Vite + React + Tailwind + Vitest)

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `src/main.jsx`, `src/index.css`, `src/test/setup.js`, `src/App.jsx`
- Test: `src/App.test.jsx` (smoke, substituído na Task 4)

**Interfaces:**
- Produces: projeto que roda `npm run dev`, `npm run build` e `npm test`; componente `App` default export placeholder.

- [ ] **Step 1: Criar `package.json`**

```json
{
  "name": "cerrado-calc",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "lucide-react": "^0.400.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.0.0",
    "@testing-library/dom": "^10.0.0",
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/react": "^16.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "jsdom": "^24.0.0",
    "tailwindcss": "^4.0.0",
    "vite": "^5.3.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Criar `vite.config.js`**

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/cerrado-calc/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
  },
});
```

> `base` deve casar com o nome do repositório no GitHub (`/cerrado-calc/`) para o app funcionar em `https://<usuario>.github.io/cerrado-calc/`.

- [ ] **Step 3: Criar `index.html`, `src/index.css`, `src/test/setup.js`, `src/main.jsx`**

`index.html`:
```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Calculadora do Cerrado</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

`src/index.css`:
```css
@import "tailwindcss";
```

`src/test/setup.js`:
```js
import '@testing-library/jest-dom';
```

`src/main.jsx`:
```jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 4: Criar placeholder `src/App.jsx`**

```jsx
export default function App() {
  return <h1>Calculadora do Cerrado</h1>;
}
```

- [ ] **Step 5: Instalar dependências**

Run: `npm install`
Expected: instala sem erros; cria `node_modules/` e `package-lock.json`.

- [ ] **Step 6: Escrever teste smoke `src/App.test.jsx`**

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App.jsx';

describe('App (smoke)', () => {
  it('renderiza o título', () => {
    render(<App />);
    expect(screen.getByText('Calculadora do Cerrado')).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Rodar teste e build**

Run: `npm test`
Expected: 1 teste PASS.
Run: `npm run build`
Expected: build conclui sem erro.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold vite+react+tailwind+vitest"
```

---

### Task 2: Lógica pura de distribuição (`computeDistribution`)

**Files:**
- Create: `src/lib/distribution.js`
- Test: `src/lib/distribution.test.js`

**Interfaces:**
- Produces:
  - `clampNonNegative(n): number` — números inválidos/negativos viram 0.
  - `normalizeTargets(targets: {[name]:number}): {[name]:number} | null` — frações somando 1, ou null se tudo 0.
  - `computeDistribution(holdings: {[name]:number}, targets: {[name]:number}, aporte: number): Array<{ name, atual, aportar, pctAntes, pctDepois, alvo, status }>` — `status` ∈ `'abaixo' | 'acima' | 'ok'` (comparado ao alvo pela alocação **atual**).

- [ ] **Step 1: Escrever testes `src/lib/distribution.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { computeDistribution, normalizeTargets, clampNonNegative } from './distribution.js';

const targets = { AUPO11: 28, AUVP11: 39, SPHQ: 19, Bitcoin: 14 };

describe('clampNonNegative', () => {
  it('zera negativos e lixo', () => {
    expect(clampNonNegative(-5)).toBe(0);
    expect(clampNonNegative('abc')).toBe(0);
    expect(clampNonNegative(10)).toBe(10);
  });
});

describe('normalizeTargets', () => {
  it('normaliza para frações somando 1 mesmo se soma != 100', () => {
    const f = normalizeTargets({ A: 10, B: 10 });
    expect(f.A).toBeCloseTo(0.5);
    expect(f.A + f.B).toBeCloseTo(1);
  });
  it('retorna null quando tudo é zero', () => {
    expect(normalizeTargets({ A: 0, B: 0 })).toBeNull();
  });
});

describe('computeDistribution', () => {
  it('carteira zerada divide o aporte pelos pesos-alvo', () => {
    const r = computeDistribution({ AUPO11: 0, AUVP11: 0, SPHQ: 0, Bitcoin: 0 }, targets, 1000);
    const by = Object.fromEntries(r.map((x) => [x.name, x.aportar]));
    expect(by.AUPO11).toBeCloseTo(280);
    expect(by.AUVP11).toBeCloseTo(390);
    expect(by.SPHQ).toBeCloseTo(190);
    expect(by.Bitcoin).toBeCloseTo(140);
  });

  it('manda 0 para ativo acima do alvo e rebalanceia o resto', () => {
    const holdings = { AUPO11: 280, AUVP11: 390, SPHQ: 190, Bitcoin: 300 };
    const r = computeDistribution(holdings, targets, 100);
    const by = Object.fromEntries(r.map((x) => [x.name, x.aportar]));
    expect(by.Bitcoin).toBe(0);
    expect(by.AUVP11).toBeGreaterThan(by.AUPO11);
    expect(by.AUVP11).toBeGreaterThan(by.SPHQ);
    expect(by.AUPO11 + by.AUVP11 + by.SPHQ + by.Bitcoin).toBeCloseTo(100);
  });

  it('a soma dos aportes sempre bate com o aporte', () => {
    const r = computeDistribution({ AUPO11: 1000, AUVP11: 50, SPHQ: 0, Bitcoin: 0 }, targets, 777);
    expect(r.reduce((a, x) => a + x.aportar, 0)).toBeCloseTo(777);
  });

  it('aporte 0 retorna tudo zero', () => {
    const r = computeDistribution({ AUPO11: 280, AUVP11: 390, SPHQ: 190, Bitcoin: 140 }, targets, 0);
    expect(r.every((x) => x.aportar === 0)).toBe(true);
  });

  it('marca status pela alocação atual', () => {
    const holdings = { AUPO11: 280, AUVP11: 390, SPHQ: 190, Bitcoin: 300 };
    const r = computeDistribution(holdings, targets, 100);
    expect(r.find((x) => x.name === 'Bitcoin').status).toBe('acima');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- distribution`
Expected: FAIL ("does not provide an export named ...").

- [ ] **Step 3: Implementar `src/lib/distribution.js`**

```js
export function clampNonNegative(n) {
  const x = Number(n);
  return Number.isFinite(x) && x > 0 ? x : 0;
}

// Frações somando 1, ou null se todos os alvos forem 0.
export function normalizeTargets(targets) {
  const keys = Object.keys(targets);
  const sum = keys.reduce((a, k) => a + clampNonNegative(targets[k]), 0);
  if (sum === 0) return null;
  const out = {};
  for (const k of keys) out[k] = clampNonNegative(targets[k]) / sum;
  return out;
}

// holdings: { name: R$ }, targets: { name: percentual }, aporte: R$
export function computeDistribution(holdings, targets, aporte) {
  const keys = Object.keys(targets);
  const frac = normalizeTargets(targets);
  const atual = {};
  for (const k of keys) atual[k] = clampNonNegative(holdings[k]);
  const totalAtual = keys.reduce((a, k) => a + atual[k], 0);
  const ap = clampNonNegative(aporte);
  const novoTotal = totalAtual + ap;

  const falta = {};
  for (const k of keys) {
    const ideal = frac ? novoTotal * frac[k] : 0;
    falta[k] = Math.max(0, ideal - atual[k]);
  }
  const somaFaltas = keys.reduce((a, k) => a + falta[k], 0);

  return keys.map((k) => {
    const aportar = ap > 0 && somaFaltas > 0 ? ap * (falta[k] / somaFaltas) : 0;
    const depois = atual[k] + aportar;
    const alvo = frac ? frac[k] : 0;
    const pctAntes = totalAtual > 0 ? atual[k] / totalAtual : 0;
    const pctDepois = novoTotal > 0 ? depois / novoTotal : 0;
    let status = 'ok';
    if (pctAntes < alvo - 0.005) status = 'abaixo';
    else if (pctAntes > alvo + 0.005) status = 'acima';
    return { name: k, atual: atual[k], aportar, pctAntes, pctDepois, alvo, status };
  });
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- distribution`
Expected: todos PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/distribution.js src/lib/distribution.test.js
git commit -m "feat: lógica de distribuição do aporte por defasagem"
```

---

### Task 3: Hook de persistência (`usePersistentState`)

**Files:**
- Create: `src/hooks/usePersistentState.js`
- Test: `src/hooks/usePersistentState.test.js`

**Interfaces:**
- Produces: `usePersistentState(key: string, initialValue: T): [T, (v: T) => void]` — igual a `useState`, mas lê/escreve em `localStorage[key]` (JSON).

- [ ] **Step 1: Escrever testes `src/hooks/usePersistentState.test.js`**

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePersistentState } from './usePersistentState.js';

beforeEach(() => window.localStorage.clear());

describe('usePersistentState', () => {
  it('usa o valor inicial quando nada está salvo', () => {
    const { result } = renderHook(() => usePersistentState('k', { a: 1 }));
    expect(result.current[0]).toEqual({ a: 1 });
  });
  it('persiste atualizações no localStorage', () => {
    const { result } = renderHook(() => usePersistentState('k', 0));
    act(() => result.current[1](5));
    expect(JSON.parse(window.localStorage.getItem('k'))).toBe(5);
  });
  it('lê o valor salvo na inicialização', () => {
    window.localStorage.setItem('k', JSON.stringify(42));
    const { result } = renderHook(() => usePersistentState('k', 0));
    expect(result.current[0]).toBe(42);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- usePersistentState`
Expected: FAIL (módulo/export inexistente).

- [ ] **Step 3: Implementar `src/hooks/usePersistentState.js`**

```js
import { useEffect, useState } from 'react';

export function usePersistentState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw != null ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* localStorage indisponível/cheio: ignora */
    }
  }, [key, value]);
  return [value, setValue];
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- usePersistentState`
Expected: todos PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/usePersistentState.js src/hooks/usePersistentState.test.js
git commit -m "feat: hook usePersistentState (localStorage)"
```

---

### Task 4: UI final (`App`) + constante de ativos

**Files:**
- Create: `src/assets.js`
- Modify: `src/App.jsx` (substitui o placeholder), `src/App.test.jsx` (substitui o smoke)

**Interfaces:**
- Consumes: `computeDistribution` (Task 2), `usePersistentState` (Task 3).
- Produces: `App` default export — UI completa.

- [ ] **Step 1: Criar `src/assets.js`**

```js
export const ASSETS = [
  { name: 'AUPO11', fullName: 'ETF Renda Fixa (Selic + IPCA+)', type: 'ETF Renda Fixa', risk: 'Baixo', color: '#9b59b6', icon: 'shield', defaultTarget: 28 },
  { name: 'AUVP11', fullName: 'ETF Ações Fundamentalistas', type: 'ETF Ações BR', risk: 'Médio', color: '#f39c12', icon: 'trending', defaultTarget: 39 },
  { name: 'SPHQ', fullName: 'Invesco S&P 500 Quality ETF', type: 'ETF Internacional (Quality)', risk: 'Médio-Alto', color: '#3498db', icon: 'trending', defaultTarget: 19 },
  { name: 'Bitcoin', fullName: 'Bitcoin (BTC)', type: 'Criptomoeda', risk: 'Alto', color: '#f1c40f', icon: 'bitcoin', defaultTarget: 14 },
];
```

- [ ] **Step 2: Substituir o teste `src/App.test.jsx`**

```jsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App.jsx';

beforeEach(() => window.localStorage.clear());

describe('App', () => {
  it('renderiza os quatro ativos', () => {
    render(<App />);
    expect(screen.getByText('AUPO11')).toBeInTheDocument();
    expect(screen.getByText('Bitcoin')).toBeInTheDocument();
    expect(screen.getAllByText(/Aportar agora/).length).toBe(4);
  });

  it('não aporta em ativo muito acima do alvo', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Valor atual Bitcoin'), { target: { value: '10000' } });
    fireEvent.change(screen.getByLabelText('Aporte deste mês'), { target: { value: '1000' } });
    // O card do Bitcoin exibe status 'acima'
    expect(screen.getByText(/\(acima\)/)).toBeInTheDocument();
  });

  it('avisa quando a soma dos alvos != 100', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Alvo AUPO11'), { target: { value: '50' } });
    expect(screen.getByText(/soma dos alvos/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npm test -- App`
Expected: FAIL (labels/textos ainda não existem).

- [ ] **Step 4: Implementar `src/App.jsx`**

```jsx
import { DollarSign, TrendingUp, Bitcoin, Shield } from 'lucide-react';
import { ASSETS } from './assets.js';
import { computeDistribution } from './lib/distribution.js';
import { usePersistentState } from './hooks/usePersistentState.js';

const ICONS = { shield: Shield, trending: TrendingUp, bitcoin: Bitcoin };

const brl = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);
const pct = (f) => `${(f * 100).toFixed(1)}%`;
const num = (e) => Number(String(e.target.value).replace(/[^\d.,]/g, '').replace(',', '.')) || 0;

const initialHoldings = Object.fromEntries(ASSETS.map((a) => [a.name, 0]));
const initialTargets = Object.fromEntries(ASSETS.map((a) => [a.name, a.defaultTarget]));

export default function App() {
  const [holdings, setHoldings] = usePersistentState('cerrado.holdings', initialHoldings);
  const [targets, setTargets] = usePersistentState('cerrado.targets', initialTargets);
  const [aporte, setAporte] = usePersistentState('cerrado.aporte', 3000);

  const rows = computeDistribution(holdings, targets, aporte);
  const byName = Object.fromEntries(rows.map((r) => [r.name, r]));
  const somaAlvos = ASSETS.reduce((a, x) => a + (Number(targets[x.name]) || 0), 0);
  const totalAtual = ASSETS.reduce((a, x) => a + (Number(holdings[x.name]) || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-6 sm:p-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">Calculadora do Cerrado</h1>
            <p className="text-gray-600">Aporte direcionado aos ativos abaixo do alvo — buy and hold, sem vender.</p>
          </div>

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
                value={aporte}
                onChange={(e) => setAporte(num(e))}
                className="w-full pl-12 pr-4 py-4 text-2xl font-bold text-center border-2 border-purple-300 rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-400"
              />
            </div>
            <div className="mt-2 text-center text-gray-600 font-semibold">{brl(aporte)}</div>
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
              const statusColor = r.status === 'acima' ? 'text-red-600' : r.status === 'abaixo' ? 'text-emerald-600' : 'text-gray-500';
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
                      Valor atual (R$)
                      <input
                        aria-label={`Valor atual ${asset.name}`}
                        type="text"
                        value={holdings[asset.name]}
                        onChange={(e) => setHoldings({ ...holdings, [asset.name]: num(e) })}
                        className="mt-1 w-full px-3 py-2 border rounded-lg"
                      />
                    </label>
                    <label className="text-sm text-gray-600">
                      Alvo (%)
                      <input
                        aria-label={`Alvo ${asset.name}`}
                        type="text"
                        value={targets[asset.name]}
                        onChange={(e) => setTargets({ ...targets, [asset.name]: num(e) })}
                        className="mt-1 w-full px-3 py-2 border rounded-lg"
                      />
                    </label>
                  </div>

                  <div className="pt-3 border-t border-gray-100">
                    <div className="text-sm text-gray-500">Aportar agora</div>
                    <div className="text-2xl font-bold" style={{ color: asset.color }}>{brl(r.aportar)}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {pct(r.pctAntes)} → {pct(r.pctDepois)} · alvo {pct(r.alvo)} <span className={statusColor}>({r.status})</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-6 flex flex-col sm:flex-row justify-between gap-2 text-gray-700 font-semibold">
            <span>Patrimônio atual: {brl(totalAtual)}</span>
            <span>Após aporte: {brl(totalAtual + (Number(aporte) || 0))}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Rodar todos os testes e o build**

Run: `npm test`
Expected: todos PASS (distribution, usePersistentState, App).
Run: `npm run build`
Expected: build sem erro.

- [ ] **Step 6: Rodar o app e conferir na mão**

Run: `npm run dev`
Conferir: digitar carteira com Bitcoin acima de 14% → card do Bitcoin mostra "Aportar agora R$ 0,00" e status "(acima)"; recarregar a página mantém os valores.

- [ ] **Step 7: Commit**

```bash
git add src/assets.js src/App.jsx src/App.test.jsx
git commit -m "feat: UI de rebalanceamento por aporte com alvos editáveis e persistência"
```

---

### Task 5: Deploy estático no GitHub Pages

**Files:**
- Create: `.github/workflows/deploy.yml`, `public/.nojekyll`

**Interfaces:**
- Consumes: `npm run build` (Task 1) gerando `dist/` com `base: '/cerrado-calc/'`.
- Produces: site publicado em `https://<usuario>.github.io/cerrado-calc/` a cada push na `main`.

- [ ] **Step 1: Criar `public/.nojekyll`**

Arquivo vazio (evita o Jekyll do Pages ignorar pastas iniciadas com `_`). O Vite copia `public/` para `dist/` no build.

```bash
mkdir -p public && touch public/.nojekyll
```

- [ ] **Step 2: Criar o workflow `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: Verificar o build com o `base` de produção**

Run: `npm run build`
Expected: build sem erro; conferir em `dist/index.html` que os assets referenciam `/cerrado-calc/assets/...`.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy.yml public/.nojekyll
git commit -m "ci: deploy estático no GitHub Pages via Actions"
```

- [ ] **Step 5: Ativar o Pages no repositório (passo manual do Diego)**

No GitHub: criar o repo `cerrado-calc`, dar `git push`, e em **Settings → Pages → Build and deployment → Source: GitHub Actions**. O primeiro push na `main` publica o site.

---

## Notas de verificação (self-review)

- **Cobertura do spec:** entradas de carteira + aporte (Task 4), alvos editáveis + aviso de soma (Task 4), algoritmo de defasagem (Task 2), saída com % antes/depois e status (Tasks 2+4), localStorage (Task 3), visual mantido (Task 4), carteira zerada = repartição por peso (teste na Task 2), deploy estático no GitHub Pages (Task 5). ✔
- **Sem placeholders:** todos os steps têm código/comando reais. ✔
- **Consistência de tipos:** `computeDistribution` retorna `{name, atual, aportar, pctAntes, pctDepois, alvo, status}`, consumido igual na `App`. `usePersistentState(key, initial)` usado 3x com a mesma assinatura. ✔
- **Fora de escopo (fase 2):** sistema de notas que gera os alvos; venda de ativos; cotação em tempo real; adicionar/remover ativos pela UI.
