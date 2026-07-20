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
