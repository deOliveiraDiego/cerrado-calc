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
