// scripts/cleanup-temp.ts
// 清理 R2 / OSS 上 temp/ 前缀里超过 24 小时的对象。
// 用法：作为 cron 每日运行一次。
//
//   tsx scripts/cleanup-temp.ts
//
// 用 R2 时它通过 S3 ListObjectsV2 列 temp/ 然后批量删。
// 切换到 OSS 时也支持（ali-oss 的 list/delete API）。

import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local", override: false });
dotenvConfig({ path: ".env", override: false });

async function main() {
  const provider = (process.env.STORAGE_PROVIDER || "r2").toLowerCase();
  const cutoffMs = Date.now() - 24 * 60 * 60 * 1000;

  if (provider === "r2") {
    await cleanR2(cutoffMs);
  } else if (provider === "oss") {
    await cleanOss(cutoffMs);
  } else {
    throw new Error(`unknown STORAGE_PROVIDER=${provider}`);
  }
}

async function cleanR2(cutoffMs: number) {
  const {
    S3Client,
    ListObjectsV2Command,
    DeleteObjectsCommand,
  } = await import("@aws-sdk/client-s3");

  const {
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET,
    R2_ENDPOINT,
  } = process.env;

  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
    throw new Error("R2 not configured");
  }

  const endpoint =
    R2_ENDPOINT ||
    (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : "");
  if (!endpoint) throw new Error("R2 endpoint missing");

  const client = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });

  let continuationToken: string | undefined;
  let totalDeleted = 0;
  do {
    const list = await client.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        Prefix: "temp/",
        ContinuationToken: continuationToken,
      }),
    );
    const stale = (list.Contents ?? []).filter((o) => {
      if (!o.Key || !o.LastModified) return false;
      return o.LastModified.getTime() < cutoffMs;
    });
    if (stale.length > 0) {
      // Delete in chunks of 1000 (S3 limit).
      for (let i = 0; i < stale.length; i += 1000) {
        const batch = stale.slice(i, i + 1000);
        await client.send(
          new DeleteObjectsCommand({
            Bucket: R2_BUCKET,
            Delete: { Objects: batch.map((o) => ({ Key: o.Key! })) },
          }),
        );
        totalDeleted += batch.length;
      }
    }
    continuationToken = list.IsTruncated ? list.NextContinuationToken : undefined;
  } while (continuationToken);

  console.log(`[cleanup-temp] r2: deleted ${totalDeleted} stale objects under temp/`);
}

async function cleanOss(cutoffMs: number) {
  // OSS client expects mariadb-style require import; for our small batch usage
  // we re-use the ali-oss SDK directly.
  type AliOssCtor = new (options: {
    accessKeyId: string;
    accessKeySecret: string;
    bucket: string;
    region: string;
  }) => {
    list(opts: { prefix?: string; "max-keys"?: number; marker?: string }): Promise<{
      objects?: { name: string; lastModified: string }[];
      nextMarker?: string;
    }>;
    delete(key: string): Promise<unknown>;
  };
  const OSSModule = await import("ali-oss");
  const OSSCtor =
    (OSSModule as unknown as { default?: AliOssCtor }).default ??
    (OSSModule as unknown as AliOssCtor);

  const {
    OSS_ACCESS_KEY_ID,
    OSS_ACCESS_KEY_SECRET,
    OSS_BUCKET,
    OSS_REGION,
  } = process.env;
  if (!OSS_ACCESS_KEY_ID || !OSS_ACCESS_KEY_SECRET || !OSS_BUCKET || !OSS_REGION) {
    throw new Error("OSS not configured");
  }

  const client = new OSSCtor({
    accessKeyId: OSS_ACCESS_KEY_ID,
    accessKeySecret: OSS_ACCESS_KEY_SECRET,
    bucket: OSS_BUCKET,
    region: OSS_REGION,
  });

  let marker: string | undefined;
  let totalDeleted = 0;
  do {
    const res = await client.list({ prefix: "temp/", "max-keys": 1000, marker });
    const stale = (res.objects ?? []).filter(
      (o) => new Date(o.lastModified).getTime() < cutoffMs,
    );
    for (const o of stale) {
      try {
        await client.delete(o.name);
        totalDeleted++;
      } catch (err) {
        console.error(`[cleanup-temp] failed ${o.name}:`, err);
      }
    }
    marker = res.nextMarker;
  } while (marker);

  console.log(`[cleanup-temp] oss: deleted ${totalDeleted} stale objects under temp/`);
}

main().catch((err) => {
  console.error("[cleanup-temp] fatal:", err);
  process.exit(1);
});
