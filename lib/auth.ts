import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "sid";
const SESSION_TTL_SEC = 30 * 24 * 60 * 60;

export type AuthUser = {
  id: string;
  openid: string;
  nickname: string | null;
};

function sessionKey(token: string) {
  return `sid:${token}`;
}

function randomToken() {
  return randomBytes(32).toString("hex");
}

export async function createSession(userId: string): Promise<string> {
  const token = randomToken();
  await redis.set(sessionKey(token), userId, "EX", SESSION_TTL_SEC);

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SEC,
  });

  return token;
}

export async function getSession(): Promise<AuthUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const userId = await redis.get(sessionKey(token));
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  return { id: user.id, openid: user.openid, nickname: user.nickname };
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) {
    await redis.del(sessionKey(token));
  }
  store.delete(COOKIE_NAME);
}

export async function requireAuth(): Promise<AuthUser | null> {
  return getSession();
}
