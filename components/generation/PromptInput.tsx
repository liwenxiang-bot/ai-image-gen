"use client";

import { useRef, useEffect } from "react";
import { Sparkles, Loader2, X } from "lucide-react";

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  onEnhance?: () => void;
  isEnhancing?: boolean;
}

export default function PromptInput({
  value,
  onChange,
  disabled,
  onEnhance,
  isEnhancing,
}: PromptInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 200) + "px";
    }
  }, [value]);

  const canEnhance = value.trim().length > 0 && !disabled && !isEnhancing;
  const canClear = value.length > 0 && !disabled;

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="描述你想要生成的图片..."
        rows={3}
        className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 pr-24 pb-9 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-50"
      />
      {canClear && (
        <button
          type="button"
          onClick={() => {
            onChange("");
            ref.current?.focus();
          }}
          title="清空"
          aria-label="清空"
          className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      {onEnhance && (
        <button
          type="button"
          onClick={onEnhance}
          disabled={!canEnhance}
          title="AI 优化提示词"
          className="absolute right-2 top-2 flex items-center gap-1.5 rounded-lg bg-accent/10 px-2.5 py-1.5 text-xs font-medium text-accent transition-all hover:bg-accent/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {isEnhancing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {isEnhancing ? "优化中" : "AI 优化"}
        </button>
      )}
    </div>
  );
}
