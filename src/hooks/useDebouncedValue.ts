import { useEffect, useState } from 'react';

/**
 * Returns `value` once it has stopped changing for `delayMs`.
 * Use for inputs that trigger network queries, so typing a name sends one
 * request instead of one per keystroke.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
