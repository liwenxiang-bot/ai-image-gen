"use client";

import { useEffect, useCallback } from "react";
import { X, Download, Pencil } from "lucide-react";
import type { HistoryItem } from "@/lib/types";

interface ImageModalProps {
  item: HistoryItem;
  onClose: () => void;
  onEdit: (item: HistoryItem) => void;
}

export default function ImageModal({ item, onClose, onEdit }: ImageModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${item.imageBase64}`;
    link.download = `ai-image-${Date.now()}.png`;
    link.click();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] max-w-4xl flex-col gap-4 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={() => onEdit(item)}
            className="rounded-lg bg-white/20 p-2 text-white transition-colors hover:bg-accent/70 cursor-pointer"
            title="继续改图"
          >
            <Pencil className="h-5 w-5" />
          </button>
          <button
            onClick={handleDownload}
            className="rounded-lg bg-white/20 p-2 text-white transition-colors hover:bg-white/30 cursor-pointer"
          >
            <Download className="h-5 w-5" />
          </button>
          <button
            onClick={onClose}
            className="rounded-lg bg-white/20 p-2 text-white transition-colors hover:bg-white/30 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Image */}
        <img
          src={`data:image/png;base64,${item.imageBase64}`}
          alt={item.prompt}
          className="max-h-[70vh] rounded-xl object-contain"
        />

        {/* Info */}
        <div className="rounded-xl bg-black/40 p-4 backdrop-blur-sm max-h-24 overflow-y-auto">
          <p className="text-sm text-white/90">{item.prompt}</p>
          <div className="mt-2 flex gap-3 text-xs text-white/60">
            <span>{item.size}</span>
            <span>{item.quality}</span>
            <span>{new Date(item.createdAt).toLocaleString("zh-CN")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
