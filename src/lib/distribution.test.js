import { describe, it, expect } from 'vitest';
import { computeDistribution, normalizeTargets, clampNonNegative } from './distribution.js';

const targets = { AUPO11: 28, AUVP11: 39, SPHQ: 19, Bitcoin: 14 };

describe('clampNonNegative', () => {
  it('zera negativos e lixo', () => {
    expect(clampNonNegative(-5)).toBe(0);
    expect(clampNonNegative('abc')).toBe(0);
    expect(clampNonNegative(10)).toBe(10);
  });
});

describe('normalizeTargets', () => {
  it('normaliza para frações somando 1 mesmo se soma != 100', () => {
    const f = normalizeTargets({ A: 10, B: 10 });
    expect(f.A).toBeCloseTo(0.5);
    expect(f.A + f.B).toBeCloseTo(1);
  });
  it('retorna null quando tudo é zero', () => {
    expect(normalizeTargets({ A: 0, B: 0 })).toBeNull();
  });
});

describe('computeDistribution', () => {
  it('carteira zerada divide o aporte pelos pesos-alvo', () => {
    const r = computeDistribution({ AUPO11: 0, AUVP11: 0, SPHQ: 0, Bitcoin: 0 }, targets, 1000);
    const by = Object.fromEntries(r.map((x) => [x.name, x.aportar]));
    expect(by.AUPO11).toBeCloseTo(280);
    expect(by.AUVP11).toBeCloseTo(390);
    expect(by.SPHQ).toBeCloseTo(190);
    expect(by.Bitcoin).toBeCloseTo(140);
  });

  it('manda 0 para ativo acima do alvo e rebalanceia o resto', () => {
    const holdings = { AUPO11: 280, AUVP11: 390, SPHQ: 190, Bitcoin: 300 };
    const r = computeDistribution(holdings, targets, 100);
    const by = Object.fromEntries(r.map((x) => [x.name, x.aportar]));
    expect(by.Bitcoin).toBe(0);
    expect(by.AUVP11).toBeGreaterThan(by.AUPO11);
    expect(by.AUVP11).toBeGreaterThan(by.SPHQ);
    expect(by.AUPO11 + by.AUVP11 + by.SPHQ + by.Bitcoin).toBeCloseTo(100);
  });

  it('a soma dos aportes sempre bate com o aporte', () => {
    const r = computeDistribution({ AUPO11: 1000, AUVP11: 50, SPHQ: 0, Bitcoin: 0 }, targets, 777);
    expect(r.reduce((a, x) => a + x.aportar, 0)).toBeCloseTo(777);
  });

  it('aporte 0 retorna tudo zero', () => {
    const r = computeDistribution({ AUPO11: 280, AUVP11: 390, SPHQ: 190, Bitcoin: 140 }, targets, 0);
    expect(r.every((x) => x.aportar === 0)).toBe(true);
  });

  it('marca status pela alocação atual', () => {
    const holdings = { AUPO11: 280, AUVP11: 390, SPHQ: 190, Bitcoin: 300 };
    const r = computeDistribution(holdings, targets, 100);
    expect(r.find((x) => x.name === 'Bitcoin').status).toBe('acima');
  });

  it('cada aporte é arredondado a centavos (2 casas)', () => {
    const even = { A: 25, B: 25, C: 25, D: 25 };
    const r = computeDistribution({ A: 0, B: 0, C: 0, D: 0 }, even, 1000);
    for (const x of r) {
      const cents = x.aportar * 100;
      expect(Math.abs(cents - Math.round(cents))).toBeLessThan(1e-9);
    }
  });

  it('a soma dos aportes bate EXATAMENTE com o aporte (sem sobra de centavo)', () => {
    // 1000 / 3 = 333,333... exige ajuste da última fração
    const even = { A: 25, B: 25, C: 25, D: 25 };
    const holdings = { A: 0, B: 0, C: 0, D: 100000 }; // D muito acima -> recebe 0
    const r = computeDistribution(holdings, even, 1000);
    const soma = r.reduce((a, x) => a + x.aportar, 0);
    expect(soma).toBe(1000);
    expect(r.find((x) => x.name === 'D').aportar).toBe(0);
  });

  it('não cria centavos em ativos que deveriam receber 0', () => {
    const holdings = { AUPO11: 280, AUVP11: 390, SPHQ: 190, Bitcoin: 300 };
    const r = computeDistribution(holdings, targets, 100);
    expect(r.find((x) => x.name === 'Bitcoin').aportar).toBe(0);
    expect(r.reduce((a, x) => a + x.aportar, 0)).toBe(100);
  });
});
