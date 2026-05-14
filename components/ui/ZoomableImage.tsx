"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const MIN_SCALE = 0.5;
const MAX_SCALE = 4;
const ZOOMED_THRESHOLD = 1.05;
const DOUBLE_TAP_SCALE = 2;

interface ZoomableImageProps {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  onZoomChange?: (zoomed: boolean) => void;
}

export default function ZoomableImage({
  src,
  alt,
  className,
  imgClassName,
  onZoomChange,
}: ZoomableImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);

  const zoomed = scale > ZOOMED_THRESHOLD;

  useEffect(() => {
    onZoomChange?.(zoomed);
  }, [zoomed, onZoomChange]);

  const clampPan = useCallback((x: number, y: number, s: number) => {
    const el = containerRef.current;
    if (!el) return { x, y };
    const rect = el.getBoundingClientRect();
    const maxX = (rect.width * (s - 1)) / 2;
    const maxY = (rect.height * (s - 1)) / 2;
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }, []);

  const reset = useCallback(() => {
    setScale(1);
    setTx(0);
    setTy(0);
  }, []);

  // Wheel zoom: needs passive: false to preventDefault, can't use onWheel prop
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left - rect.width / 2;
      const cy = e.clientY - rect.top - rect.height / 2;
      const delta = -e.deltaY * 0.0015;
      setScale((prev) => {
        const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev * (1 + delta)));
        if (next === prev) return prev;
        // Anchor zoom at cursor: translate so the cursor stays on the same pixel
        const ratio = next / prev;
        setTx((prevTx) => clampPan((prevTx - cx) * ratio + cx, ty, next).x);
        setTy((prevTy) => clampPan(tx, (prevTy - cy) * ratio + cy, next).y);
        return next;
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [clampPan, tx, ty]);

  // Pointer drag (mouse + single-finger touch). Pinch handled separately below.
  const dragRef = useRef<{ startX: number; startY: number; baseTx: number; baseTy: number; pointerId: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!zoomed) return;
    // Skip if multi-touch — pinch handler takes over
    if (pinchRef.current) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseTx: tx,
      baseTy: ty,
      pointerId: e.pointerId,
    };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    if (pinchRef.current) return;
    const nx = d.baseTx + (e.clientX - d.startX);
    const ny = d.baseTy + (e.clientY - d.startY);
    const clamped = clampPan(nx, ny, scale);
    setTx(clamped.x);
    setTy(clamped.y);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null;
  };

  // Pinch (two-finger) zoom
  const pinchRef = useRef<{ startDist: number; startScale: number; centerX: number; centerY: number; baseTx: number; baseTy: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 2) return;
    e.stopPropagation();
    const [t1, t2] = [e.touches[0], e.touches[1]];
    const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    pinchRef.current = {
      startDist: dist,
      startScale: scale,
      centerX: (t1.clientX + t2.clientX) / 2 - rect.left - rect.width / 2,
      centerY: (t1.clientY + t2.clientY) / 2 - rect.top - rect.height / 2,
      baseTx: tx,
      baseTy: ty,
    };
  };
  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const p = pinchRef.current;
    if (!p || e.touches.length !== 2) return;
    e.stopPropagation();
    const [t1, t2] = [e.touches[0], e.touches[1]];
    const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
    const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, p.startScale * (dist / p.startDist)));
    const ratio = next / p.startScale;
    const nx = (p.baseTx - p.centerX) * ratio + p.centerX;
    const ny = (p.baseTy - p.centerY) * ratio + p.centerY;
    const clamped = clampPan(nx, ny, next);
    setScale(next);
    setTx(clamped.x);
    setTy(clamped.y);
  };
  const onTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) pinchRef.current = null;
  };

  // Double tap / click: toggle between 1× and 2×
  const lastTapRef = useRef<number>(0);
  const onDoubleAction = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (zoomed) {
      reset();
    } else {
      setScale(DOUBLE_TAP_SCALE);
      setTx(0);
      setTy(0);
    }
  };
  const onTouchTap = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0 || pinchRef.current) return;
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (zoomed) reset();
      else {
        setScale(DOUBLE_TAP_SCALE);
        setTx(0);
        setTy(0);
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  return (
    <div
      ref={containerRef}
      className={
        "relative overflow-hidden touch-none select-none " +
        (zoomed ? "cursor-grab active:cursor-grabbing " : "") +
        (className ?? "")
      }
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={(e) => {
        onTouchEnd(e);
        onTouchTap(e);
      }}
      onDoubleClick={onDoubleAction}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        crossOrigin="anonymous"
        draggable={false}
        className={imgClassName}
        style={{
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          transformOrigin: "center center",
          transition: dragRef.current || pinchRef.current ? "none" : "transform 0.15s ease-out",
          willChange: "transform",
        }}
      />
      {zoomed && (
        <div className="pointer-events-none absolute right-3 bottom-3 rounded-md bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white/85 backdrop-blur-sm tabular-nums">
          {scale.toFixed(1)}×
        </div>
      )}
    </div>
  );
}
