import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App.jsx';

vi.mock('./hooks/useExchangeRate.js', () => ({
  useExchangeRate: () => ({
    rate: 5, source: 'api', updatedAt: 1, loading: false, error: false,
    manualRate: '', setManualRate: vi.fn(), refresh: vi.fn(),
  }),
}));

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, '', '/');
});
afterEach(() => window.history.replaceState(null, '', '/'));

describe('App com saldos no hash da URL', () => {
  it('preenche os cards com os saldos do hash', async () => {
    window.history.replaceState(null, '', '/#AUPO11=26263.10&SPHQ=1830.42&Bitcoin=3264.86');
    render(<App />);
    expect(await screen.findByDisplayValue('26.263,10')).toBe(screen.getByLabelText('Quanto você tem AUPO11'));
    expect(screen.getByLabelText('Quanto você tem SPHQ')).toHaveValue('1.830,42');
    expect(screen.getByLabelText('Quanto você tem Bitcoin')).toHaveValue('3.264,86');
  });

  it('apaga o hash da URL depois de ler', async () => {
    window.history.replaceState(null, '', '/#Bitcoin=10');
    render(<App />);
    await screen.findByDisplayValue('10,00');
    expect(window.location.hash).toBe('');
  });

  it('mantém alvos salvos e ativos que não vieram no hash', async () => {
    window.localStorage.setItem('cerrado.targets', JSON.stringify({ AUPO11: '30', AUVP11: '40', SPHQ: '20', Bitcoin: '10' }));
    window.localStorage.setItem('cerrado.holdings', JSON.stringify({ AUPO11: '1,00', AUVP11: '500,00', SPHQ: '2,00', Bitcoin: '3,00' }));
    window.history.replaceState(null, '', '/#Bitcoin=10');
    render(<App />);
    await screen.findByDisplayValue('10,00');
    expect(screen.getByLabelText('Quanto você tem AUVP11')).toHaveValue('500,00');
    expect(screen.getByLabelText('Alvo AUPO11')).toHaveValue('30');
  });
});
