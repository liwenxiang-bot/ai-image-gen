import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publishJob, toPayload } from "@/lib/jobs";
import { generateQueue } from "@/lib/queue";

export const runtime = "nodejs";

export async function GET(
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

  return NextResponse.json(toPayload(job));
}

export async function DELETE(
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

  if (job.status === "done" || job.status === "failed" || job.status === "cancelled") {
    // Already terminal — treat as success.
    return new NextResponse(null, { status: 204 });
  }

  // Try to remove the BullMQ job if it's still queued (best-effort; if it's
  // already picked up by a worker, the worker will continue but we still mark
  // cancelled on the DB so the result is discarded by the client).
  try {
    const bullJob = await generateQueue().getJob(id);
    if (bullJob) {
      // remove() throws if the job is currently active; ignore.
      await bullJob.remove().catch(() => {});
    }
  } catch {
    // ignore
  }

  const updated = await prisma.job.update({
    where: { id },
    data: { status: "cancelled", finishedAt: new Date() },
  });
  await publishJob(user.id, toPayload(updated));

  return new NextResponse(null, { status: 204 });
}
