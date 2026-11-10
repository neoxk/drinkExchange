import { useCallback, useEffect, useState } from "react";

/** Naloži podatke takoj in jih nato periodično osvežuje. */
export function usePolling<T>(load: () => Promise<T>, intervalMs: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const tick = () =>
      load().then(
        (result) => {
          if (cancelled) return;
          setData(result);
          setError(null);
          setUpdatedAt(new Date());
        },
        (e: unknown) => {
          if (!cancelled) setError(e instanceof Error ? e.message : "Napaka pri nalaganju");
        },
      );
    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [load, intervalMs, reloadKey]);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);
  return { data, error, updatedAt, refresh };
}
