"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "生成" },
  { href: "/gallery", label: "画廊" },
];

export default function HeaderNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 rounded-full bg-muted/60 p-1">
      {links.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition-all",
              active
                ? "bg-accent text-accent-foreground shadow-sm"
                : "text-foreground/65 hover:text-foreground",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
