"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  X,
  Download,
  Pencil,
  Globe,
  Lock,
  Trash2,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Tooltip from "@/components/ui/Tooltip";
import ZoomableImage from "@/components/ui/ZoomableImage";
import type { HistoryItem } from "@/lib/types";

interface ImageModalProps {
  items: HistoryItem[];
  index: number;
  onClose: () => void;
  onIndexChange: (i: number) => void;
  onEdit: (item: HistoryItem) => void;
  onTogglePublic: (id: string, isPublic: boolean) => void;
  onDelete: (id: string) => void;
}

export default function ImageModal({
  items,
  index,
  onClose,
  onIndexChange,
  onEdit,
  onTogglePublic,
  onDelete,
}: ImageModalProps) {
  const item = items[index];
  const hasPrev = index > 0;
  const hasNext = index < items.length - 1;
  const touchStartX = useRef<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  // Reset copy state when switching images
  useEffect(() => {
    setCopied(false);
  }, [index]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (!zoomed && e.key === "ArrowLeft" && hasPrev) onIndexChange(index - 1);
      else if (!zoomed && e.key === "ArrowRight" && hasNext) onIndexChange(index + 1);
    },
    [onClose, onIndexChange, hasPrev, hasNext, index, zoomed],
  );

  const onTouchStart = (e: React.TouchEvent) => {
    if (zoomed) return;
    if (e.touches.length > 1) return;
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (zoomed) return;
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 50) return;
    if (delta > 0 && hasPrev) onIndexChange(index - 1);
    else if (delta < 0 && hasNext) onIndexChange(index + 1);
  };

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  if (!item) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(item.prompt);
    } catch {
      // ignore
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownload = async () => {
    try {
      const res = await fetch(item.imageUrl, { mode: "cors" });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ai-image-${item.id}.png`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
        aria-label="关闭"
      >
        <X className="h-5 w-5" />
      </button>

      <div
        className="relative flex w-full max-w-5xl items-center gap-3 md:gap-4"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <NavArrow
          dir="prev"
          disabled={!hasPrev}
          peek={hasPrev ? items[index - 1] : null}
          onClick={() => onIndexChange(index - 1)}
        />

        <div className="flex flex-1 flex-col gap-3 animate-fade-in">
          <div className="flex justify-end gap-2">
            <Tooltip label={copied ? "已复制" : "复制提示词"} side="bottom">
              <button
                onClick={handleCopy}
                className="rounded-lg bg-white/20 p-2 text-white transition-colors hover:bg-accent/70 cursor-pointer"
              >
                {copied ? <Check className="h-5 w-5 text-green-300" /> : <Copy className="h-5 w-5" />}
              </button>
            </Tooltip>
            <Tooltip label={item.isPublic ? "设为私有" : "公开到画廊"} side="bottom">
              <button
                onClick={() => onTogglePublic(item.id, !item.isPublic)}
                className="rounded-lg bg-white/20 p-2 text-white transition-colors hover:bg-accent/70 cursor-pointer"
              >
                {item.isPublic ? (
                  <Lock className="h-5 w-5" />
                ) : (
                  <Globe className="h-5 w-5" />
                )}
              </button>
            </Tooltip>
            <Tooltip label="继续改图" side="bottom">
              <button
                onClick={() => onEdit(item)}
                className="rounded-lg bg-white/20 p-2 text-white transition-colors hover:bg-accent/70 cursor-pointer"
              >
                <Pencil className="h-5 w-5" />
              </button>
            </Tooltip>
            <Tooltip label="下载" side="bottom">
              <button
                onClick={handleDownload}
                className="rounded-lg bg-white/20 p-2 text-white transition-colors hover:bg-white/30 cursor-pointer"
              >
                <Download className="h-5 w-5" />
              </button>
            </Tooltip>
            <Tooltip label="删除" side="bottom">
              <button
                onClick={() => onDelete(item.id)}
                className="rounded-lg bg-white/20 p-2 text-white transition-colors hover:bg-red-500/70 cursor-pointer"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </Tooltip>
          </div>

          <ZoomableImage
            key={item.id}
            src={item.imageUrl}
            alt={item.prompt}
            className="max-h-[70vh] w-full rounded-xl flex items-center justify-center"
            imgClassName="max-h-[70vh] w-full object-contain"
            onZoomChange={setZoomed}
          />

          <div className="rounded-xl bg-black/40 p-4 backdrop-blur-sm max-h-24 overflow-y-auto">
            <p className="text-sm text-white/90">{item.prompt}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-white/60">
              <span>{item.size}</span>
              <span>{item.quality}</span>
              <span>{new Date(item.createdAt).toLocaleString("zh-CN")}</span>
              {item.isPublic && (
                <span className="inline-flex items-center gap-1 text-accent">
                  <Globe className="h-3 w-3" />
                  已公开
                </span>
              )}
              <span className="ml-auto text-white/40">
                {index + 1} / {items.length}
              </span>
            </div>
          </div>
        </div>

        <NavArrow
          dir="next"
          disabled={!hasNext}
          peek={hasNext ? items[index + 1] : null}
          onClick={() => onIndexChange(index + 1)}
        />
      </div>
    </div>
  );
}

function NavArrow({
  dir,
  disabled,
  peek,
  onClick,
}: {
  dir: "prev" | "next";
  disabled: boolean;
  peek: HistoryItem | null;
  onClick: () => void;
}) {
  if (disabled) {
    return <div className="hidden w-16 shrink-0 md:block" aria-hidden />;
  }
  const Icon = dir === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative hidden h-24 w-16 shrink-0 items-center justify-center md:flex"
      aria-label={dir === "prev" ? "上一张" : "下一张"}
    >
      {peek && (
        <div className="absolute inset-0 overflow-hidden rounded-xl opacity-40 transition-opacity group-hover:opacity-70">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={peek.imageUrl}
            alt=""
            className="h-full w-full object-cover blur-[1px]"
            crossOrigin="anonymous"
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>
      )}
      <Icon className="relative h-6 w-6 text-white drop-shadow" />
    </button>
  );
}
