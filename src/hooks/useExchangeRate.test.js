import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useExchangeRate } from './useExchangeRate.js';

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

function mockFetchOnce(bid) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ USDBRL: { bid: String(bid) } }),
  });
}

describe('useExchangeRate', () => {
  it('busca a cotação da API e expõe como fonte "api"', async () => {
    mockFetchOnce('5.4321');
    const { result } = renderHook(() => useExchangeRate());
    await waitFor(() => expect(result.current.rate).toBe(5.4321));
    expect(result.current.source).toBe('api');
    expect(result.current.error).toBe(false);
  });

  it('grava a cotação em cache no localStorage', async () => {
    mockFetchOnce('5.5');
    const { result } = renderHook(() => useExchangeRate());
    await waitFor(() => expect(result.current.rate).toBe(5.5));
    const cache = JSON.parse(window.localStorage.getItem('cerrado.fxCache'));
    expect(cache.rate).toBe(5.5);
  });

  it('usa o cache quando a API falha', async () => {
    window.localStorage.setItem('cerrado.fxCache', JSON.stringify({ rate: 5.0, timestamp: 111 }));
    global.fetch = vi.fn().mockRejectedValue(new Error('rede'));
    const { result } = renderHook(() => useExchangeRate());
    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.rate).toBe(5.0);
    expect(result.current.source).toBe('cache');
  });

  it('sem cache e com falha: rate null e error true', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('rede'));
    const { result } = renderHook(() => useExchangeRate());
    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.rate).toBeNull();
    expect(result.current.source).toBeNull();
  });

  it('override manual tem prioridade sobre a API', async () => {
    mockFetchOnce('5.4321');
    const { result } = renderHook(() => useExchangeRate());
    await waitFor(() => expect(result.current.rate).toBe(5.4321));
    act(() => result.current.setManualRate('6'));
    expect(result.current.rate).toBe(6);
    expect(result.current.source).toBe('manual');
  });

  it('limpar o override volta para a cotação da API', async () => {
    mockFetchOnce('5.4321');
    const { result } = renderHook(() => useExchangeRate());
    await waitFor(() => expect(result.current.rate).toBe(5.4321));
    act(() => result.current.setManualRate('6'));
    expect(result.current.source).toBe('manual');
    act(() => result.current.setManualRate(''));
    expect(result.current.rate).toBe(5.4321);
    expect(result.current.source).toBe('api');
  });
});
