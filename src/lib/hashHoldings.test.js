import { describe, it, expect } from 'vitest';
import { parseHoldingsHash } from './hashHoldings.js';

const NAMES = ['AUPO11', 'AUVP11', 'SPHQ', 'Bitcoin'];

describe('parseHoldingsHash', () => {
  it('lê os saldos do hash (ponto decimal) e devolve no formato dos campos', () => {
    const out = parseHoldingsHash('#AUPO11=26263.10&AUVP11=15047.2&SPHQ=1830.42&Bitcoin=3264.86', NAMES);
    expect(out).toEqual({ AUPO11: '26.263,10', AUVP11: '15.047,20', SPHQ: '1.830,42', Bitcoin: '3.264,86' });
  });

  it('aceita só parte dos ativos', () => {
    expect(parseHoldingsHash('#Bitcoin=100', NAMES)).toEqual({ Bitcoin: '100,00' });
  });

  it('ignora chaves desconhecidas e valores inválidos ou negativos', () => {
    expect(parseHoldingsHash('#XPTO=1&AUPO11=abc&SPHQ=-5&Bitcoin=10', NAMES)).toEqual({ Bitcoin: '10,00' });
  });

  it('devolve null sem hash ou sem nenhum ativo válido', () => {
    expect(parseHoldingsHash('', NAMES)).toBeNull();
    expect(parseHoldingsHash('#', NAMES)).toBeNull();
    expect(parseHoldingsHash('#foo=1', NAMES)).toBeNull();
  });
});
