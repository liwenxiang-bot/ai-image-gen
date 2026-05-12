"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useJobs, type JobPayload } from "@/hooks/useJobs";

export default function JobsPanel() {
  const pathname = usePathname();
  const { jobs, retryJob, cancelJob } = useJobs();
  const [collapsed, setCollapsed] = useState(false);

  // Hide on login (user isn't logged in yet — nothing meaningful to show)
  if (pathname?.startsWith("/login")) return null;
  if (jobs.length === 0) return null;

  const active = jobs.filter((j) => j.status === "queued" || j.status === "running");
  const failed = jobs.filter((j) => j.status === "failed");
  const done = jobs.filter((j) => j.status === "done");

  const summary =
    active.length > 0
      ? `${active.length} 个进行中`
      : failed.length > 0
      ? `${failed.length} 个失败`
      : `${done.length} 个完成`;

  return (
    <div className="fixed bottom-4 right-4 z-40 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-background/95 shadow-2xl backdrop-blur-md">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center justify-between gap-2 border-b border-border/60 px-4 py-2.5 text-left hover:bg-muted/50"
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          {active.length > 0 ? (
            <Loader2 className="h-4 w-4 animate-spin text-accent" />
          ) : failed.length > 0 ? (
            <AlertCircle className="h-4 w-4 text-red-500" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          )}
          <span>生成任务</span>
          <span className="text-xs text-foreground/55">· {summary}</span>
        </div>
        {collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {!collapsed && (
        <div className="max-h-[60vh] overflow-y-auto">
          {jobs.map((job) => (
            <JobRow
              key={job.id}
              job={job}
              onRetry={() => void retryJob(job.id)}
              onCancel={() => void cancelJob(job.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function JobRow({
  job,
  onRetry,
  onCancel,
}: {
  job: JobPayload;
  onRetry: () => void;
  onCancel: () => void;
}) {
  const Icon =
    job.status === "queued"
      ? Clock
      : job.status === "running"
      ? Loader2
      : job.status === "done"
      ? CheckCircle2
      : AlertCircle;

  const tone =
    job.status === "done"
      ? "text-green-600"
      : job.status === "failed"
      ? "text-red-500"
      : job.status === "cancelled"
      ? "text-foreground/40"
      : "text-accent";

  const label =
    job.status === "queued"
      ? "排队中"
      : job.status === "running"
      ? "生成中"
      : job.status === "done"
      ? "已完成"
      : job.status === "failed"
      ? "已失败"
      : "已取消";

  return (
    <div className="group flex items-start gap-3 border-b border-border/40 px-4 py-3 last:border-b-0 hover:bg-muted/30">
      <Icon
        className={`mt-0.5 h-4 w-4 shrink-0 ${tone} ${
          job.status === "running" ? "animate-spin" : ""
        }`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-xs font-medium ${tone}`}>{label}</span>
          {(job.status === "queued" || job.status === "running") && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded p-0.5 text-foreground/40 opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
              title="取消"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          {job.status === "failed" && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-accent transition-colors hover:bg-accent/10"
              title="重试"
            >
              <RefreshCw className="h-3 w-3" />
              重试
            </button>
          )}
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs text-foreground/70">{job.prompt}</p>
        {job.status === "failed" && job.errorMessage && (
          <p className="mt-1 line-clamp-2 text-[11px] text-red-500/80">{job.errorMessage}</p>
        )}
      </div>
    </div>
  );
}
