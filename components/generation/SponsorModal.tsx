"use client";

import { useEffect, useState } from "react";
import { X, ExternalLink, Sparkles, Loader2 } from "lucide-react";
import { PACKAGES } from "@/lib/epay";
import { toast } from "@/components/ui/Toast";

interface SponsorModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SponsorModal({ open, onClose }: SponsorModalProps) {
  const [buying, setBuying] = useState<string | null>(null);

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

  const handleBuy = async (packageId: string) => {
    if (buying) return;
    setBuying(packageId);
    try {
      const res = await fetch("/api/pay/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
      });
      const data = await res.json();
      if (!res.ok || !data.payUrl) {
        toast(data.error || "下单失败，请重试", "error");
        setBuying(null);
        return;
      }
      window.location.href = data.payUrl;
    } catch {
      toast("下单失败，请重试", "error");
      setBuying(null);
    }
  };

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
            购买积分
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">
            积分用于生成图片：文生图消耗 1 积分，图生图消耗 2 积分。生成失败自动退还积分。
          </p>

          <div className="flex flex-col gap-2">
            {PACKAGES.map((pkg) => (
              <button
                key={pkg.id}
                type="button"
                disabled={buying !== null}
                onClick={() => handleBuy(pkg.id)}
                className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-left transition-colors hover:border-accent hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="text-sm font-medium text-foreground">{pkg.label}</span>
                <span className="flex items-center gap-2 text-sm font-medium text-accent">
                  {buying === pkg.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  ¥{pkg.amount}
                </span>
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-border bg-muted/40 p-3">
            <p className="text-xs leading-relaxed text-muted-foreground">
              本项目由 <span className="font-medium text-foreground">玖亿AI</span> 赞助。一站式 AI 聚合站，深度集成 ChatGPT、Claude、Gemini、Grok 等镜像，ChatGPT 镜像 Image 2 画图，不限量使用。
            </p>
            <a
              href="https://www.9e.lv/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"
            >
              去玖亿AI看看
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
