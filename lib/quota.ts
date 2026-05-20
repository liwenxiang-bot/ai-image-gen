import { prisma } from "@/lib/prisma";

export const DAILY_FREE_QUOTA = 10;

export const QUOTA_COST = {
  "text-to-image": 1,
  "image-to-image": 2,
} as const;

export type QuotaMode = keyof typeof QUOTA_COST;

const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;

/** "2026-05-13" — 北京时间（UTC+8）的当日 key，不依赖运行时时区。 */
export function beijingDayKey(at: Date = new Date()): string {
  const shifted = new Date(at.getTime() + BEIJING_OFFSET_MS);
  return shifted.toISOString().slice(0, 10);
}

export type QuotaSnapshot = {
  used: number;
  limit: number;
  remaining: number;
  dayKey: string;
};

/** 读取当日额度（不消耗）。无记录视为 used=0。 */
export async function readQuota(userId: string): Promise<QuotaSnapshot> {
  const dayKey = beijingDayKey();
  const row = await prisma.dailyQuota.findUnique({
    where: { userId_dayKey: { userId, dayKey } },
    select: { used: true },
  });
  const used = row?.used ?? 0;
  return {
    used,
    limit: DAILY_FREE_QUOTA,
    remaining: Math.max(0, DAILY_FREE_QUOTA - used),
    dayKey,
  };
}

/**
 * 原子地尝试消耗 cost 次额度。返回 ok=true 表示成功扣减；ok=false 表示余额不足。
 *
 * 借助 (userId, dayKey) 唯一索引 + 条件 update 保证并发安全：
 *   1) upsert 拿到/建好当日行
 *   2) updateMany 仅在 used + cost <= limit 时 +cost
 * 如果第二步影响行数为 0，说明并发提交把额度抢光了 — 返回 ok=false。
 */
export async function tryConsumeQuota(
  userId: string,
  cost: number,
): Promise<{ ok: true; snapshot: QuotaSnapshot } | { ok: false; snapshot: QuotaSnapshot; cost: number }> {
  const dayKey = beijingDayKey();

  await prisma.dailyQuota.upsert({
    where: { userId_dayKey: { userId, dayKey } },
    create: { userId, dayKey, used: 0 },
    update: {},
  });

  const updated = await prisma.dailyQuota.updateMany({
    where: {
      userId,
      dayKey,
      used: { lte: DAILY_FREE_QUOTA - cost },
    },
    data: { used: { increment: cost } },
  });

  const after = await prisma.dailyQuota.findUnique({
    where: { userId_dayKey: { userId, dayKey } },
    select: { used: true },
  });
  const used = after?.used ?? 0;
  const snapshot: QuotaSnapshot = {
    used,
    limit: DAILY_FREE_QUOTA,
    remaining: Math.max(0, DAILY_FREE_QUOTA - used),
    dayKey,
  };

  if (updated.count === 0) return { ok: false, snapshot, cost };
  return { ok: true, snapshot };
}
