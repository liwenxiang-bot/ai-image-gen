This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### 1. 环境要求

- Node.js 22+（项目根目录有 `.nvmrc`，可用 `nvm use` 自动切换）
- 阿里云 RDS MySQL（建议两个库：`ai_image_gen_dev` / `ai_image_gen_prod`），并把开发机 IP 加入 RDS 白名单
- 微信公众号（个人订阅号即可，详见 [docs/wechat-setup.md](docs/wechat-setup.md)）

### 2. 安装依赖

```bash
nvm use
npm install
```

`postinstall` 会自动跑 `prisma generate`。

### 3. 配置环境变量

```bash
cp .env.example .env.local
# 编辑 .env.local，填入 DATABASE_URL、WECHAT_TOKEN、OPENAI_API_KEY 等
```

### 4. 初始化数据库

```bash
npm run db:push      # 把 prisma/schema.prisma 推送到 RDS dev 库
npm run db:studio    # 可视化查看/编辑数据
```

### 5. 启动应用

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。本地开发的微信回调联调请见 [docs/wechat-setup.md](docs/wechat-setup.md)（用 ngrok）。

### 6. 公众号二维码

把你的公众号关注二维码图片放到 `public/wechat-qr.png`，或在 `.env.local` 中设置 `NEXT_PUBLIC_WECHAT_QRCODE_URL` 指向外链。

## 项目结构概览

- `app/api/generate` — 图片生成（已加登录守卫）
- `app/api/enhance-prompt` — 提示词增强（已加登录守卫）
- `app/api/wechat/callback` — 微信公众号回调
- `app/api/auth/*` — 登录/退出/会话状态
- `app/login` — 登录页（验证码 + 二维码）
- `prisma/schema.prisma` — 数据模型
- `lib/auth.ts` — 会话/cookie 管理
- `lib/wechat.ts` — 微信签名校验、XML 解析
- `proxy.ts` — 未登录路由保护

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
