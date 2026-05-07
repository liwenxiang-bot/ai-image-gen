"use client";

import { Download, Trash2, Maximize2, Pencil } from "lucide-react";
import type { HistoryItem } from "@/lib/types";

interface ImageCardProps {
  item: HistoryItem;
  onDelete: (id: string) => void;
  onPreview: (item: HistoryItem) => void;
  onEdit: (item: HistoryItem) => void;
}

export default function ImageCard({ item, onDelete, onPreview, onEdit }: ImageCardProps) {
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${item.imageBase64}`;
    link.download = `ai-image-${Date.now()}.png`;
    link.click();
  };

  return (
    <div
      className="group relative cursor-pointer overflow-hidden rounded-xl border border-border bg-muted transition-all duration-200 hover:shadow-lg hover:scale-[1.02]"
      onClick={() => onPreview(item)}
    >
      <div className="aspect-square">
        <img
          src={`data:image/png;base64,${item.imageBase64}`}
          alt={item.prompt}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 flex flex-col justify-between bg-black/0 p-3 transition-all duration-200 group-hover:bg-black/50">
        {/* Top actions */}
        <div className="flex justify-end gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(item); }}
            className="rounded-lg bg-white/20 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-accent/70 cursor-pointer"
            title="继续改图"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onPreview(item); }}
            className="rounded-lg bg-white/20 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-white/30 cursor-pointer"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            onClick={handleDownload}
            className="rounded-lg bg-white/20 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-white/30 cursor-pointer"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
            className="rounded-lg bg-white/20 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-red-500/70 cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Bottom prompt */}
        <div className="opacity-0 transition-opacity group-hover:opacity-100">
          <p className="line-clamp-2 text-xs text-white/90">{item.prompt}</p>
        </div>
      </div>
    </div>
  );
}
