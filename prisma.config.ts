import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Match Next.js behavior: prefer .env.local, fall back to .env
config({ path: ".env.local" });
config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
