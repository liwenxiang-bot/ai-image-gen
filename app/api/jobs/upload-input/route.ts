import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { uploadImage } from "@/lib/storage";
import { MAX_IMAGES, MAX_INPUT_IMAGE_BYTES, MAX_INPUT_IMAGE_MB } from "@/lib/types";

export const runtime = "nodejs";

const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

function parseImageInput(input: string): { base64: string; contentType: string; ext: string } | null {
  const dataUrl = /^data:(image\/(?:png|jpe?g|webp));base64,(.+)$/i.exec(input);
  const contentType = dataUrl
    ? dataUrl[1].toLowerCase().replace("image/jpg", "image/jpeg")
    : "image/png";
  const ext = MIME_TO_EXT[contentType];
  if (!ext) return null;
  return {
    base64: dataUrl ? dataUrl[2] : input,
    contentType,
    ext,
  };
}

export async function POST(request: NextRequest) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }

  const items = (body as { images?: unknown }).images;
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "images 不能为空" }, { status: 400 });
  }

  const list = items
    .filter((s): s is string => typeof s === "string" && s.length > 0)
    .slice(0, MAX_IMAGES);

  if (list.length === 0) {
    return NextResponse.json({ error: "images 格式无效" }, { status: 400 });
  }

  const keys: string[] = [];
  for (const item of list) {
    const parsed = parseImageInput(item);
    if (!parsed) {
      return NextResponse.json({ error: "仅支持 PNG、JPG、WebP 图片" }, { status: 400 });
    }

    const buf = Buffer.from(parsed.base64, "base64");
    if (buf.length > MAX_INPUT_IMAGE_BYTES) {
      return NextResponse.json(
        { error: `图片过大，单张最大 ${MAX_INPUT_IMAGE_MB}MB` },
        { status: 413 },
      );
    }
    const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const key = `temp/${user.id}/${stamp}.${parsed.ext}`;
    await uploadImage(buf, key, parsed.contentType);
    keys.push(key);
  }

  return NextResponse.json({ keys });
}
