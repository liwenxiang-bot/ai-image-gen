// Storage provider abstraction. Pick at runtime with STORAGE_PROVIDER env.
// Currently supports:
//   - "r2"  → Cloudflare R2 (S3 compatible)
//   - "oss" → 阿里云 OSS
// Both implement the same StorageDriver interface below.
// Both expect a publicly-readable bucket and use permanent URLs.

export interface StorageDriver {
  uploadImage(buf: Buffer, key: string, contentType?: string): Promise<void>;
  imageUrl(key: string): string;
  deleteObject(key: string): Promise<void>;
}

type ProviderName = "r2" | "oss";

function pickProvider(): ProviderName {
  const v = (process.env.STORAGE_PROVIDER || "r2").toLowerCase();
  if (v === "oss") return "oss";
  return "r2";
}

let cached: StorageDriver | null = null;
let cachedFor: ProviderName | null = null;

async function load(): Promise<StorageDriver> {
  const want = pickProvider();
  if (cached && cachedFor === want) return cached;
  const mod =
    want === "oss"
      ? await import("./oss")
      : await import("./r2");
  cached = mod.driver;
  cachedFor = want;
  return cached;
}

export async function uploadImage(
  buf: Buffer,
  key: string,
  contentType = "image/png",
): Promise<void> {
  const d = await load();
  await d.uploadImage(buf, key, contentType);
}

export async function imageUrl(key: string): Promise<string> {
  const d = await load();
  return d.imageUrl(key);
}

export async function deleteObject(key: string): Promise<void> {
  const d = await load();
  await d.deleteObject(key);
}

export function buildImageKey(userId: string, ext = "png"): string {
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const nano = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  return `users/${userId}/${yyyymm}/${nano}.${ext}`;
}

export function currentProvider(): ProviderName {
  return pickProvider();
}
