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

// Arredonda os valores brutos para centavos com o método do maior resto,
// garantindo que a soma final bata EXATAMENTE com o total (o aporte).
// Só distribui os centavos que sobram entre ativos com valor bruto > 0,
// então ativos que deveriam receber 0 permanecem em 0.
function roundToCents(raw, keys, total) {
  const targetCents = Math.round(total * 100);
  const cents = {};
  let used = 0;
  for (const k of keys) {
    cents[k] = Math.floor(raw[k] * 100);
    used += cents[k];
  }
  let leftover = targetCents - used;
  const candidatos = keys
    .filter((k) => raw[k] > 0)
    .map((k) => ({ k, resto: raw[k] * 100 - Math.floor(raw[k] * 100) }))
    .sort((a, b) => b.resto - a.resto);
  for (let i = 0; leftover > 0 && candidatos.length > 0; i++) {
    cents[candidatos[i % candidatos.length].k] += 1;
    leftover -= 1;
  }
  const out = {};
  for (const k of keys) out[k] = cents[k] / 100;
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

  const raw = {};
  for (const k of keys) {
    raw[k] = ap > 0 && somaFaltas > 0 ? ap * (falta[k] / somaFaltas) : 0;
  }
  const aportarPorAtivo = roundToCents(raw, keys, ap);

  return keys.map((k) => {
    const aportar = aportarPorAtivo[k];
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
