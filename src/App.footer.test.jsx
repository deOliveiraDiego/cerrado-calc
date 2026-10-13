import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
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

describe('Rodapé', () => {
  it('mostra amortização e total na carteira, que somam o aporte', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Aporte deste mês'), { target: { value: '300000' } });
    const footer = screen.getByText(/Patrimônio atual:/).parentElement;
    expect(within(footer).getByText(/Amortização:\s*R\$\s*600,00/)).toBeInTheDocument();
    expect(within(footer).getByText(/Total na carteira:\s*R\$\s*2\.400,00/)).toBeInTheDocument();
    expect(within(footer).queryByText(/Total a aportar/)).not.toBeInTheDocument();
  });
});
