import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App.jsx';

describe('App (smoke)', () => {
  it('renderiza o título', () => {
    render(<App />);
    expect(screen.getByText('Calculadora do Cerrado')).toBeInTheDocument();
  });
});
