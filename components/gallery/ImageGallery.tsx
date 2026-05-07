"use client";

import { useState } from "react";
import { ImageIcon, Trash2 } from "lucide-react";
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
        <Button variant="ghost" size="sm" onClick={onClear}>
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
    </div>
  );
}
