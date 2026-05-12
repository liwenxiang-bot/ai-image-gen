import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { imageUrl } from "@/lib/storage";

export const runtime = "nodejs";

const PAGE_SIZE = 30;

export async function GET() {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const rows = await prisma.image.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
  });

  const items = await Promise.all(
    rows.map(async (r) => ({
      id: r.id,
      prompt: r.prompt,
      imageUrl: await imageUrl(r.ossKey),
      mode: r.mode,
      size: r.size,
      quality: r.quality,
      isPublic: r.isPublic,
      revisedPrompt: r.revisedPrompt ?? undefined,
      createdAt: r.createdAt.getTime(),
    })),
  );

  return NextResponse.json({ items });
}
