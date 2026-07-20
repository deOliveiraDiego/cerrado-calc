import { describe, it, expect } from 'vitest';
import { parseNumber, brl, pct } from './format.js';

describe('parseNumber (pt-BR)', () => {
  it('interpreta ponto como separador de milhar', () => {
    expect(parseNumber('10.000')).toBe(10000);
    expect(parseNumber('1.000.000')).toBe(1000000);
  });
  it('interpreta vírgula como separador decimal', () => {
    expect(parseNumber('3000,50')).toBe(3000.5);
    expect(parseNumber('1.234,56')).toBe(1234.56);
  });
  it('lida com valores inteiros simples', () => {
    expect(parseNumber('3000')).toBe(3000);
  });
  it('ignora prefixos/lixo como R$ e espaços', () => {
    expect(parseNumber('R$ 1.500,00')).toBe(1500);
    expect(parseNumber(' 42 ')).toBe(42);
  });
  it('trata vazio e não-numérico como 0', () => {
    expect(parseNumber('')).toBe(0);
    expect(parseNumber('abc')).toBe(0);
    expect(parseNumber(null)).toBe(0);
    expect(parseNumber(undefined)).toBe(0);
  });
  it('aceita números já numéricos', () => {
    expect(parseNumber(2500)).toBe(2500);
    expect(parseNumber(3000.5)).toBe(3000.5);
    expect(parseNumber(NaN)).toBe(0);
  });
});

describe('brl', () => {
  it('formata em reais com milhar e centavos', () => {
    expect(brl(1000)).toContain('1.000,00');
    expect(brl(1234.56)).toContain('1.234,56');
    expect(brl('lixo')).toContain('0,00');
  });
});

describe('pct', () => {
  it('formata fração como percentual com 1 casa', () => {
    expect(pct(0.28)).toBe('28.0%');
    expect(pct(0.281)).toBe('28.1%');
    expect(pct(0)).toBe('0.0%');
  });
});
