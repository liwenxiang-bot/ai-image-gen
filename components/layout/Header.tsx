import Link from "next/link";
import { Palette } from "lucide-react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import UserMenu from "@/components/layout/UserMenu";
import HeaderNav from "@/components/layout/HeaderNav";
import CreditsButton from "@/components/layout/CreditsButton";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10">
            <Palette className="h-5 w-5 text-accent" />
          </div>
          <span className="hidden whitespace-nowrap text-base font-bold tracking-tight sm:inline sm:text-lg">
            GPT Image 2
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <HeaderNav />
          <CreditsButton />
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
