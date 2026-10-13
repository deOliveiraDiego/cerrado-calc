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
  // Sem pré-definir cerrado.amortizacaoPct: vale o padrão de 20%.
  setFx();
});

describe('App - caixa de amortização', () => {
  it('mostra o próximo passo quando há amortização', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Aporte deste mês'), { target: { value: '300000' } });
    expect(screen.getByText(/Pague pelo app Itaú/)).toBeInTheDocument();
  });

  it('abaixo do mínimo mostra o aviso e esconde o próximo passo', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Aporte deste mês'), { target: { value: '40000' } });
    expect(screen.getByText(/abaixo do mínimo de/)).toBeInTheDocument();
    expect(screen.queryByText(/Pague pelo app Itaú/)).not.toBeInTheDocument();
  });
});
