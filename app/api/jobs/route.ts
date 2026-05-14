import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createJob, listActiveJobs, toPayload } from "@/lib/jobs";
import { enqueueGenerate } from "@/lib/queue";
import { QUOTA_COST, tryConsumeQuota } from "@/lib/quota";

export const runtime = "nodejs";

const MAX_INPUTS = 4;

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

  const b = body as {
    prompt?: unknown;
    mode?: unknown;
    inputKeys?: unknown;
    size?: unknown;
    quality?: unknown;
  };

  const prompt = typeof b.prompt === "string" ? b.prompt.trim() : "";
  if (!prompt) {
    return NextResponse.json({ error: "请输入提示词" }, { status: 400 });
  }

  const mode = b.mode === "image-to-image" ? "image-to-image" : "text-to-image";
  const size = typeof b.size === "string" ? b.size : "auto";
  const quality = typeof b.quality === "string" ? b.quality : "auto";

  const inputKeys = Array.isArray(b.inputKeys)
    ? (b.inputKeys.filter((s): s is string => typeof s === "string" && s.length > 0).slice(0, MAX_INPUTS))
    : [];

  const cost = QUOTA_COST[mode];
  const quota = await tryConsumeQuota(user.id, cost);
  if (!quota.ok) {
    return NextResponse.json(
      {
        error: `今日额度已用完（每日 ${quota.snapshot.limit} 次，${mode === "image-to-image" ? "图生图消耗 2 次" : "文生图消耗 1 次"}）`,
        quota: quota.snapshot,
        cost: quota.cost,
      },
      { status: 429 },
    );
  }

  const job = await createJob({
    userId: user.id,
    prompt,
    mode,
    size,
    quality,
    inputKeys,
  });

  await enqueueGenerate(job.id);

  return NextResponse.json({ ...toPayload(job), quota: quota.snapshot });
}

export async function GET() {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const jobs = await listActiveJobs(user.id);
  return NextResponse.json({ items: jobs.map(toPayload) });
}
