"use client";

import { useCallback, useEffect, useState } from "react";

export type QuotaState = {
  used: number;
  limit: number;
  remaining: number;
  dayKey: string;
  cost: { "text-to-image": number; "image-to-image": number };
};

const REFRESH_INTERVAL_MS = 60 * 1000;

export function useQuota() {
  const [quota, setQuota] = useState<QuotaState | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/quota", { cache: "no-store" });
      if (!res.ok) {
        setQuota(null);
        return;
      }
      const data = (await res.json()) as QuotaState;
      setQuota(data);
    } catch {
      // ignore — UI just hides itself
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const t = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  return { quota, loading, refresh };
}
