import { requireAuth } from "@/lib/auth";
import { createSubscriber } from "@/lib/redis";
import { JOB_CHANNEL, listActiveJobs, toPayload } from "@/lib/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEEPALIVE_INTERVAL_MS = 25_000;

export async function GET() {
  const user = await requireAuth();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const channel = JOB_CHANNEL(user.id);
  const subscriber = createSubscriber();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (data: string) => {
        try {
          const lines = data.split("\n").map((l) => `data: ${l}`);
          controller.enqueue(enc.encode(lines.join("\n") + "\n\n"));
        } catch {
          // controller might already be closed
        }
      };

      // Initial snapshot — so reconnecting clients catch up instantly.
      try {
        const active = await listActiveJobs(user.id);
        for (const job of active) {
          send(JSON.stringify(toPayload(job)));
        }
      } catch (err) {
        console.error("[sse] initial snapshot failed:", err);
      }

      try {
        await subscriber.subscribe(channel);
      } catch (err) {
        console.error("[sse] subscribe failed:", err);
        controller.close();
        return;
      }

      subscriber.on("message", (ch, message) => {
        if (ch === channel) send(message);
      });

      const ping = setInterval(() => {
        try {
          controller.enqueue(enc.encode(`: keepalive\n\n`));
        } catch {
          // closed
        }
      }, KEEPALIVE_INTERVAL_MS);

      const closeListener = async () => {
        clearInterval(ping);
        try {
          await subscriber.unsubscribe(channel);
        } catch {}
        try {
          await subscriber.quit();
        } catch {}
      };
      // Expose cleanup so cancel() can call it.
      (controller as unknown as { _cleanup?: () => Promise<void> })._cleanup = closeListener;
    },
    async cancel() {
      try {
        await subscriber.unsubscribe();
      } catch {}
      try {
        await subscriber.quit();
      } catch {}
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
