// scripts/grant-credits.ts
// 一次性给所有现有用户发放赠送积分（纯积分制上线时的老用户过渡）。
//
//   tsx scripts/grant-credits.ts          # 默认每人 +30
//   GRANT=50 tsx scripts/grant-credits.ts # 自定义发放量
//
// 注意：此脚本会给每个用户无条件 increment，重复运行会重复发放。
// 请只在上线时运行一次。

import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local", override: false });
dotenvConfig({ path: ".env", override: false });

import { prisma } from "../lib/prisma";

async function main() {
  const grant = Number(process.env.GRANT || "30");
  if (!Number.isInteger(grant) || grant <= 0) {
    throw new Error(`GRANT 必须为正整数，当前为 ${process.env.GRANT}`);
  }

  const result = await prisma.user.updateMany({
    data: { credits: { increment: grant } },
  });

  console.log(`已为 ${result.count} 个用户各发放 ${grant} 积分。`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
