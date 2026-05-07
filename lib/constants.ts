import type { ImageSize, ImageQuality } from "./types";

export const SIZE_OPTIONS: { value: ImageSize; label: string }[] = [
  { value: "1024x1024", label: "1024 × 1024" },
  { value: "1024x1536", label: "1024 × 1536" },
  { value: "1536x1024", label: "1536 × 1024" },
  { value: "auto", label: "自动" },
];

export const QUALITY_OPTIONS: { value: ImageQuality; label: string }[] = [
  { value: "auto", label: "自动" },
  { value: "low", label: "低" },
  { value: "medium", label: "中" },
  { value: "high", label: "高" },
];

export const MAX_HISTORY_ITEMS = 30;
