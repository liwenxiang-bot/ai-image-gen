export type GenerationMode = "text-to-image" | "image-to-image";

export type ImageSize =
  | "1024x1024"
  | "1024x1536"
  | "1536x1024"
  | "2048x2048"
  | "2048x1152"
  | "1152x2048"
  | "3840x2160"
  | "2160x3840"
  | "auto";

export type ImageQuality = "low" | "medium" | "high" | "auto";

export interface GenerationParams {
  prompt: string;
  mode: GenerationMode;
  images?: string[];
  size: ImageSize;
  quality: ImageQuality;
}

export const MAX_IMAGES = 4;
export const MAX_INPUT_IMAGE_BYTES = 20 * 1024 * 1024;
export const MAX_INPUT_IMAGE_MB = MAX_INPUT_IMAGE_BYTES / (1024 * 1024);

export interface GenerationResult {
  success: true;
  id: string;
  imageUrl: string;
  isPublic: boolean;
  revisedPrompt?: string;
  createdAt: number;
}

export interface GenerationError {
  success: false;
  error: string;
}

export type GenerationResponse = GenerationResult | GenerationError;

export interface HistoryItem {
  id: string;
  prompt: string;
  imageUrl: string;
  mode: GenerationMode;
  size: string;
  quality: string;
  isPublic: boolean;
  revisedPrompt?: string;
  createdAt: number;
}
