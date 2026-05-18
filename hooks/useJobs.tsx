"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuthRedirect } from "@/hooks/useAuthRedirect";

export type JobStatus = "queued" | "running" | "done" | "failed" | "cancelled";

export type JobPayload = {
  id: string;
  status: JobStatus;
  prompt: string;
  mode: string;
  size: string;
  quality: string;
  imageId: string | null;
  errorMessage: string | null;
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
};

export type SubmitInput = {
  prompt: string;
  mode: "text-to-image" | "image-to-image";
  size: string;
  quality: string;
  images?: string[];
};

type Listener = (job: JobPayload) => void;

type JobsContextValue = {
  jobs: JobPayload[];
  submitJob: (input: SubmitInput) => Promise<JobPayload | null>;
  retryJob: (id: string) => Promise<void>;
  cancelJob: (id: string) => Promise<void>;
  onCompleted: (fn: Listener) => () => void;
  onFailed: (fn: Listener) => () => void;
  hasActive: boolean;
};

const JobsContext = createContext<JobsContextValue | null>(null);

const ACTIVE = (s: JobStatus) => s === "queued" || s === "running";

export function JobsProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<JobPayload[]>([]);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const completedListeners = useRef<Set<Listener>>(new Set());
  const failedListeners = useRef<Set<Listener>>(new Set());
  const seenTerminalIds = useRef<Set<string>>(new Set());
  const esRef = useRef<EventSource | null>(null);
  const { isAuthOptional, redirectToLogin, throwAuthExpired } = useAuthRedirect();

  // Skip auth probe entirely on routes where auth is optional.
  const skipAuth = isAuthOptional;

  const handleUnauthorized = useCallback((): never => {
    setAuthed(false);
    return throwAuthExpired();
  }, [throwAuthExpired]);

  // Auth probe: silent. Only authed users connect to SSE.
  useEffect(() => {
    if (skipAuth) {
      const timer = window.setTimeout(() => setAuthed(false), 0);
      return () => window.clearTimeout(timer);
    }
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => {
        if (r.ok) {
          setAuthed(true);
          return;
        }
        setAuthed(false);
        if (r.status === 401) redirectToLogin();
      })
      .catch(() => setAuthed(false));
  }, [redirectToLogin, skipAuth]);

  const mergeJob = useCallback((incoming: JobPayload) => {
    setJobs((prev) => {
      const idx = prev.findIndex((j) => j.id === incoming.id);
      if (idx < 0) return [incoming, ...prev];
      const copy = prev.slice();
      copy[idx] = incoming;
      return copy;
    });

    if (incoming.status === "done" && !seenTerminalIds.current.has(incoming.id)) {
      seenTerminalIds.current.add(incoming.id);
      completedListeners.current.forEach((fn) => fn(incoming));
    }
    if (incoming.status === "failed" && !seenTerminalIds.current.has(incoming.id)) {
      seenTerminalIds.current.add(incoming.id);
      failedListeners.current.forEach((fn) => fn(incoming));
    }
  }, []);

  const hasActive = jobs.some((j) => ACTIVE(j.status));

  // SSE connect/disconnect lifecycle
  useEffect(() => {
    if (!authed) return;
    const shouldConnect =
      hasActive && (typeof document === "undefined" || !document.hidden);

    if (!shouldConnect) {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      return;
    }

    if (esRef.current) return;
    const es = new EventSource("/api/jobs/stream");
    esRef.current = es;
    es.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data) as JobPayload;
        mergeJob(data);
      } catch {
        // ignore
      }
    };
    es.onerror = () => {
      // Browser auto-reconnects with backoff
    };
    return () => {
      es.close();
      if (esRef.current === es) esRef.current = null;
    };
  }, [authed, hasActive, mergeJob]);

  // Force re-render on visibility change so SSE connect decision re-evaluates
  const [, force] = useState(0);
  useEffect(() => {
    if (!authed) return;
    const onVis = () => force((n) => n + 1);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [authed]);

  // Catch-up snapshot on mount, focus, and visibility change
  useEffect(() => {
    if (!authed) return;
    const refresh = async () => {
      try {
        const res = await fetch("/api/jobs", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { items: JobPayload[] };
        for (const item of data.items) mergeJob(item);
      } catch {
        // ignore
      }
    };
    void refresh();
    const onVis = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, [authed, mergeJob]);

  // Auto-clear terminal jobs after 8 seconds
  useEffect(() => {
    const terminal = jobs.filter((j) => !ACTIVE(j.status));
    if (terminal.length === 0) return;
    const oldest = Math.min(...terminal.map((j) => j.finishedAt ?? Date.now()));
    const elapsed = Date.now() - oldest;
    const remaining = Math.max(0, 8000 - elapsed);
    const t = setTimeout(() => {
      setJobs((prev) => prev.filter((j) => ACTIVE(j.status)));
    }, remaining);
    return () => clearTimeout(t);
  }, [jobs]);

  const submitJob = useCallback(
    async (input: SubmitInput): Promise<JobPayload | null> => {
      let inputKeys: string[] | undefined;
      if (input.mode === "image-to-image" && input.images && input.images.length > 0) {
        const up = await fetch("/api/jobs/upload-input", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ images: input.images }),
        });
        if (!up.ok) {
          if (up.status === 401) handleUnauthorized();
          const errData = await up.json().catch(() => ({}));
          throw new Error(errData?.error || "上传输入图失败");
        }
        const upData = (await up.json()) as { keys: string[] };
        inputKeys = upData.keys;
      }

      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: input.prompt,
          mode: input.mode,
          size: input.size,
          quality: input.quality,
          inputKeys,
        }),
      });
      if (!res.ok) {
        if (res.status === 401) handleUnauthorized();
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || "创建任务失败");
      }
      const job = (await res.json()) as JobPayload;
      mergeJob(job);
      return job;
    },
    [handleUnauthorized, mergeJob],
  );

  const retryJob = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/jobs/${id}/retry`, { method: "POST" });
      if (!res.ok) {
        if (res.status === 401) handleUnauthorized();
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || "重试失败");
      }
      const job = (await res.json()) as JobPayload;
      // Re-allow it to fire listeners again
      seenTerminalIds.current.delete(id);
      mergeJob(job);
    },
    [handleUnauthorized, mergeJob],
  );

  const cancelJob = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
      if (!res.ok) {
        if (res.status === 401) handleUnauthorized();
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || "取消失败");
      }
      setJobs((prev) => prev.filter((j) => j.id !== id));
    },
    [handleUnauthorized],
  );

  const onCompleted = useCallback((fn: Listener) => {
    completedListeners.current.add(fn);
    return () => {
      completedListeners.current.delete(fn);
    };
  }, []);
  const onFailed = useCallback((fn: Listener) => {
    failedListeners.current.add(fn);
    return () => {
      failedListeners.current.delete(fn);
    };
  }, []);

  const value: JobsContextValue = {
    jobs,
    submitJob,
    retryJob,
    cancelJob,
    onCompleted,
    onFailed,
    hasActive,
  };

  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>;
}

export function useJobs(): JobsContextValue {
  const v = useContext(JobsContext);
  if (!v) {
    throw new Error("useJobs must be used inside <JobsProvider>");
  }
  return v;
}
