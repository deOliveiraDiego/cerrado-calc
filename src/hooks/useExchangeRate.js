import { useCallback, useEffect, useState } from 'react';
import { usePersistentState } from './usePersistentState.js';
import { parseNumber } from '../lib/format.js';

const FX_URL = 'https://economia.awesomeapi.com.br/last/USD-BRL';

export function useExchangeRate() {
  // cache: { rate, timestamp } | null
  const [cache, setCache] = usePersistentState('cerrado.fxCache', null);
  const [manualRate, setManualRate] = usePersistentState('cerrado.fxManual', '');
  const [apiRate, setApiRate] = useState(null); // { rate, timestamp } | null
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(FX_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // A API devolve o número em formato US (ponto decimal): usar Number, não parseNumber.
      const bid = Number(data?.USDBRL?.bid);
      if (!Number.isFinite(bid) || bid <= 0) throw new Error('cotação inválida');
      const entry = { rate: bid, timestamp: Date.now() };
      setApiRate(entry);
      setCache(entry);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [setCache]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const manualNum = parseNumber(manualRate);
  let rate = null;
  let source = null;
  let updatedAt = null;
  if (manualNum > 0) {
    rate = manualNum;
    source = 'manual';
  } else if (apiRate && apiRate.rate > 0) {
    rate = apiRate.rate;
    source = 'api';
    updatedAt = apiRate.timestamp;
  } else if (cache && cache.rate > 0) {
    rate = cache.rate;
    source = 'cache';
    updatedAt = cache.timestamp;
  }

  return { rate, source, updatedAt, loading, error, manualRate, setManualRate, refresh };
}
