import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { QUOTA_COST, readCredits } from "@/lib/quota";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const snapshot = await readCredits(user.id);
  return NextResponse.json({ ...snapshot, cost: QUOTA_COST });
}
