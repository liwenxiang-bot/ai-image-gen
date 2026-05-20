"use client";

import { useEffect } from "react";
import { X, ExternalLink, Sparkles } from "lucide-react";

interface SponsorModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SponsorModal({ open, onClose }: SponsorModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="关闭"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Sparkles className="h-4 w-4 text-accent" />
            今日额度已用完
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground">
            本项目由 <span className="font-medium text-foreground">玖亿AI</span> 赞助。一站式 AI 聚合站，深度集成 ChatGPT、Claude、Gemini、Grok 等镜像，按量计费、无需翻墙。
          </p>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted cursor-pointer"
            >
              明天再来
            </button>
            <a
              href="https://www.9e.lv/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
            >
              去玖亿AI看看
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
