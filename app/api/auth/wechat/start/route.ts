import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { randomLoginCode } from "@/lib/wechat";

export const runtime = "nodejs";

const CODE_TTL_SEC = 5 * 60;
const MAX_ATTEMPTS = 5;

function codeKey(code: string) {
  return `code:${code}`;
}

export async function POST() {
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const code = randomLoginCode();
    // NX = only set if not exists. Avoid trampling an active code.
    const ok = await redis.set(codeKey(code), "pending", "EX", CODE_TTL_SEC, "NX");
    if (ok === "OK") {
      const expiresAt = Date.now() + CODE_TTL_SEC * 1000;
      return NextResponse.json({ code, expiresAt });
    }
  }

  return NextResponse.json(
    { error: "无法生成验证码，请重试" },
    { status: 500 },
  );
}
