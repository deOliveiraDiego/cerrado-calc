import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App.jsx';

const { fx } = vi.hoisted(() => ({ fx: { current: null } }));
vi.mock('./hooks/useExchangeRate.js', () => ({
  useExchangeRate: () => fx.current,
}));

function setFx(partial) {
  fx.current = {
    rate: 5,
    source: 'api',
    updatedAt: 1,
    loading: false,
    error: false,
    manualRate: '',
    setManualRate: vi.fn(),
    refresh: vi.fn(),
    ...partial,
  };
}

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem('cerrado.amortizacaoPct', JSON.stringify('0'));
  setFx();
});

describe('% de amortização', () => {
  const pctInput = () => screen.getByLabelText('Amortização (% do aporte)');

  it('limita valores acima de 100 a 100', () => {
    render(<App />);
    fireEvent.change(pctInput(), { target: { value: '150' } });
    expect(pctInput()).toHaveValue('100');
  });

  it('mantém valores válidos', () => {
    render(<App />);
    fireEvent.change(pctInput(), { target: { value: '35' } });
    expect(pctInput()).toHaveValue('35');
  });

  it('permite apagar o campo', () => {
    render(<App />);
    fireEvent.change(pctInput(), { target: { value: '35' } });
    fireEvent.change(pctInput(), { target: { value: '' } });
    expect(pctInput()).toHaveValue('');
  });
});
