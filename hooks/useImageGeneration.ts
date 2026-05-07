"use client";

import { useState, useCallback } from "react";
import type { GenerationParams, GenerationResult } from "@/lib/types";

export function useImageGeneration() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (params: GenerationParams): Promise<GenerationResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "生成失败，请重试");
        return null;
      }

      return data as GenerationResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : "网络错误，请检查连接";
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { generate, isLoading, error, clearError };
}
