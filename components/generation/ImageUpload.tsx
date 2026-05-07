"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X } from "lucide-react";

interface ImageUploadProps {
  image: string | null;
  onImageChange: (base64: string | null) => void;
  disabled?: boolean;
}

export default function ImageUpload({ image, onImageChange, disabled }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      if (file.size > 20 * 1024 * 1024) return;
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip the data:...;base64, prefix
        const base64 = result.split(",")[1];
        onImageChange(base64);
      };
      reader.readAsDataURL(file);
    },
    [onImageChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  if (image) {
    return (
      <div className="relative rounded-xl border border-border overflow-hidden">
        <img
          src={`data:image/png;base64,${image}`}
          alt="Reference"
          className="h-40 w-full object-contain bg-muted"
        />
        <button
          onClick={() => onImageChange(null)}
          disabled={disabled}
          className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white transition-opacity hover:bg-black/80 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 transition-colors ${
        isDragging ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
      } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
    >
      <Upload className="h-6 w-6 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        拖拽或点击上传参考图片
      </p>
      <p className="text-xs text-muted-foreground">支持 PNG、JPG，最大 20MB</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
