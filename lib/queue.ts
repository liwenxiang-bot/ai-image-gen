import { Queue } from "bullmq";

const QUEUE_NAME = "generate";

const globalForQueue = globalThis as unknown as {
  generateQueue: Queue | undefined;
};

function getRedisUrl() {
  return process.env.REDIS_URL || "redis://127.0.0.1:6379";
}

export function generateQueue(): Queue {
  if (globalForQueue.generateQueue) return globalForQueue.generateQueue;
  const q = new Queue(QUEUE_NAME, {
    connection: { url: getRedisUrl() },
    defaultJobOptions: {
      removeOnComplete: { age: 3600, count: 1000 }, // 1h or 1000 jobs
      removeOnFail: { age: 86400 }, // 24h
      attempts: 1, // we own retry logic via Job table; bull doesn't retry automatically
    },
  });
  if (process.env.NODE_ENV !== "production") {
    globalForQueue.generateQueue = q;
  }
  return q;
}

export type GenerateJobData = {
  jobId: string; // matches Prisma Job.id
};

export async function enqueueGenerate(jobId: string): Promise<void> {
  const q = generateQueue();
  // Defensive: if a previous BullMQ job with the same id exists (e.g. retry
  // after failure when removeOnFail hasn't kicked in), drop it first.
  try {
    const existing = await q.getJob(jobId);
    if (existing) {
      await existing.remove().catch(() => {});
    }
  } catch {
    // ignore
  }
  await q.add("generate", { jobId } satisfies GenerateJobData, {
    jobId, // make BullMQ id match DB id for traceability
  });
}

export { QUEUE_NAME };
