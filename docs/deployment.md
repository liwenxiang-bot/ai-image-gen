# 部署指南

本应用由 3 个进程 + 2 个依赖组成：

| 组件 | 角色 |
|---|---|
| **Next.js Web**（pm2 进程） | 应用 + API |
| **Worker**（pm2 进程） | BullMQ 消费者：调 OpenAI、上传 R2、写 DB |
| **每日 Cron** | 清 R2 `temp/` 残留 |
| **MySQL** | 阿里云 RDS 生产库 |
| **Redis** | 验证码、Session、BullMQ、SSE pub/sub |

---

## 一、首次部署（在新服务器上跑一次）

### 1.1 跑 bootstrap 装齐依赖

把代码先拉到服务器（任何位置）：

```bash
ssh user@your-server
cd ~
git clone <你的仓库> apps/ai-image-gen
cd apps/ai-image-gen
```

跑 bootstrap（需要 sudo）：

```bash
sudo bash scripts/bootstrap.sh
```

它会装：Node 22 (nvm) / Redis（开 appendonly）/ PM2 / Nginx / certbot。

> 装完后**重新登录一次**让 nvm 生效：`exit && ssh user@your-server`

### 1.2 创建生产 `.env`

```bash
cd ~/apps/ai-image-gen
cp .env.production.template .env
nano .env       # 或 vim，按模板里的注释填
```

**必填项**：
- `DATABASE_URL`（指向 RDS 生产库 `ai_image_gen_prod`）
- `OPENAI_API_KEY`、`OPENAI_BASE_URL`
- `WECHAT_TOKEN`、`WECHAT_APPID`、`WECHAT_APP_SECRET`
- `R2_*`（5 项）
- `STORAGE_PROVIDER=r2`

⚠️ **DATABASE_URL 里密码含 `@` 必须 URL 编码成 `%40`**

### 1.3 跑 deploy 完成首次部署

```bash
bash scripts/deploy.sh
```

它会：`git pull` → `npm ci` → `prisma db push` → `next build` → `pm2 start`。

跑完看到 `pm2 status` 显示 `web` 和 `worker` 都 `online` 就成。

### 1.4 设置 PM2 开机自启

```bash
pm2 startup    # 输出一行命令，按提示 sudo 复制粘贴
pm2 save
```

### 1.5 配置 Nginx + HTTPS

新建 `/etc/nginx/sites-available/image2.one`：

```nginx
server {
  listen 80;
  server_name image2.one www.image2.one;

  client_max_body_size 30M;

  # SSE 端点必须关缓冲、长超时
  location /api/jobs/stream {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 1h;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # 微信回调严格 5s
  location /api/wechat/callback {
    proxy_pass http://127.0.0.1:3000;
    proxy_read_timeout 10s;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 300s;
  }
}
```

启用 + reload + 拿证书：

```bash
sudo ln -s /etc/nginx/sites-available/image2.one /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 自动配 HTTPS + 续期
sudo certbot --nginx -d image2.one -d www.image2.one
```

### 1.6 公众号后台改 URL

公众号后台 → 服务器配置 → URL 改为：
```
https://image2.one/api/wechat/callback
```
点提交，看到"成功"即接通。

### 1.7 R2 CORS 加生产域名

R2 控制台 → 你的 bucket → Settings → CORS Policy：

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://image2.one",
      "https://www.image2.one"
    ],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["Content-Type", "Content-Length"],
    "MaxAgeSeconds": 3600
  }
]
```

### 1.8 设置每日清理 cron

```bash
crontab -e
```

加一行（每天 3 点）：

```
0 3 * * * cd $HOME/apps/ai-image-gen && $HOME/.nvm/versions/node/v22.22.1/bin/npm run cleanup-temp >> $HOME/apps/ai-image-gen/logs/cleanup.log 2>&1
```

> Node 路径可能不一样，先 `which npm` 看下。

---

## 二、日常升级（每次代码变更）

**本地开发完 → push 到仓库**，然后服务器：

```bash
ssh user@your-server
cd ~/apps/ai-image-gen
bash scripts/deploy.sh
```

脚本会自己 `git pull` → 装新依赖 → 同步 schema → 构建 → `pm2 reload`（无停机）。

---

## 三、运维清单

### 看日志
```bash
pm2 logs web --lines 100
pm2 logs worker --lines 100
pm2 status
```

### 看任务队列
```bash
redis-cli LLEN bull:generate:wait     # 排队中
redis-cli LRANGE bull:generate:active 0 -1  # 跑着的
```

### 看失败任务
```bash
mysql -h <rds-host> -u <user> -p ai_image_gen_prod -e \
  "SELECT id, prompt, errorMessage, finishedAt FROM jobs WHERE status='failed' ORDER BY finishedAt DESC LIMIT 10;"
```

### 重启
```bash
pm2 restart web      # 仅 web
pm2 restart worker   # 仅 worker
pm2 restart all
```

### 紧急停服
```bash
pm2 stop all
```

---

## 四、常见问题

### Q: deploy.sh 报 `nvm: command not found`
A: bootstrap 后没有 `exit` 重新登录。nvm 装在 `~/.nvm` 需要新 shell 加载。

### Q: pm2 reload 后 worker 没消费任务
A: 检查 `.env` 里 `REDIS_URL`，`pm2 logs worker` 看连接错误。`redis-cli ping` 验证 Redis 在跑。

### Q: SSE 30 秒就断
A: Nginx 配置里 `proxy_buffering off` 没加。检查 `/api/jobs/stream` 那段。

### Q: 微信回调 timeout
A: OpenAI 慢或 RDS 慢。`pm2 logs web` 看具体哪步耗时。

### Q: 图片 fetch CORS 报错
A: R2 CORS 没加生产域名。回到 1.7 步检查。

### Q: 升级后 prisma 报错
A: `npm run db:push` 出错时 deploy.sh 会停。手动跑 `npm run db:push` 看具体冲突。

---

## 五、目录结构（服务器上）

```
~/apps/ai-image-gen/
├── .env                    # 生产配置（不在 git 里）
├── .next/                  # Next.js 构建产物
├── ecosystem.config.cjs    # PM2 配置
├── logs/                   # PM2 + cleanup 日志
├── lib/generated/          # Prisma 客户端
├── node_modules/
├── public/
│   └── wechat-qr.png      # 公众号二维码图片
└── scripts/
    ├── bootstrap.sh        # 首次装环境
    ├── deploy.sh           # 日常部署
    └── cleanup-temp.ts     # cron 调用
```
