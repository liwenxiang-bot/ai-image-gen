import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const isPublic = Boolean(body?.isPublic);

  const row = await prisma.image.findUnique({ where: { id } });
  if (!row || row.userId !== user.id) {
    return NextResponse.json({ error: "图片不存在" }, { status: 404 });
  }

  const updated = await prisma.image.update({
    where: { id },
    data: { isPublic },
  });

  return NextResponse.json({ id: updated.id, isPublic: updated.isPublic });
}
