"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/layout/Footer";

export default function GlobalFooter() {
  const pathname = usePathname();
  if (pathname?.startsWith("/login")) return null;
  return <Footer />;
}
