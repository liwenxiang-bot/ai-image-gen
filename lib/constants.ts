import type { ImageSize, ImageQuality } from "./types";

export const SIZE_OPTIONS: { value: ImageSize; label: string }[] = [
  { value: "1024x1024", label: "方图 · 标准" },
  { value: "1024x1536", label: "竖图 · 标准" },
  { value: "1536x1024", label: "横图 · 标准" },
  { value: "2048x2048", label: "方图 · 高清" },
  { value: "2048x1152", label: "横图 · 高清" },
  { value: "1152x2048", label: "竖图 · 高清" },
  { value: "3840x2160", label: "横图 · 4K" },
  { value: "2160x3840", label: "竖图 · 4K" },
  { value: "auto", label: "自动选择" },
];

export const QUALITY_OPTIONS: { value: ImageQuality; label: string }[] = [
  { value: "auto", label: "自动" },
  { value: "low", label: "低" },
  { value: "medium", label: "中" },
  { value: "high", label: "高" },
];

export const MAX_HISTORY_ITEMS = 30;
