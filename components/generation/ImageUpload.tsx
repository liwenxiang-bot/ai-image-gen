"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X, Plus } from "lucide-react";
import { MAX_IMAGES, MAX_INPUT_IMAGE_BYTES, MAX_INPUT_IMAGE_MB } from "@/lib/types";

interface ImageUploadProps {
  images: string[];
  onImagesChange: (next: string[]) => void;
  disabled?: boolean;
  maxCount?: number;
}

type ReadImageResult =
  | { ok: true; dataUrl: string }
  | { ok: false; message: string };

function imageSrc(image: string): string {
  return image.startsWith("data:") ? image : `data:image/png;base64,${image}`;
}

function readImage(file: File): Promise<ReadImageResult> {
  return new Promise((resolve) => {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      resolve({ ok: false, message: "仅支持 PNG、JPG、WebP 图片" });
      return;
    }
    if (file.size > MAX_INPUT_IMAGE_BYTES) {
      resolve({ ok: false, message: `单张图片最大 ${MAX_INPUT_IMAGE_MB}MB` });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve({ ok: true, dataUrl: result });
    };
    reader.onerror = () => resolve({ ok: false, message: "图片读取失败，请重试" });
    reader.readAsDataURL(file);
  });
}

export default function ImageUpload({
  images,
  onImagesChange,
  disabled,
  maxCount = MAX_IMAGES,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const remaining = maxCount - images.length;

  const addFiles = useCallback(
    async (files: File[]) => {
      if (remaining <= 0 || files.length === 0) return;
      const slice = files.slice(0, remaining);
      const results = await Promise.all(slice.map(readImage));
      const valid = results
        .filter((result): result is { ok: true; dataUrl: string } => result.ok)
        .map((result) => result.dataUrl);
      const invalid = results.find((result): result is { ok: false; message: string } => !result.ok);
      setMessage(invalid?.message ?? null);
      if (valid.length > 0) onImagesChange([...images, ...valid]);
    },
    [images, onImagesChange, remaining]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      addFiles(Array.from(e.dataTransfer.files));
    },
    [addFiles]
  );

  const removeAt = (idx: number) => {
    onImagesChange(images.filter((_, i) => i !== idx));
  };

  const triggerSelect = () => {
    if (disabled || remaining <= 0) return;
    inputRef.current?.click();
  };

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="image/png,image/jpeg,image/webp"
      multiple
      className="hidden"
      onChange={(e) => {
        const files = e.target.files ? Array.from(e.target.files) : [];
        if (files.length > 0) addFiles(files);
        e.target.value = "";
      }}
    />
  );

  if (images.length === 0) {
    return (
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={triggerSelect}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 transition-colors ${
          isDragging ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
        } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
      >
        <Upload className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">拖拽或点击上传参考图片（最多 {maxCount} 张）</p>
        <p className="text-xs text-muted-foreground">支持 PNG、JPG、WebP，单张最大 {MAX_INPUT_IMAGE_MB}MB</p>
        {message && <p className="text-xs text-red-500">{message}</p>}
        {fileInput}
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`rounded-xl border p-2 transition-colors ${
        isDragging ? "border-accent bg-accent/5" : "border-border"
      } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {images.map((img, idx) => (
          <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
            <img
              src={imageSrc(img)}
              alt={`Reference ${idx + 1}`}
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => removeAt(idx)}
              disabled={disabled}
              className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white transition-opacity hover:bg-black/80 cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {remaining > 0 && (
          <button
            type="button"
            onClick={triggerSelect}
            disabled={disabled}
            className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-accent/50 hover:text-accent transition-colors cursor-pointer"
          >
            <Plus className="h-5 w-5" />
            <span className="text-xs">{images.length}/{maxCount}</span>
          </button>
        )}
      </div>
      {message && <p className="mt-2 text-xs text-red-500">{message}</p>}
      {fileInput}
    </div>
  );
}
