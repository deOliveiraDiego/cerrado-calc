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
  setFx();
});

describe('App', () => {
  it('renderiza os quatro ativos', () => {
    render(<App />);
    expect(screen.getByText('AUPO11')).toBeInTheDocument();
    expect(screen.getByText('Bitcoin')).toBeInTheDocument();
    expect(screen.getAllByText(/Aportar agora/).length).toBe(4);
  });

  it('não aporta em ativo muito acima do alvo', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Quanto você tem Bitcoin'), { target: { value: '1000000' } });
    fireEvent.change(screen.getByLabelText('Aporte deste mês'), { target: { value: '100000' } });
    // O card do Bitcoin exibe status 'acima'
    expect(screen.getByText(/\(acima\)/)).toBeInTheDocument();
  });

  it('avisa quando a soma dos alvos != 100', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Alvo AUPO11'), { target: { value: '50' } });
    expect(screen.getByText(/soma dos alvos/i)).toBeInTheDocument();
  });

  it('usa inputmode decimal nos campos numéricos', () => {
    render(<App />);
    expect(screen.getByLabelText('Aporte deste mês')).toHaveAttribute('inputmode', 'decimal');
    expect(screen.getByLabelText('Quanto você tem AUPO11')).toHaveAttribute('inputmode', 'decimal');
    expect(screen.getByLabelText('Alvo AUPO11')).toHaveAttribute('inputmode', 'decimal');
  });

  it('aplica a máscara de dinheiro (milhar/centavos) ao digitar', () => {
    render(<App />);
    const inp = screen.getByLabelText('Quanto você tem Bitcoin');
    fireEvent.change(inp, { target: { value: '1234567' } });
    expect(inp).toHaveValue('12.345,67');
  });

  it('restaura os alvos padrão', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Alvo AUPO11'), { target: { value: '50' } });
    expect(screen.getByText(/soma dos alvos/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Restaurar alvos padrão'));
    expect(screen.queryByText(/soma dos alvos/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Alvo AUPO11')).toHaveValue('28');
  });

  it('zera a carteira', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Quanto você tem Bitcoin'), { target: { value: '1000000' } });
    expect(screen.getByLabelText('Quanto você tem Bitcoin')).toHaveValue('10.000,00');
    fireEvent.click(screen.getByText('Zerar carteira'));
    expect(screen.getByLabelText('Quanto você tem Bitcoin')).toHaveValue('0,00');
  });

  it('permite digitar centavos pela máscara', () => {
    render(<App />);
    const inp = screen.getByLabelText('Quanto você tem AUPO11');
    fireEvent.change(inp, { target: { value: '123456' } });
    expect(inp).toHaveValue('1.234,56');
    fireEvent.change(screen.getByLabelText('Aporte deste mês'), { target: { value: '0' } });
    expect(screen.getByText(/Patrimônio atual:\s*R\$\s*1\.234,56/)).toBeInTheDocument();
  });

  it('mostra o total a aportar igual ao aporte', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Aporte deste mês'), { target: { value: '100000' } });
    // carteira zerada + alvos somando 100% => total distribuído = R$ 1.000,00
    expect(screen.getByText(/Total a aportar:\s*R\$\s*1\.000,00/)).toBeInTheDocument();
  });

  it('converte o saldo do SPHQ de US$ para R$ no patrimônio', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Aporte deste mês'), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText('Quanto você tem SPHQ'), { target: { value: '10000' } });
    // 100 US$ × 5 = R$ 500,00
    expect(screen.getByText(/Patrimônio atual:\s*R\$\s*500,00/)).toBeInTheDocument();
  });

  it('mostra o aporte do SPHQ em US$ e em R$', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Aporte deste mês'), { target: { value: '100000' } });
    // carteira zerada, alvo do SPHQ 19% → R$ 190,00 → US$ 38,00 (÷5)
    expect(screen.getByText(/US\$\s*38,00/)).toBeInTheDocument();
    expect(screen.getByText(/≈\s*R\$\s*190,00/)).toBeInTheDocument();
  });

  it('sem cotação, o SPHQ fica de fora e mostra "—"', () => {
    setFx({ rate: null, source: null, error: true });
    render(<App />);
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText(/sem cotação do dólar/i)).toBeInTheDocument();
    expect(screen.getByText(/não consegui buscar o dólar/i)).toBeInTheDocument();
  });

  it('a barra de cotação mostra o valor e a fonte', () => {
    render(<App />);
    expect(screen.getByText(/Dólar:/)).toBeInTheDocument();
    expect(screen.getByText(/via AwesomeAPI/)).toBeInTheDocument();
  });

  it('sinaliza quando a cotação vem do cache', () => {
    setFx({ source: 'cache' });
    render(<App />);
    expect(screen.getByText(/cotação em cache/i)).toBeInTheDocument();
  });

  it('permite editar a cotação manualmente', () => {
    render(<App />);
    fireEvent.click(screen.getByText('editar'));
    fireEvent.change(screen.getByLabelText('Cotação do dólar'), { target: { value: '6,10' } });
    expect(fx.current.setManualRate).toHaveBeenCalledWith('6,10');
  });
});
