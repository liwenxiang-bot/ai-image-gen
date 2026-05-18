"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { avatarUrl } from "@/lib/avatar";

type GalleryItem = {
  id: string;
  prompt: string;
  imageUrl: string;
  size: string;
  createdAt: number;
  author: string;
  authorSeed: string;
};

/** Parse "1024x1536" → "1024 / 1536"; fallback to 1 for "auto" / unknown */
function parseAspectRatio(size: string): string {
  const m = /^(\d+)x(\d+)$/.exec(size);
  if (!m) return "1 / 1";
  return `${m[1]} / ${m[2]}`;
}

interface GalleryProps {
  /** preview 模式：固定取前 N 张 + "探索更多 →" 链接，不开无限滚动 */
  limit?: number;
}

export default function Gallery({ limit }: GalleryProps) {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const previewMode = typeof limit === "number";

  const fetchPage = useCallback(async (cur: string | null) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const qs = cur ? `?cursor=${encodeURIComponent(cur)}` : "";
      const res = await fetch(`/api/gallery${qs}`, { cache: "no-store" });
      const data = (await res.json()) as { items: GalleryItem[]; nextCursor: string | null };
      setItems((prev) => (cur ? [...prev, ...data.items] : data.items));
      setCursor(data.nextCursor);
      setHasMore(Boolean(data.nextCursor));
    } catch {
      // ignore
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchPage(null);
  }, [fetchPage]);

  useEffect(() => {
    if (previewMode) return;
    const node = sentinelRef.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e.isIntersecting && hasMore && !loadingRef.current) {
          void fetchPage(cursor);
        }
      },
      { rootMargin: "400px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [previewMode, hasMore, cursor, fetchPage]);

  const displayed = previewMode ? items.slice(0, limit) : items;
  const isEmpty = !loading && displayed.length === 0;

  if (isEmpty && previewMode) return null;

  return (
    <>
      {isEmpty && !previewMode && (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
          <p className="text-sm">还没有公开的作品</p>
          <p className="text-xs">登录后生成图片，并把心仪的作品公开到这里</p>
        </div>
      )}

      <div className="columns-2 gap-3 sm:columns-3 md:gap-4 lg:columns-4 [&>*]:mb-3 md:[&>*]:mb-4">
        {displayed.map((it, i) => {
          const ar = parseAspectRatio(it.size);
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => setPreviewIndex(i)}
              className="group relative block w-full overflow-hidden rounded-xl border border-border bg-muted text-left transition-all hover:shadow-xl hover:scale-[1.015] animate-fade-in break-inside-avoid"
              style={{ animationDelay: `${(i % 12) * 30}ms`, aspectRatio: ar }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={it.imageUrl}
                alt={it.prompt}
                className="block h-full w-full object-cover opacity-0 transition-opacity duration-300"
                loading="lazy"
                crossOrigin="anonymous"
                onLoad={(e) => {
                  e.currentTarget.style.opacity = "1";
                }}
              />
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="flex w-full items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatarUrl(it.authorSeed, 32)}
                    alt={it.author}
                    className="h-5 w-5 shrink-0 rounded-full bg-white/30"
                  />
                  <span className="truncate text-[11px] text-white/90">{it.author}</span>
                </div>
              </div>
            </button>
          );
        })}

        {loading && displayed.length === 0 &&
          Array.from({ length: previewMode ? (limit as number) : 12 }).map((_, i) => (
            <div
              key={i}
              className="mb-3 md:mb-4 rounded-xl skeleton-shimmer break-inside-avoid"
              style={{ height: `${180 + ((i * 47) % 160)}px` }}
            />
          ))}
      </div>

      {previewMode && displayed.length > 0 && (
        <div className="mt-6 flex justify-center">
          <Link
            href="/gallery"
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/10"
          >
            探索更多作品
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {!previewMode && <div ref={sentinelRef} className="h-8" aria-hidden />}

      {!previewMode && loading && displayed.length > 0 && (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-foreground/55">
          <Loader2 className="h-4 w-4 animate-spin" />
          加载中...
        </div>
      )}

      {!previewMode && !hasMore && !loading && displayed.length > 0 && (
        <div className="py-8 text-center text-xs text-foreground/40">
          已经到底啦 · 共 {displayed.length} 件作品
        </div>
      )}

      {previewIndex !== null && (
        <PreviewModal
          items={displayed}
          index={previewIndex}
          onClose={() => setPreviewIndex(null)}
          onIndexChange={setPreviewIndex}
        />
      )}
    </>
  );
}

function PreviewModal({
  items,
  index,
  onClose,
  onIndexChange,
}: {
  items: GalleryItem[];
  index: number;
  onClose: () => void;
  onIndexChange: (i: number) => void;
}) {
  const router = useRouter();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const touchStartX = useRef<number | null>(null);
  const item = items[index];
  const copied = copiedId === item.id;
  const hasPrev = index > 0;
  const hasNext = index < items.length - 1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && hasPrev) onIndexChange(index - 1);
      else if (e.key === "ArrowRight" && hasNext) onIndexChange(index + 1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, hasPrev, hasNext, index, onIndexChange]);

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 1) return;
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 50) return;
    if (delta > 0 && hasPrev) onIndexChange(index - 1);
    else if (delta < 0 && hasNext) onIndexChange(index + 1);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(item.prompt);
    } catch {
      // ignore
    }
    setCopiedId(item.id);
    setTimeout(() => {
      setCopiedId((current) => (current === item.id ? null : current));
    }, 1800);
  };

  const handleDownload = async () => {
    try {
      const res = await fetch(item.imageUrl, { mode: "cors" });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `gallery-${item.id}.png`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  };

  const handleRemix = () => {
    router.push(`/?prompt=${encodeURIComponent(item.prompt)}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[#1a1d23]/95 backdrop-blur-md"
      onClick={onClose}
    >
      {/* Close (top right) */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
        aria-label="关闭"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Stage: prev arrow + image + next arrow */}
      <div
        className="flex flex-1 items-center justify-center gap-3 px-4 py-6 md:px-10"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <NavArrow
          dir="prev"
          disabled={!hasPrev}
          peek={hasPrev ? items[index - 1] : null}
          onClick={() => onIndexChange(index - 1)}
        />

        <div className="flex flex-1 items-center justify-center">
          <StageImage key={item.id} item={item} />
        </div>

        <NavArrow
          dir="next"
          disabled={!hasNext}
          peek={hasNext ? items[index + 1] : null}
          onClick={() => onIndexChange(index + 1)}
        />
      </div>

      {/* Bottom info bar */}
      <div
        className="mx-auto w-full max-w-4xl px-4 pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-2xl bg-black/40 p-4 ring-1 ring-white/10 backdrop-blur">
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm text-white/85 leading-relaxed">
                {item.prompt}
              </p>
              <div className="mt-3 flex items-center gap-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarUrl(item.authorSeed, 64)}
                  alt={item.author}
                  className="h-8 w-8 rounded-full bg-white/10 ring-2 ring-white/15"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-white">{item.author}</span>
                  <span className="text-[11px] text-white/45">
                    {new Date(item.createdAt).toLocaleString("zh-CN")}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <ActionButton onClick={handleCopy} icon={copied ? Check : Copy}>
                {copied ? "已复制" : "复制提示词"}
              </ActionButton>
              <ActionButton onClick={handleDownload} icon={Download}>
                保存原图
              </ActionButton>
              <ActionButton onClick={handleRemix} icon={Sparkles} primary>
                用这个提示词
              </ActionButton>
            </div>
          </div>
        </div>

        <div className="mt-2 text-center text-[11px] text-white/35">
          {index + 1} / {items.length}
        </div>
      </div>
    </div>
  );
}

function NavArrow({
  dir,
  disabled,
  peek,
  onClick,
}: {
  dir: "prev" | "next";
  disabled: boolean;
  peek: GalleryItem | null;
  onClick: () => void;
}) {
  if (disabled) {
    return <div className="hidden w-16 shrink-0 md:block" aria-hidden />;
  }
  const Icon = dir === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative hidden h-24 w-16 shrink-0 items-center justify-center md:flex"
      aria-label={dir === "prev" ? "上一张" : "下一张"}
    >
      {peek && <PeekImage key={peek.id} item={peek} />}
      <Icon className="relative h-6 w-6 text-white drop-shadow" />
    </button>
  );
}

function StageImage({ item }: { item: GalleryItem }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative flex w-full items-center justify-center min-h-[60vh]">
      {!loaded && (
        <div className="absolute inset-0 m-auto h-[60vh] w-full max-w-3xl rounded-xl animate-pulse bg-white/5" aria-hidden />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.imageUrl}
        alt={item.prompt}
        className={`max-h-[75vh] max-w-full rounded-xl object-contain shadow-2xl select-none transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        crossOrigin="anonymous"
        draggable={false}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
      />
    </div>
  );
}

function PeekImage({ item }: { item: GalleryItem }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="absolute inset-0 overflow-hidden rounded-xl opacity-40 transition-opacity group-hover:opacity-70">
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-white/5" aria-hidden />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.imageUrl}
        alt=""
        className={`h-full w-full object-cover blur-[1px] transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        crossOrigin="anonymous"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
      />
      <div className="absolute inset-0 bg-black/40" />
    </div>
  );
}

function ActionButton({
  onClick,
  icon: Icon,
  children,
  primary,
}: {
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-all " +
        (primary
          ? "bg-white text-black hover:bg-white/90"
          : "bg-white/10 text-white hover:bg-white/20")
      }
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{children}</span>
    </button>
  );
}
