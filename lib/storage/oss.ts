import OSS from "ali-oss";
import type { StorageDriver } from "./index";

type AliOssCtor = new (options: OSS.Options) => OSS;
const OSSCtor =
  (OSS as unknown as { default?: AliOssCtor }).default ??
  (OSS as unknown as AliOssCtor);

let client: OSS | null = null;
let cachedPublicBase = "";

function getConfig(): { client: OSS; publicBase: string } {
  if (client && cachedPublicBase) return { client, publicBase: cachedPublicBase };
  const {
    OSS_ACCESS_KEY_ID,
    OSS_ACCESS_KEY_SECRET,
    OSS_BUCKET,
    OSS_REGION,
    OSS_PUBLIC_BASE_URL,
  } = process.env;
  if (
    !OSS_ACCESS_KEY_ID ||
    !OSS_ACCESS_KEY_SECRET ||
    !OSS_BUCKET ||
    !OSS_REGION ||
    !OSS_PUBLIC_BASE_URL
  ) {
    throw new Error(
      "OSS not configured: 需要 OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET / OSS_BUCKET / OSS_REGION / OSS_PUBLIC_BASE_URL",
    );
  }
  client = new OSSCtor({
    accessKeyId: OSS_ACCESS_KEY_ID,
    accessKeySecret: OSS_ACCESS_KEY_SECRET,
    bucket: OSS_BUCKET,
    region: OSS_REGION,
  });
  cachedPublicBase = OSS_PUBLIC_BASE_URL.replace(/\/+$/, "");
  return { client, publicBase: cachedPublicBase };
}

export const driver: StorageDriver = {
  async uploadImage(buf, key, contentType = "image/png") {
    await getConfig().client.put(key, buf, {
      headers: { "Content-Type": contentType },
    });
  },
  imageUrl(key) {
    return `${getConfig().publicBase}/${key}`;
  },
  async deleteObject(key) {
    await getConfig().client.delete(key);
  },
};
