import { NextResponse } from "next/server";
import { destroySession, getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSession();
  if (!user) {
    await destroySession();
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({ user });
}
