import { useEffect, useState } from 'react';

// Detecta se o localStorage está disponível (pode estar bloqueado em modo
// anônimo ou por política do navegador). Usado para avisar o usuário de que
// os dados não serão salvos.
export function isLocalStorageAvailable() {
  try {
    const k = '__cerrado_probe__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

const isPlainObject = (v) => v != null && typeof v === 'object' && !Array.isArray(v);

export function usePersistentState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw == null) return initialValue;
      const saved = JSON.parse(raw);
      // Objeto salvo antes de uma chave nova existir: a chave nova entra com o padrão.
      return isPlainObject(initialValue) && isPlainObject(saved) ? { ...initialValue, ...saved } : saved;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* localStorage indisponível/cheio: ignora */
    }
  }, [key, value]);
  return [value, setValue];
}
