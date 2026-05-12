import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { imageUrl } from "@/lib/storage";

export const runtime = "nodejs";

const PAGE_SIZE = 24;

export async function GET(request: NextRequest) {
  const cursor = request.nextUrl.searchParams.get("cursor");

  const rows = await prisma.image.findMany({
    where: { isPublic: true },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
    include: {
      user: {
        select: { nickname: true, openid: true },
      },
    },
  });

  const hasMore = rows.length > PAGE_SIZE;
  const slice = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

  const items = await Promise.all(
    slice.map(async (r) => ({
      id: r.id,
      prompt: r.prompt,
      imageUrl: await imageUrl(r.ossKey),
      size: r.size,
      createdAt: r.createdAt.getTime(),
      author: r.user.nickname || `用户${r.user.openid.slice(-6)}`,
      authorSeed: r.user.openid,
    })),
  );

  return NextResponse.json({
    items,
    nextCursor: hasMore ? slice[slice.length - 1].id : null,
  });
}
