import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteObject } from "@/lib/storage";

export const runtime = "nodejs";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;
  const row = await prisma.image.findUnique({ where: { id } });
  if (!row || row.userId !== user.id) {
    return NextResponse.json({ error: "图片不存在" }, { status: 404 });
  }

  await prisma.image.delete({ where: { id } });
  // Best-effort: ignore failures so the DB row is the source of truth.
  void deleteObject(row.ossKey).catch(() => {});

  return new NextResponse(null, { status: 204 });
}
