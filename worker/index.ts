// Bootstrap: load env *before* importing anything that reads process.env at module load time.
import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local", override: false });
dotenvConfig({ path: ".env", override: false });

async function main() {
  const { Worker } = await import("bullmq");
  const { QUEUE_NAME } = await import("../lib/queue");
  const { processGenerateJob } = await import("./handlers/generate");

  const concurrency = Number(process.env.WORKER_CONCURRENCY) || 4;
  const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

  console.log(`[worker] starting queue="${QUEUE_NAME}" concurrency=${concurrency}`);
  console.log(`[worker] redis=${redisUrl.replace(/:[^:@/]+@/, ":***@")}`);

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const jobId = (job.data as { jobId: string }).jobId;
      console.log(`[worker] processing job=${jobId}`);
      const start = Date.now();
      try {
        await processGenerateJob(jobId);
        console.log(`[worker] job=${jobId} done in ${Date.now() - start}ms`);
      } catch (err) {
        console.error(`[worker] job=${jobId} threw:`, err);
      }
    },
    {
      connection: { url: redisUrl },
      concurrency,
    },
  );

  worker.on("ready", () => console.log("[worker] ready"));
  worker.on("failed", (job, err) =>
    console.error(`[worker] job=${job?.id} failed: ${err.message}`),
  );
  worker.on("error", (err) => console.error("[worker] error:", err));

  const shutdown = async (signal: NodeJS.Signals) => {
    console.log(`[worker] received ${signal}, shutting down...`);
    try {
      await worker.close();
      console.log("[worker] closed gracefully");
      process.exit(0);
    } catch (err) {
      console.error("[worker] shutdown error:", err);
      process.exit(1);
    }
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error("[worker] fatal:", err);
  process.exit(1);
});
