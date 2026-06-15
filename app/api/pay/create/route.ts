import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildSubmitUrl, findPackage } from "@/lib/epay";

export const runtime = "nodejs";

/** 生成商户订单号：时间戳 + 随机串，确保唯一且无歧义。 */
function genOutTradeNo(): string {
  return `img${Date.now()}${randomBytes(4).toString("hex")}`;
}

export async function POST(request: NextRequest) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }

  const packageId = typeof (body as { packageId?: unknown })?.packageId === "string"
    ? (body as { packageId: string }).packageId
    : "";
  const pkg = findPackage(packageId);
  if (!pkg) {
    return NextResponse.json({ error: "套餐不存在" }, { status: 400 });
  }

  const outTradeNo = genOutTradeNo();

  await prisma.order.create({
    data: {
      userId: user.id,
      outTradeNo,
      packageId: pkg.id,
      amount: pkg.amount,
      credits: pkg.credits,
      status: "pending",
    },
  });

  let payUrl: string;
  try {
    payUrl = buildSubmitUrl({
      outTradeNo,
      amount: pkg.amount,
      name: `AI画图 ${pkg.label}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "支付下单失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ outTradeNo, payUrl });
}
