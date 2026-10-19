'use client';

import { useEffect, useState } from 'react';

/**
 * Reads the table the customer scanned (httpOnly cookie, resolved server-side).
 * Returns { tableNumber, loading }. tableNumber is 0 when no valid table context.
 */
export function useTableContext() {
  const [tableNumber, setTableNumber] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/table-context', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setTableNumber(d?.table?.tableNumber ?? 0);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { tableNumber, loading };
}
