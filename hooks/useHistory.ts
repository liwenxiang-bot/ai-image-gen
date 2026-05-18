"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthRedirect } from "@/hooks/useAuthRedirect";
import type { HistoryItem } from "@/lib/types";

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const { redirectToLogin } = useAuthRedirect();

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/my/images", { cache: "no-store" });
      if (res.status === 401) redirectToLogin();
      if (!res.ok) return;
      const data = await res.json();
      setHistory(Array.isArray(data.items) ? (data.items as HistoryItem[]) : []);
    } catch {
      // ignore
    }
  }, [redirectToLogin]);

  useEffect(() => {
    const initial = window.setTimeout(() => void reload(), 0);
    // Best-effort cleanup of legacy IndexedDB store; safe to call multiple times.
    try {
      indexedDB.deleteDatabase("ai-image-gen");
    } catch {
      // ignore
    }
    return () => window.clearTimeout(initial);
  }, [reload]);

  const addItem = useCallback((item: HistoryItem) => {
    setHistory((prev) => [item, ...prev]);
  }, []);

  const removeItem = useCallback(async (id: string) => {
    setHistory((prev) => prev.filter((it) => it.id !== id));
    try {
      const res = await fetch(`/api/images/${id}`, { method: "DELETE" });
      if (res.status === 401) redirectToLogin();
    } catch {
      // ignore
    }
  }, [redirectToLogin]);

  const setItemVisibility = useCallback(async (id: string, isPublic: boolean) => {
    setHistory((prev) =>
      prev.map((it) => (it.id === id ? { ...it, isPublic } : it)),
    );
    try {
      const res = await fetch(`/api/images/${id}/visibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic }),
      });
      if (res.status === 401) redirectToLogin();
    } catch {
      // ignore
    }
  }, [redirectToLogin]);

  return {
    history,
    addItem,
    removeItem,
    setItemVisibility,
    reload,
  };
}
