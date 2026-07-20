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
    fireEvent.change(screen.getByLabelText('Valor atual Bitcoin'), { target: { value: '10000' } });
    fireEvent.change(screen.getByLabelText('Aporte deste mês'), { target: { value: '1000' } });
    // O card do Bitcoin exibe status 'acima'
    expect(screen.getByText(/\(acima\)/)).toBeInTheDocument();
  });

  it('avisa quando a soma dos alvos != 100', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Alvo AUPO11'), { target: { value: '50' } });
    expect(screen.getByText(/soma dos alvos/i)).toBeInTheDocument();
  });
});
