// Mínimo aceito pelo Itaú para amortização extraordinária.
export const AMORTIZACAO_MINIMA = 100;

// Separa a fatia do aporte que vai para a amortização do financiamento.
// A amortização é o % do aporte em reais inteiros (arredondado para baixo);
// se der menos que o mínimo, vira 0 e tudo vai para a carteira.
// Trabalha em centavos para que amortizacao + carteira === aporte.
export function splitAporte(aporte, percent) {
  const aporteCents = Math.max(0, Math.round((Number(aporte) || 0) * 100));
  const p = Number(percent);
  const pctValido = Number.isFinite(p) ? Math.min(100, Math.max(0, p)) : 0;

  const reais = Math.floor((aporteCents * pctValido) / 100 / 100);
  const abaixoMinimo = reais < AMORTIZACAO_MINIMA && aporteCents > 0 && pctValido > 0;
  const amortizacao = abaixoMinimo ? 0 : reais;

  return {
    amortizacao,
    carteira: (aporteCents - amortizacao * 100) / 100,
    abaixoMinimo,
  };
}
