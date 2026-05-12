import { prisma } from "@/lib/prisma";
import { pubRedis } from "@/lib/redis";
import type { Job as DbJob } from "@/lib/generated/prisma/client";

export type JobStatus = "queued" | "running" | "done" | "failed" | "cancelled";

export const JOB_CHANNEL = (userId: string) => `jobs:user:${userId}`;

export type JobPayload = {
  id: string;
  status: JobStatus;
  prompt: string;
  mode: string;
  size: string;
  quality: string;
  imageId: string | null;
  errorMessage: string | null;
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
};

export function toPayload(job: DbJob): JobPayload {
  return {
    id: job.id,
    status: job.status as JobStatus,
    prompt: job.prompt,
    mode: job.mode,
    size: job.size,
    quality: job.quality,
    imageId: job.imageId ?? null,
    errorMessage: job.errorMessage ?? null,
    createdAt: job.createdAt.getTime(),
    startedAt: job.startedAt ? job.startedAt.getTime() : null,
    finishedAt: job.finishedAt ? job.finishedAt.getTime() : null,
  };
}

export async function publishJob(userId: string, payload: JobPayload): Promise<void> {
  try {
    await pubRedis.publish(JOB_CHANNEL(userId), JSON.stringify(payload));
  } catch (err) {
    console.error("[jobs] publish failed:", err);
  }
}

export async function createJob(input: {
  userId: string;
  prompt: string;
  mode: string;
  size: string;
  quality: string;
  inputKeys?: string[];
}): Promise<DbJob> {
  return prisma.job.create({
    data: {
      userId: input.userId,
      status: "queued",
      prompt: input.prompt,
      mode: input.mode,
      size: input.size,
      quality: input.quality,
      inputKeys: input.inputKeys && input.inputKeys.length > 0 ? input.inputKeys : undefined,
    },
  });
}

export async function markRunning(jobId: string): Promise<DbJob> {
  return prisma.job.update({
    where: { id: jobId },
    data: { status: "running", startedAt: new Date() },
  });
}

export async function markDone(jobId: string, imageId: string): Promise<DbJob> {
  return prisma.job.update({
    where: { id: jobId },
    data: { status: "done", imageId, finishedAt: new Date() },
  });
}

export async function markFailed(jobId: string, errorMessage: string): Promise<DbJob> {
  return prisma.job.update({
    where: { id: jobId },
    data: { status: "failed", errorMessage, finishedAt: new Date() },
  });
}

export async function listActiveJobs(userId: string): Promise<DbJob[]> {
  return prisma.job.findMany({
    where: {
      userId,
      status: { in: ["queued", "running"] },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}
