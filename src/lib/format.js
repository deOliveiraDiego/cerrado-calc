// Converte a entrada do usuário em número, respeitando a convenção pt-BR:
// '.' é separador de milhar e ',' é separador decimal.
// Ex.: "10.000" -> 10000, "1.234,56" -> 1234.56.
export function parseNumber(input) {
  if (typeof input === 'number') return Number.isFinite(input) ? input : 0;
  let s = String(input ?? '');
  s = s.replace(/[^\d.,]/g, ''); // mantém só dígitos e separadores
  s = s.replace(/\./g, ''); // remove os pontos de milhar
  const parts = s.split(',');
  if (parts.length > 1) {
    const dec = parts.pop(); // a última vírgula é o separador decimal
    s = parts.join('') + '.' + dec;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export const brl = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);

export const pct = (f) => `${(f * 100).toFixed(1)}%`;
