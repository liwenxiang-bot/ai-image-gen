import { prisma } from "../../lib/prisma";
import { buildImageKey, deleteObject, uploadImage } from "../../lib/storage";
import {
  markDone,
  markFailed,
  markRunning,
  publishJob,
  toPayload,
} from "../../lib/jobs";

const MAX_IMAGES = 4;

type InputImage = {
  buffer: Buffer;
  mimeType: string;
  filename: string;
};

function imageTypeFromKey(key: string): { mimeType: string; ext: string } {
  const ext = key.split(".").pop()?.toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return { mimeType: "image/jpeg", ext: "jpg" };
  if (ext === "webp") return { mimeType: "image/webp", ext: "webp" };
  return { mimeType: "image/png", ext: "png" };
}

function normalizeImageContentType(value: string | null, fallback: string): string {
  const contentType = value?.split(";")[0]?.trim().toLowerCase();
  if (contentType === "image/png" || contentType === "image/jpeg" || contentType === "image/webp") {
    return contentType;
  }
  return fallback;
}

async function fetchInputImages(keys: string[]): Promise<InputImage[]> {
  // The inputs are stored under the public bucket using temp/ prefix.
  // Easiest fetch via the public base URL.
  const base = (process.env.R2_PUBLIC_BASE_URL || process.env.OSS_PUBLIC_BASE_URL || "").replace(
    /\/+$/,
    "",
  );
  if (!base) throw new Error("公共图片域名未配置 (R2_PUBLIC_BASE_URL)");
  const images: InputImage[] = [];
  for (const key of keys.slice(0, MAX_IMAGES)) {
    const fromKey = imageTypeFromKey(key);
    const res = await fetch(`${base}/${key}`);
    if (!res.ok) throw new Error(`无法读取输入图 ${key}: HTTP ${res.status}`);
    const ab = await res.arrayBuffer();
    const mimeType = normalizeImageContentType(res.headers.get("content-type"), fromKey.mimeType);
    const ext = mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1];
    images.push({
      buffer: Buffer.from(ab),
      mimeType,
      filename: `image-${images.length}.${ext}`,
    });
  }
  return images;
}

async function callOpenAi(opts: {
  mode: string;
  prompt: string;
  size: string;
  quality: string;
  inputs: InputImage[];
}): Promise<{ buffer: Buffer; revisedPrompt: string | null }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("未配置 OPENAI_API_KEY");
  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com").replace(/\/+$/, "");

  let resp: Response;
  if (opts.mode === "image-to-image" && opts.inputs.length > 0) {
    const form = new FormData();
    form.append("model", "gpt-image-2");
    form.append("prompt", opts.prompt);
    form.append("n", "1");
    if (opts.size && opts.size !== "auto") form.append("size", opts.size);
    if (opts.quality) form.append("quality", opts.quality);
    opts.inputs.forEach((input) => {
      const u8 = new Uint8Array(input.buffer);
      const blob = new Blob([u8], { type: input.mimeType });
      form.append("image[]", blob, input.filename);
    });
    resp = await fetch(`${baseUrl}/v1/images/edits`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
  } else {
    const payload: Record<string, unknown> = {
      model: "gpt-image-2",
      prompt: opts.prompt,
      n: 1,
      quality: opts.quality || "auto",
    };
    if (opts.size && opts.size !== "auto") payload.size = opts.size;
    resp = await fetch(`${baseUrl}/v1/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
  }

  if (!resp.ok) {
    const errData = await resp.json().catch(() => ({}));
    const msg =
      errData?.error?.message ||
      errData?.message ||
      `OpenAI API 请求失败 (${resp.status})`;
    throw new Error(msg);
  }

  const data = await resp.json();
  const imageData = data?.data?.[0];
  if (!imageData) throw new Error("OpenAI API 返回数据格式异常");

  let buffer: Buffer;
  if (imageData.b64_json) {
    buffer = Buffer.from(imageData.b64_json, "base64");
  } else if (imageData.url) {
    const r = await fetch(imageData.url);
    const ab = await r.arrayBuffer();
    buffer = Buffer.from(ab);
  } else {
    throw new Error("OpenAI API 没有返回图片");
  }

  return { buffer, revisedPrompt: imageData.revised_prompt ?? null };
}

async function publish(userId: string, jobId: string) {
  const fresh = await prisma.job.findUnique({ where: { id: jobId } });
  if (fresh) await publishJob(userId, toPayload(fresh));
}

export async function processGenerateJob(jobId: string): Promise<void> {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new Error(`job not found: ${jobId}`);

  if (job.status === "cancelled") {
    // User cancelled while still in queue; clean up inputs and exit.
    const inputKeys = (job.inputKeys as string[] | null) ?? [];
    for (const key of inputKeys) {
      void deleteObject(key).catch(() => {});
    }
    return;
  }

  if (job.status !== "queued") {
    // Already taken (could happen on worker restart). Skip silently.
    return;
  }

  await markRunning(jobId);
  await publish(job.userId, jobId);

  const inputKeys = (job.inputKeys as string[] | null) ?? [];

  try {
    const inputs =
      job.mode === "image-to-image" && inputKeys.length > 0
        ? await fetchInputImages(inputKeys)
        : [];

    const { buffer, revisedPrompt } = await callOpenAi({
      mode: job.mode,
      prompt: job.prompt,
      size: job.size,
      quality: job.quality,
      inputs,
    });

    const key = buildImageKey(job.userId);
    await uploadImage(buffer, key);

    const image = await prisma.image.create({
      data: {
        userId: job.userId,
        ossKey: key,
        prompt: job.prompt,
        revisedPrompt,
        mode: job.mode,
        size: job.size,
        quality: job.quality,
        isPublic: false,
      },
    });

    await markDone(jobId, image.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "处理失败";
    await markFailed(jobId, message);
  } finally {
    // Cleanup temp inputs regardless of outcome.
    for (const key of inputKeys) {
      void deleteObject(key).catch(() => {});
    }
    await publish(job.userId, jobId);
  }
}
