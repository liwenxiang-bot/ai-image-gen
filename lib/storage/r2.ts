// Cloudflare R2 driver (S3 compatible). Bucket must be publicly readable —
// images are accessed via the permanent R2_PUBLIC_BASE_URL.
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import type { StorageDriver } from "./index";

let client: S3Client | null = null;
let cachedBucket = "";
let cachedPublicBase = "";

function getConfig(): { client: S3Client; bucket: string; publicBase: string } {
  if (client && cachedBucket && cachedPublicBase) {
    return { client, bucket: cachedBucket, publicBase: cachedPublicBase };
  }
  const {
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET,
    R2_ENDPOINT,
    R2_PUBLIC_BASE_URL,
  } = process.env;

  const endpoint =
    R2_ENDPOINT ||
    (R2_ACCOUNT_ID
      ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
      : "");

  if (
    !endpoint ||
    !R2_ACCESS_KEY_ID ||
    !R2_SECRET_ACCESS_KEY ||
    !R2_BUCKET ||
    !R2_PUBLIC_BASE_URL
  ) {
    throw new Error(
      "R2 not configured: 需要 R2_ACCOUNT_ID (或 R2_ENDPOINT) / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET / R2_PUBLIC_BASE_URL",
    );
  }

  client = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
  cachedBucket = R2_BUCKET;
  cachedPublicBase = R2_PUBLIC_BASE_URL.replace(/\/+$/, "");
  return { client, bucket: cachedBucket, publicBase: cachedPublicBase };
}

export const driver: StorageDriver = {
  async uploadImage(buf, key, contentType = "image/png") {
    const { client, bucket } = getConfig();
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buf,
        ContentType: contentType,
      }),
    );
  },
  imageUrl(key) {
    const { publicBase } = getConfig();
    return `${publicBase}/${key}`;
  },
  async deleteObject(key) {
    const { client, bucket } = getConfig();
    await client.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: key }),
    );
  },
};
