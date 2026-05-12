import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { uploadImage } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_INPUTS = 4;
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB per image

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
    .slice(0, MAX_INPUTS);

  const keys: string[] = [];
  for (const b64 of list) {
    const buf = Buffer.from(b64, "base64");
    if (buf.length > MAX_BYTES) {
      return NextResponse.json({ error: "图片过大" }, { status: 413 });
    }
    const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const key = `temp/${user.id}/${stamp}.png`;
    await uploadImage(buf, key, "image/png");
    keys.push(key);
  }

  return NextResponse.json({ keys });
}
