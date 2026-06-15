"use client";

import { useEffect, useState } from "react";
import { ImageIcon, Trash2, AlertTriangle, Loader2, RefreshCw, X } from "lucide-react";
import ImageCard from "./ImageCard";
import ImageModal from "./ImageModal";
import Button from "@/components/ui/Button";
import type { HistoryItem } from "@/lib/types";

export type ActiveJob = {
  id: string;
  prompt: string;
  status: "queued" | "running" | "failed";
  errorMessage?: string | null;
};

interface ImageGalleryProps {
  history: HistoryItem[];
  activeJobs?: ActiveJob[];
  onDelete: (id: string) => void;
  onEdit: (item: HistoryItem) => void;
  onTogglePublic: (id: string, isPublic: boolean) => void;
  onRetryJob?: (id: string) => void;
  onCancelJob?: (id: string) => void;
}

export default function ImageGallery({
  history,
  activeJobs = [],
  onDelete,
  onEdit,
  onTogglePublic,
  onRetryJob,
  onCancelJob,
}: ImageGalleryProps) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<HistoryItem | null>(null);

  useEffect(() => {
    if (!confirmDelete) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirmDelete(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirmDelete]);

  if (history.length === 0 && activeJobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
        <ImageIcon className="h-12 w-12 opacity-30" />
        <p className="text-sm">还没有生成任何图片</p>
        <p className="text-xs">输入提示词开始创作吧</p>
      </div>
    );
  }

  const requestDelete = (id: string) => {
    const item = history.find((it) => it.id === id);
    if (item) setConfirmDelete(item);
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          历史记录 ({history.length})
        </h2>
        {activeJobs.filter((j) => j.status !== "failed").length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
            <Loader2 className="h-3 w-3 animate-spin" />
            {activeJobs.filter((j) => j.status !== "failed").length} 个任务进行中
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
        {activeJobs.map((job) => (
          <JobPlaceholder
            key={job.id}
            job={job}
            onRetry={onRetryJob ? () => onRetryJob(job.id) : undefined}
            onCancel={onCancelJob ? () => onCancelJob(job.id) : undefined}
          />
        ))}
        {history.map((item, i) => (
          <div key={item.id} className="animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
            <ImageCard
              item={item}
              onDelete={requestDelete}
              onPreview={() => setPreviewIndex(i)}
              onEdit={onEdit}
              onTogglePublic={onTogglePublic}
            />
          </div>
        ))}
      </div>

      {previewIndex !== null && history[previewIndex] && (
        <ImageModal
          items={history}
          index={previewIndex}
          onClose={() => setPreviewIndex(null)}
          onIndexChange={setPreviewIndex}
          onEdit={(item) => {
            setPreviewIndex(null);
            onEdit(item);
          }}
          onTogglePublic={onTogglePublic}
          onDelete={(id) => {
            const item = history.find((it) => it.id === id);
            if (item) {
              setPreviewIndex(null);
              setConfirmDelete(item);
            }
          }}
        />
      )}

      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-background p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-red-500/10 p-2 text-red-500 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium">删除这张图片？</h3>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {confirmDelete.prompt}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  删除后无法恢复{confirmDelete.isPublic ? "，画廊里也会一并消失" : ""}。
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>
                取消
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  onDelete(confirmDelete.id);
                  setConfirmDelete(null);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                删除
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function JobPlaceholder({
  job,
  onRetry,
  onCancel,
}: {
  job: ActiveJob;
  onRetry?: () => void;
  onCancel?: () => void;
}) {
  const failed = job.status === "failed";
  return (
    <div
      className={
        "group relative aspect-square overflow-hidden rounded-xl border " +
        (failed
          ? "border-red-500/40 bg-red-500/5"
          : "border-border bg-muted skeleton-shimmer")
      }
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center">
        {failed ? (
          <>
            <AlertTriangle className="h-6 w-6 text-red-500/80" />
            <div className="text-xs font-medium text-red-600">生成失败</div>
            {job.errorMessage && (
              <div className="line-clamp-2 text-[10px] text-foreground/55">
                {job.errorMessage}
              </div>
            )}
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-1 inline-flex items-center gap-1 rounded-lg bg-accent/15 px-2.5 py-1 text-[11px] font-medium text-accent transition-colors hover:bg-accent/25"
              >
                <RefreshCw className="h-3 w-3" />
                重试
              </button>
            )}
          </>
        ) : (
          <>
            <Loader2 className="h-7 w-7 animate-spin text-accent" />
            <div className="text-xs font-medium text-foreground/70">
              {job.status === "queued" ? "排队中..." : "AI 绘制中..."}
            </div>
          </>
        )}
        <div className="line-clamp-2 text-[10px] text-foreground/45">
          {job.prompt}
        </div>
      </div>

      {job.status === "queued" && onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="absolute right-1.5 top-1.5 rounded-full bg-black/30 p-1 text-white/80 opacity-0 transition-opacity hover:bg-black/50 hover:text-white group-hover:opacity-100"
          title="取消"
          aria-label="取消任务"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
