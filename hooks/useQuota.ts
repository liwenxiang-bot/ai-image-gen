"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthRedirect } from "@/hooks/useAuthRedirect";

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
  const { redirectToLogin } = useAuthRedirect();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/quota", { cache: "no-store" });
      if (!res.ok) {
        setQuota(null);
        if (res.status === 401) redirectToLogin();
        return;
      }
      const data = (await res.json()) as QuotaState;
      setQuota(data);
    } catch {
      // ignore — UI just hides itself
    } finally {
      setLoading(false);
    }
  }, [redirectToLogin]);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => void refresh(), REFRESH_INTERVAL_MS);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [refresh]);

  return { quota, loading, refresh };
}
