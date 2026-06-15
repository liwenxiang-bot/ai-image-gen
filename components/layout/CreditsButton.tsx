"use client";

import { useState } from "react";
import { Coins } from "lucide-react";
import { useQuota } from "@/hooks/useQuota";
import SponsorModal from "@/components/generation/SponsorModal";

/**
 * 顶栏常驻积分入口：显示当前积分余额，点击随时打开购买积分弹窗充值。
 * 未登录（取不到额度）时不渲染。
 */
export default function CreditsButton() {
  const { quota } = useQuota();
  const [open, setOpen] = useState(false);

  if (!quota) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:border-accent hover:bg-muted hover:text-foreground sm:px-2.5"
        aria-label="积分余额，点击充值"
      >
        <Coins className="h-3.5 w-3.5 shrink-0 text-accent" />
        <span className="tabular-nums">{quota.credits}</span>
        <span className="hidden text-foreground/40 sm:inline">·</span>
        <span className="hidden sm:inline">充值</span>
      </button>
      <SponsorModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
