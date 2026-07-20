import { describe, it, expect } from 'vitest';
import { parseNumber, brl, pct, money, amount, maskCents } from './format.js';

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

describe('amount', () => {
  it('formata número com milhar e 2 casas, sem símbolo', () => {
    expect(amount(1000)).toBe('1.000,00');
    expect(amount(1234.56)).toBe('1.234,56');
    expect(amount(0)).toBe('0,00');
  });
  it('aceita string pt-BR e lixo', () => {
    expect(amount('5000')).toBe('5.000,00');
    expect(amount('1.234,56')).toBe('1.234,56');
    expect(amount('lixo')).toBe('0,00');
  });
});

describe('maskCents', () => {
  it('trata os dígitos como centavos', () => {
    expect(maskCents('50')).toBe('0,50');
    expect(maskCents('300000')).toBe('3.000,00');
    expect(maskCents('1234567')).toBe('12.345,67');
  });
  it('ignora não-dígitos e trata vazio como 0,00', () => {
    expect(maskCents('R$ 1.234,56')).toBe('1.234,56');
    expect(maskCents('')).toBe('0,00');
    expect(maskCents('0')).toBe('0,00');
  });
});

describe('money', () => {
  it('formata BRL com R$ e padrão pt-BR', () => {
    expect(money(1000, 'BRL')).toContain('1.000,00');
    expect(money(1000, 'BRL')).toContain('R$');
  });
  it('formata USD com US$ e padrão pt-BR', () => {
    expect(money(1000, 'USD')).toContain('1.000,00');
    expect(money(1000, 'USD')).toContain('US$');
  });
  it('assume BRL por padrão e trata lixo como 0', () => {
    expect(money(1234.56)).toContain('1.234,56');
    expect(money('lixo', 'USD')).toContain('0,00');
  });
});
