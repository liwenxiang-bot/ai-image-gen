import { prisma } from "@/lib/prisma";

/** 新用户首次登录一次性赠送的积分。 */
export const SIGNUP_BONUS = 10;

/** 每种生成模式消耗的积分。 */
export const QUOTA_COST = {
  "text-to-image": 1,
  "image-to-image": 2,
} as const;

export type QuotaMode = keyof typeof QUOTA_COST;

export type CreditsSnapshot = {
  credits: number;
};

/** 读取当前积分余额。 */
export async function readCredits(userId: string): Promise<CreditsSnapshot> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });
  return { credits: user?.credits ?? 0 };
}

/**
 * 原子地尝试扣减 cost 积分。ok=true 表示成功；ok=false 表示余额不足。
 *
 * 借助带条件的 updateMany 保证并发安全：仅当 credits >= cost 时才扣减，
 * 影响行数为 0 说明余额不足（或被并发请求抢光）。
 */
export async function tryConsumeCredits(
  userId: string,
  cost: number,
): Promise<{ ok: boolean; snapshot: CreditsSnapshot }> {
  const updated = await prisma.user.updateMany({
    where: { id: userId, credits: { gte: cost } },
    data: { credits: { decrement: cost } },
  });

  const snapshot = await readCredits(userId);
  return { ok: updated.count === 1, snapshot };
}

/** 退还 cost 积分（失败退还 / 取消时调用）。 */
export async function refundCredits(userId: string, cost: number): Promise<void> {
  if (cost <= 0) return;
  await prisma.user.update({
    where: { id: userId },
    data: { credits: { increment: cost } },
  });
}
