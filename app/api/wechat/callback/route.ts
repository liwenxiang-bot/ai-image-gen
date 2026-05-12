import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { buildReplyXml, parseXml, verifySignature } from "@/lib/wechat";

export const runtime = "nodejs";
export const maxDuration = 5;

const CODE_TTL_SEC = 5 * 60;

function codeKey(code: string) {
  return `code:${code}`;
}

function plainText(body: string, status = 200) {
  return new NextResponse(body, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

function xml(body: string) {
  return new NextResponse(body, {
    status: 200,
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
}

function checkSignature(request: NextRequest): boolean {
  const token = process.env.WECHAT_TOKEN;
  if (!token) return false;
  const sp = request.nextUrl.searchParams;
  return verifySignature(
    token,
    sp.get("timestamp"),
    sp.get("nonce"),
    sp.get("signature"),
  );
}

export async function GET(request: NextRequest) {
  if (!checkSignature(request)) return plainText("invalid signature", 401);
  const echostr = request.nextUrl.searchParams.get("echostr") ?? "";
  return plainText(echostr);
}

export async function POST(request: NextRequest) {
  if (!checkSignature(request)) return plainText("invalid signature", 401);

  const body = await request.text();
  const msg = parseXml(body);
  const reply = (content: string) =>
    xml(
      buildReplyXml({
        toUser: msg.FromUserName,
        fromUser: msg.ToUserName,
        content,
      }),
    );

  if (msg.MsgType === "event") {
    return reply("欢迎关注，回到网页获取验证码后发送给我即可登录。");
  }

  if (msg.MsgType !== "text") {
    return reply("发送网页上的 6 位验证码即可登录。");
  }

  const code = msg.Content.trim().toUpperCase();
  if (!/^[A-Z0-9]{4,8}$/.test(code)) {
    return reply("验证码格式不对，请输入网页上显示的 6 位字符。");
  }

  const state = await redis.get(codeKey(code));
  if (!state) return reply("验证码不存在或已过期，请刷新网页获取新的。");
  if (state !== "pending") return reply("此验证码已被使用，请刷新网页获取新的。");

  try {
    await prisma.user.upsert({
      where: { openid: msg.FromUserName },
      create: { openid: msg.FromUserName },
      update: {},
    });
    // Bind code to openid. Reuse remaining TTL bucket (5 min ceiling is fine).
    await redis.set(codeKey(code), msg.FromUserName, "EX", CODE_TTL_SEC);
  } catch {
    return reply("登录处理异常，请稍后重试。");
  }

  return reply("登录成功，请返回网页继续操作。");
}
