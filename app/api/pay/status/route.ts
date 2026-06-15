import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** 前端 return_url 回站后轮询此接口确认积分是否到账。 */
export async function GET(request: NextRequest) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const outTradeNo = request.nextUrl.searchParams.get("out_trade_no");
  if (!outTradeNo) {
    return NextResponse.json({ error: "缺少订单号" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { outTradeNo } });
  if (!order || order.userId !== user.id) {
    return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  }

  return NextResponse.json({ status: order.status, credits: order.credits });
}
