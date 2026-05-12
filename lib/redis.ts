import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
  pubRedis: Redis | undefined;
};

function getUrl() {
  return process.env.REDIS_URL || "redis://127.0.0.1:6379";
}

function createClient(role: "main" | "pub" | "sub") {
  const client = new Redis(getUrl(), {
    maxRetriesPerRequest: 3,
    lazyConnect: false,
  });
  client.on("error", (err) => {
    console.error(`[redis:${role}] error:`, err.message);
  });
  return client;
}

export const redis = globalForRedis.redis ?? createClient("main");
if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

/**
 * A dedicated Redis client for publishing on pub/sub channels.
 * Kept separate from `redis` because the main client may also be used by
 * code that does subscribes — once a connection enters subscribe mode it
 * cannot issue regular commands like `publish`.
 */
export const pubRedis = globalForRedis.pubRedis ?? createClient("pub");
if (process.env.NODE_ENV !== "production") globalForRedis.pubRedis = pubRedis;

/**
 * Create a brand new subscriber connection. Each SSE request gets its own
 * because subscribers cannot share a connection across distinct channels
 * cleanly.
 */
export function createSubscriber(): Redis {
  return createClient("sub");
}
