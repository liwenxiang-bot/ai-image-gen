"use client";

import { cn } from "@/lib/utils";
import type { GenerationMode } from "@/lib/types";
import { Type, ImageIcon } from "lucide-react";

interface ModeToggleProps {
  mode: GenerationMode;
  onChange: (mode: GenerationMode) => void;
}

export default function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="flex rounded-xl bg-muted p-1">
      <button
        onClick={() => onChange("text-to-image")}
        className={cn(
          "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer",
          mode === "text-to-image"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Type className="h-4 w-4" />
        文生图
      </button>
      <button
        onClick={() => onChange("image-to-image")}
        className={cn(
          "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer",
          mode === "image-to-image"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <ImageIcon className="h-4 w-4" />
        图生图
      </button>
    </div>
  );
}
