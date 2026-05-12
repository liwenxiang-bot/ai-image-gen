import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publishJob, toPayload } from "@/lib/jobs";
import { enqueueGenerate } from "@/lib/queue";

export const runtime = "nodejs";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job || job.userId !== user.id) {
    return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  }

  if (job.status !== "failed" && job.status !== "cancelled") {
    return NextResponse.json(
      { error: "只能重试失败或已取消的任务" },
      { status: 400 },
    );
  }

  // Image-to-image jobs upload their inputs to temp/ which is deleted after
  // each run. If the user retries, those inputs are gone — refuse and prompt
  // them to resubmit from the panel.
  const inputKeys = (job.inputKeys as string[] | null) ?? [];
  if (job.mode === "image-to-image" && inputKeys.length > 0) {
    return NextResponse.json(
      { error: "图生图任务的输入图已清理，请在生成面板重新提交" },
      { status: 400 },
    );
  }

  const updated = await prisma.job.update({
    where: { id },
    data: {
      status: "queued",
      errorMessage: null,
      startedAt: null,
      finishedAt: null,
    },
  });

  await enqueueGenerate(id);
  await publishJob(user.id, toPayload(updated));

  return NextResponse.json(toPayload(updated));
}
