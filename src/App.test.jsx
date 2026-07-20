import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App.jsx';

beforeEach(() => window.localStorage.clear());

describe('App', () => {
  it('renderiza os quatro ativos', () => {
    render(<App />);
    expect(screen.getByText('AUPO11')).toBeInTheDocument();
    expect(screen.getByText('Bitcoin')).toBeInTheDocument();
    expect(screen.getAllByText(/Aportar agora/).length).toBe(4);
  });

  it('não aporta em ativo muito acima do alvo', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Quanto você tem Bitcoin'), { target: { value: '10000' } });
    fireEvent.change(screen.getByLabelText('Aporte deste mês'), { target: { value: '1000' } });
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

  it('interpreta valores com separador de milhar corretamente', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Quanto você tem Bitcoin'), { target: { value: '10.000' } });
    fireEvent.change(screen.getByLabelText('Aporte deste mês'), { target: { value: '1.000' } });
    // 10.000 = dez mil (não 1); Bitcoin fica acima do alvo
    expect(screen.getByText(/\(acima\)/)).toBeInTheDocument();
    expect(screen.getByText(/Patrimônio atual:\s*R\$\s*10\.000,00/)).toBeInTheDocument();
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
    fireEvent.change(screen.getByLabelText('Quanto você tem Bitcoin'), { target: { value: '10000' } });
    expect(screen.getByLabelText('Quanto você tem Bitcoin')).toHaveValue('10000');
    fireEvent.click(screen.getByText('Zerar carteira'));
    expect(screen.getByLabelText('Quanto você tem Bitcoin')).toHaveValue('0');
  });

  it('permite digitar centavos com vírgula sem engolir o separador', () => {
    render(<App />);
    const inp = screen.getByLabelText('Quanto você tem AUPO11');
    fireEvent.change(inp, { target: { value: '1234,56' } });
    expect(inp).toHaveValue('1234,56');
    // e o cálculo interpreta como 1.234,56
    fireEvent.change(screen.getByLabelText('Aporte deste mês'), { target: { value: '0' } });
    expect(screen.getByText(/Patrimônio atual:\s*R\$\s*1\.234,56/)).toBeInTheDocument();
  });

  it('mostra o total a aportar igual ao aporte', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Aporte deste mês'), { target: { value: '1000' } });
    // carteira zerada + alvos somando 100% => total distribuído = R$ 1.000,00
    expect(screen.getByText(/Total a aportar:\s*R\$\s*1\.000,00/)).toBeInTheDocument();
  });
});
