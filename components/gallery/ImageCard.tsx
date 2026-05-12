"use client";

import { Download, Trash2, Maximize2, Pencil, Globe, Lock } from "lucide-react";
import Tooltip from "@/components/ui/Tooltip";
import type { HistoryItem } from "@/lib/types";

interface ImageCardProps {
  item: HistoryItem;
  onDelete: (id: string) => void;
  onPreview: (item: HistoryItem) => void;
  onEdit: (item: HistoryItem) => void;
  onTogglePublic: (id: string, isPublic: boolean) => void;
}

export default function ImageCard({
  item,
  onDelete,
  onPreview,
  onEdit,
  onTogglePublic,
}: ImageCardProps) {
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
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
      className="group relative cursor-pointer overflow-hidden rounded-xl border border-border bg-muted transition-all duration-200 hover:shadow-lg hover:scale-[1.02]"
      onClick={() => onPreview(item)}
    >
      <div className="aspect-square">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageUrl}
          alt={item.prompt}
          className="h-full w-full object-cover"
          loading="lazy"
          crossOrigin="anonymous"
        />
      </div>

      {/* Public badge */}
      {item.isPublic && (
        <div className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-accent/90 px-2 py-0.5 text-[10px] font-medium text-accent-foreground shadow-sm backdrop-blur-sm">
          <Globe className="h-2.5 w-2.5" />
          公开
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 flex flex-col justify-between bg-black/0 p-3 transition-all duration-200 group-hover:bg-black/50">
        <div className="flex justify-end gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          <Tooltip label={item.isPublic ? "设为私有" : "公开到画廊"} side="bottom">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePublic(item.id, !item.isPublic);
              }}
              className="rounded-lg bg-white/20 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-accent/70 cursor-pointer"
            >
              {item.isPublic ? (
                <Lock className="h-4 w-4" />
              ) : (
                <Globe className="h-4 w-4" />
              )}
            </button>
          </Tooltip>
          <Tooltip label="继续改图" side="bottom">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(item); }}
              className="rounded-lg bg-white/20 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-accent/70 cursor-pointer"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </Tooltip>
          <Tooltip label="查看大图" side="bottom">
            <button
              onClick={(e) => { e.stopPropagation(); onPreview(item); }}
              className="rounded-lg bg-white/20 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-white/30 cursor-pointer"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </Tooltip>
          <Tooltip label="下载" side="bottom">
            <button
              onClick={handleDownload}
              className="rounded-lg bg-white/20 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-white/30 cursor-pointer"
            >
              <Download className="h-4 w-4" />
            </button>
          </Tooltip>
          <Tooltip label="删除" side="bottom">
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
              className="rounded-lg bg-white/20 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-red-500/70 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </Tooltip>
        </div>

        <div className="opacity-0 transition-opacity group-hover:opacity-100">
          <p className="line-clamp-2 text-xs text-white/90">{item.prompt}</p>
        </div>
      </div>
    </div>
  );
}
