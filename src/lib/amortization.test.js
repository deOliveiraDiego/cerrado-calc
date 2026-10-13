import { describe, it, expect } from 'vitest';
import { splitAporte, AMORTIZACAO_MINIMA } from './amortization.js';

describe('splitAporte', () => {
  it('separa o % do aporte em reais inteiros e manda o resto para a carteira', () => {
    expect(splitAporte(3000, 20)).toEqual({ amortizacao: 600, carteira: 2400, abaixoMinimo: false });
  });

  it('arredonda a amortização para baixo e o centavo que sobra vai para a carteira', () => {
    // 20% de 3.061,85 = 612,37 -> 612
    expect(splitAporte(3061.85, 20)).toEqual({ amortizacao: 612, carteira: 2449.85, abaixoMinimo: false });
  });

  it('zera a amortização quando o % dá menos que o mínimo do Itaú', () => {
    expect(splitAporte(400, 20)).toEqual({ amortizacao: 0, carteira: 400, abaixoMinimo: true });
  });

  it('aceita exatamente o mínimo', () => {
    expect(splitAporte(500, 20)).toEqual({ amortizacao: AMORTIZACAO_MINIMA, carteira: 400, abaixoMinimo: false });
  });

  it('com 0% não amortiza e não avisa', () => {
    expect(splitAporte(3000, 0)).toEqual({ amortizacao: 0, carteira: 3000, abaixoMinimo: false });
  });

  it('com aporte 0 não amortiza e não avisa', () => {
    expect(splitAporte(0, 20)).toEqual({ amortizacao: 0, carteira: 0, abaixoMinimo: false });
  });

  it('limita o % entre 0 e 100 e ignora entrada inválida', () => {
    expect(splitAporte(1000, 150)).toEqual({ amortizacao: 1000, carteira: 0, abaixoMinimo: false });
    expect(splitAporte(1000, -10)).toEqual({ amortizacao: 0, carteira: 1000, abaixoMinimo: false });
    expect(splitAporte(1000, NaN)).toEqual({ amortizacao: 0, carteira: 1000, abaixoMinimo: false });
  });

  it('a soma das partes é sempre exatamente o aporte', () => {
    for (const aporte of [0.01, 99.99, 333.33, 1234.56, 9999.99]) {
      for (const p of [0, 7, 20, 33, 100]) {
        const { amortizacao, carteira } = splitAporte(aporte, p);
        expect(Math.round((amortizacao + carteira) * 100)).toBe(Math.round(aporte * 100));
      }
    }
  });
});
