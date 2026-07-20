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

export const money = (value, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(Number(value) || 0);

export const brl = (v) => money(v, 'BRL');

// Número formatado com milhar e 2 casas decimais, sem símbolo de moeda.
// Aceita número ou string pt-BR (ex.: "1.234,56").
export const amount = (value) => {
  const n = typeof value === 'number' ? value : parseNumber(value);
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
};

// Máscara estilo centavos: os dígitos digitados entram pelos centavos
// (ex.: "300000" -> "3.000,00", "50" -> "0,50"). Vazio -> "0,00".
export const maskCents = (input) => {
  const digits = String(input ?? '').replace(/\D/g, '');
  const n = digits ? parseInt(digits, 10) / 100 : 0;
  return amount(n);
};

export const pct = (f) => `${(f * 100).toFixed(1)}%`;
