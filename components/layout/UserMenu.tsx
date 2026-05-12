"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut, User } from "lucide-react";
import { avatarUrl } from "@/lib/avatar";

type Me = { id: string; openid: string; nickname: string | null } | null;

export default function UserMenu() {
  const [me, setMe] = useState<Me>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (r) => (r.ok ? (await r.json()).user : null))
      .then((u) => setMe(u))
      .catch(() => setMe(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  if (loading || !me) return null;

  const displayName = me.nickname || `用户${me.openid.slice(-6)}`;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-muted text-foreground/70 ring-1 ring-transparent transition-all hover:ring-border"
        aria-label="账户菜单"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl(me.openid, 64)}
          alt={displayName}
          className="h-full w-full object-cover"
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-background shadow-xl shadow-black/5"
        >
          {/* 身份块 */}
          <div className="flex items-center gap-3 border-b border-border/60 px-3 py-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl(me.openid, 80)}
              alt=""
              className="h-10 w-10 shrink-0 rounded-full bg-muted ring-1 ring-border/60"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-foreground">
                {displayName}
              </div>
              <div className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-muted/70 px-1.5 py-0.5 text-[10px] text-foreground/55">
                <User className="h-2.5 w-2.5" />
                微信登录
              </div>
            </div>
          </div>

          {/* 操作区 */}
          <div className="p-1">
            <button
              type="button"
              role="menuitem"
              onClick={logout}
              className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-foreground/75 transition-colors hover:bg-red-500/10 hover:text-red-600"
            >
              <LogOut className="h-4 w-4 text-foreground/55 transition-colors group-hover:text-red-500" />
              退出登录
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
