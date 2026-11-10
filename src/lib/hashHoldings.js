import { amount } from './format.js';

// Lê saldos vindos no hash da URL (ex.: "#AUPO11=26263.10&Bitcoin=3264.86"),
// com ponto decimal, e devolve no formato pt-BR dos campos ("26.263,10").
// Ignora ativos desconhecidos e valores inválidos ou negativos.
// Devolve null quando não há nenhum saldo válido.
export function parseHoldingsHash(hash, assetNames) {
  const params = new URLSearchParams(String(hash ?? '').replace(/^#/, ''));
  const out = {};
  for (const name of assetNames) {
    const raw = params.get(name);
    if (raw == null || raw.trim() === '') continue;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) continue;
    out[name] = amount(n);
  }
  return Object.keys(out).length > 0 ? out : null;
}
