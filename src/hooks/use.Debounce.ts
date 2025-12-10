import { useState, useEffect } from "react";


/**
 * Debounces a value by the given delay.
 * Returns the debounced value.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);

    // Cleanup if value changes before delay
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
