"use client";

import { useEffect, useState } from "react";
import { ImageIcon, Trash2, AlertTriangle } from "lucide-react";
import ImageCard from "./ImageCard";
import ImageModal from "./ImageModal";
import Button from "@/components/ui/Button";
import type { HistoryItem } from "@/lib/types";

interface ImageGalleryProps {
  history: HistoryItem[];
  isLoading?: boolean;
  onDelete: (id: string) => void;
  onClear: () => void;
  onEdit: (item: HistoryItem) => void;
}

export default function ImageGallery({ history, isLoading, onDelete, onClear, onEdit }: ImageGalleryProps) {
  const [preview, setPreview] = useState<HistoryItem | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (!confirmClear) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirmClear(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirmClear]);

  if (history.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
        <ImageIcon className="h-12 w-12 opacity-30" />
        <p className="text-sm">还没有生成任何图片</p>
        <p className="text-xs">输入提示词开始创作吧</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          历史记录 ({history.length})
        </h2>
        <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)}>
          <Trash2 className="h-3.5 w-3.5" />
          清空
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && (
          <div className="aspect-square rounded-xl skeleton-shimmer flex items-center justify-center overflow-hidden">
            <div className="flex flex-col items-center gap-3 rounded-xl bg-background/60 backdrop-blur-sm px-5 py-4">
              <div className="h-8 w-8 rounded-full border-2 border-muted-foreground/30 border-t-accent animate-spin" />
              <span className="text-xs text-muted-foreground font-medium">AI 绘制中...</span>
            </div>
          </div>
        )}
        {history.map((item, i) => (
          <div key={item.id} className="animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
            <ImageCard item={item} onDelete={onDelete} onPreview={setPreview} onEdit={onEdit} />
          </div>
        ))}
      </div>

      {preview && (
        <ImageModal
          item={preview}
          onClose={() => setPreview(null)}
          onEdit={(item) => { setPreview(null); onEdit(item); }}
        />
      )}

      {confirmClear && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setConfirmClear(false)}
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
                <h3 className="text-sm font-medium">清空所有历史记录？</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  将删除全部 {history.length} 张已生成的图片，此操作无法撤销。
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmClear(false)}>
                取消
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  onClear();
                  setConfirmClear(false);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                确认清空
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
