export type GenerationMode = "text-to-image" | "image-to-image";

export type ImageSize = "1024x1024" | "1024x1536" | "1536x1024" | "auto";

export type ImageQuality = "low" | "medium" | "high" | "auto";

export interface GenerationParams {
  prompt: string;
  mode: GenerationMode;
  image?: string; // base64 encoded image for image-to-image
  size: ImageSize;
  quality: ImageQuality;
}

export interface GenerationResult {
  success: true;
  image: string; // base64
  revisedPrompt?: string;
}

export interface GenerationError {
  success: false;
  error: string;
}

export type GenerationResponse = GenerationResult | GenerationError;

export interface HistoryItem {
  id: string;
  prompt: string;
  imageBase64: string;
  mode: GenerationMode;
  size: string;
  quality: string;
  revisedPrompt?: string;
  createdAt: number;
}
