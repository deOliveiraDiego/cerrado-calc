import { DollarSign, TrendingUp, Bitcoin, Shield, RotateCcw, Eraser } from 'lucide-react';
import { ASSETS } from './assets.js';
import { computeDistribution } from './lib/distribution.js';
import { usePersistentState, isLocalStorageAvailable } from './hooks/usePersistentState.js';
import { brl, pct, parseNumber } from './lib/format.js';

const ICONS = { shield: Shield, trending: TrendingUp, bitcoin: Bitcoin };
const STATUS_LABEL = { acima: 'acima', abaixo: 'abaixo', ok: 'no alvo' };

// Mantém no estado o texto que o usuário digitou (só removendo caracteres
// inválidos), para não engolir a vírgula/ponto enquanto ele digita centavos.
// A conversão para número acontece só na hora do cálculo, via parseNumber.
const cleanNum = (v) => String(v).replace(/[^\d.,]/g, '');

const initialHoldings = Object.fromEntries(ASSETS.map((a) => [a.name, 0]));
const initialTargets = Object.fromEntries(ASSETS.map((a) => [a.name, a.defaultTarget]));
const storageOk = isLocalStorageAvailable();

export default function App() {
  const [holdings, setHoldings] = usePersistentState('cerrado.holdings', initialHoldings);
  const [targets, setTargets] = usePersistentState('cerrado.targets', initialTargets);
  const [aporte, setAporte] = usePersistentState('cerrado.aporte', 3000);

  const holdingsNum = Object.fromEntries(ASSETS.map((a) => [a.name, parseNumber(holdings[a.name])]));
  const targetsNum = Object.fromEntries(ASSETS.map((a) => [a.name, parseNumber(targets[a.name])]));
  const aporteNum = parseNumber(aporte);

  const rows = computeDistribution(holdingsNum, targetsNum, aporteNum);
  const byName = Object.fromEntries(rows.map((r) => [r.name, r]));
  const somaAlvos = ASSETS.reduce((a, x) => a + parseNumber(targets[x.name]), 0);
  const totalAtual = ASSETS.reduce((a, x) => a + parseNumber(holdings[x.name]), 0);
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
            <div className="mt-2 text-center text-gray-600 font-semibold">{brl(aporteNum)}</div>
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
              const statusColor = r.status === 'acima' ? 'text-red-600' : r.status === 'abaixo' ? 'text-emerald-600' : 'text-gray-500';
              const zeroPorAcima = r.aportar === 0 && r.status === 'acima';
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
                      Quanto você tem (R$)
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
                    <div
                      className="text-2xl font-bold"
                      style={{ color: asset.color }}
                      title={zeroPorAcima ? 'Já está acima do alvo — não recebe aporte (buy and hold: nunca vende).' : undefined}
                    >
                      {brl(r.aportar)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {pct(r.pctAntes)} → {pct(r.pctDepois)} · alvo {pct(r.alvo)} <span className={statusColor}>({STATUS_LABEL[r.status]})</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-6 flex flex-col sm:flex-row justify-between gap-2 text-gray-700 font-semibold">
            <span>Patrimônio atual: {brl(totalAtual)}</span>
            <span>Total a aportar: {brl(totalAportar)}</span>
            <span>Após aporte: {brl(totalAtual + aporteNum)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
