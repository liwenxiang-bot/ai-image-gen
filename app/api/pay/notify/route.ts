import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEpayConfig, verifySign } from "@/lib/epay";

export const runtime = "nodejs";

/** 纯文本响应（易支付要求成功时返回字符串 "success"）。 */
function text(body: string) {
  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

/**
 * 易支付异步通知（GET）。校验签名 → 校验金额 → 幂等加积分 → 输出 "success"。
 * 此接口由易支付服务器直连，不需要也不应做登录校验。
 */
export async function GET(request: NextRequest) {
  const cfg = getEpayConfig();

  const params: Record<string, string> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const log = (msg: string) =>
    console.log(`[pay/notify] ${msg} | out_trade_no=${params.out_trade_no ?? "-"} trade_no=${params.trade_no ?? "-"} money=${params.money ?? "-"} status=${params.trade_status ?? "-"}`);

  // 1) 验签
  if (!verifySign(params, cfg.key)) {
    log("验签失败 → fail");
    return text("fail");
  }

  // 2) 非成功状态：返回 success 阻止重复通知，但不处理
  if (params.trade_status !== "TRADE_SUCCESS") {
    log("非 TRADE_SUCCESS → success(不处理)");
    return text("success");
  }

  const outTradeNo = params.out_trade_no;
  if (!outTradeNo) {
    log("缺 out_trade_no → fail");
    return text("fail");
  }

  const order = await prisma.order.findUnique({ where: { outTradeNo } });
  if (!order) {
    log("订单不存在 → fail");
    return text("fail");
  }

  // 3) 金额比对（防篡改）—— 数值比较，规避 "6" vs "6.00"
  if (Number(params.money) !== Number(order.amount)) {
    log(`金额不符(订单${order.amount}) → fail`);
    return text("fail");
  }

  // 4) 幂等加积分：订单 pending→paid 条件更新只会成功一次
  const result = await prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: { outTradeNo, status: "pending" },
      data: { status: "paid", tradeNo: params.trade_no ?? null, paidAt: new Date() },
    });
    if (claimed.count === 1) {
      await tx.user.update({
        where: { id: order.userId },
        data: { credits: { increment: order.credits } },
      });
      return "credited";
    }
    return "already_paid";
  });

  log(result === "credited" ? `加 ${order.credits} 积分 → success` : "重复回调(已处理) → success");
  return text("success");
}
