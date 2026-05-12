import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { createSession } from "@/lib/auth";

export const runtime = "nodejs";

function codeKey(code: string) {
  return `code:${code}`;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.toUpperCase();
  if (!code) {
    return NextResponse.json({ status: "expired" });
  }

  const state = await redis.get(codeKey(code));
  if (!state) return NextResponse.json({ status: "expired" });
  if (state === "pending") return NextResponse.json({ status: "pending" });

  // state holds the openid the user logged in with
  const user = await prisma.user.findUnique({ where: { openid: state } });
  if (!user) return NextResponse.json({ status: "expired" });

  await createSession(user.id);
  await redis.del(codeKey(code));

  return NextResponse.json({ status: "ok" });
}
