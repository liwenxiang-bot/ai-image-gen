import { Palette } from "lucide-react";
import ThemeToggle from "@/components/ui/ThemeToggle";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <Palette className="h-5 w-5 text-accent" />
          </div>
          <span className="text-lg font-bold tracking-tight">GPT Image 2</span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://www.9e.lv/"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-accent bg-accent/10 transition-colors hover:bg-accent/20"
          >
            玖亿AI
          </a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
