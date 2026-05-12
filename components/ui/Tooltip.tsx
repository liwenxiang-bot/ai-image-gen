"use client";

import { cn } from "@/lib/utils";

interface TooltipProps {
  label: string;
  side?: "top" | "bottom";
  className?: string;
  children: React.ReactNode;
}

/**
 * 极简 CSS-only Tooltip。包裹一个元素即可：
 *
 *   <Tooltip label="公开到画廊">
 *     <button>...</button>
 *   </Tooltip>
 *
 * 进入 100ms 后显示（远快于浏览器原生 title 的 ~1s）。
 */
export default function Tooltip({
  label,
  side = "top",
  className,
  children,
}: TooltipProps) {
  return (
    <span className={cn("relative inline-flex group/tip", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap",
          "rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background",
          "opacity-0 transition-opacity duration-150 delay-100 group-hover/tip:opacity-100",
          side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5",
        )}
      >
        {label}
      </span>
    </span>
  );
}
