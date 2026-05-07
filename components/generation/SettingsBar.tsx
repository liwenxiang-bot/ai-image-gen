"use client";

import Select from "@/components/ui/Select";
import { SIZE_OPTIONS, QUALITY_OPTIONS } from "@/lib/constants";
import type { ImageSize, ImageQuality } from "@/lib/types";

interface SettingsBarProps {
  size: ImageSize;
  quality: ImageQuality;
  onSizeChange: (size: ImageSize) => void;
  onQualityChange: (quality: ImageQuality) => void;
  disabled?: boolean;
}

export default function SettingsBar({
  size,
  quality,
  onSizeChange,
  onQualityChange,
  disabled,
}: SettingsBarProps) {
  return (
    <div className="flex flex-wrap gap-4">
      <Select
        label="尺寸"
        options={SIZE_OPTIONS}
        value={size}
        onChange={(e) => onSizeChange(e.target.value as ImageSize)}
        disabled={disabled}
      />
      <Select
        label="质量"
        options={QUALITY_OPTIONS}
        value={quality}
        onChange={(e) => onQualityChange(e.target.value as ImageQuality)}
        disabled={disabled}
      />
    </div>
  );
}
