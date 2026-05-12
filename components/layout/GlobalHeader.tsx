"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/layout/Header";

/**
 * Renders <Header /> on every page except routes that are intentionally
 * chromeless (e.g. login). Lives in the root layout so the user menu /
 * theme toggle / job panel state aren't remounted on route changes.
 */
export default function GlobalHeader() {
  const pathname = usePathname();
  if (pathname?.startsWith("/login")) return null;
  return <Header />;
}
