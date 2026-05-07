import { cn } from "@/lib/utils";

export default function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-5 w-5 rounded-full border-2 border-muted-foreground border-t-accent animate-spin",
        className
      )}
    />
  );
}
