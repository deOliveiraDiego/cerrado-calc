import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePersistentState, isLocalStorageAvailable } from './usePersistentState.js';

beforeEach(() => window.localStorage.clear());

describe('isLocalStorageAvailable', () => {
  it('retorna true quando o localStorage funciona (jsdom)', () => {
    expect(isLocalStorageAvailable()).toBe(true);
  });
});

describe('usePersistentState', () => {
  it('usa o valor inicial quando nada está salvo', () => {
    const { result } = renderHook(() => usePersistentState('k', { a: 1 }));
    expect(result.current[0]).toEqual({ a: 1 });
  });
  it('persiste atualizações no localStorage', () => {
    const { result } = renderHook(() => usePersistentState('k', 0));
    act(() => result.current[1](5));
    expect(JSON.parse(window.localStorage.getItem('k'))).toBe(5);
  });
  it('lê o valor salvo na inicialização', () => {
    window.localStorage.setItem('k', JSON.stringify(42));
    const { result } = renderHook(() => usePersistentState('k', 0));
    expect(result.current[0]).toBe(42);
  });
});
