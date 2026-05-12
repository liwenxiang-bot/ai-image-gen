# 全新机器部署完整指南

从零到上线的全程操作手册。假设你拿到的是一台**全新的 Ubuntu 22.04 LTS** 服务器，目标是把这个应用跑起来对公网开放访问。

> 路径假设：用户 `ubuntu`、应用部署在 `~/apps/ai-image-gen`、域名 `image2.one`、图片域名 `img.image2.one`。换成你自己的。

---

## 章节速览

1. [外部资源准备](#1-外部资源准备)
2. [服务器初始安全设置](#2-服务器初始安全设置)
3. [装基础软件](#3-装基础软件)
4. [拉代码并初始化](#4-拉代码并初始化)
5. [配置环境变量](#5-配置环境变量)
6. [初始化数据库](#6-初始化数据库)
7. [构建并启动应用](#7-构建并启动应用)
8. [Nginx + HTTPS 反向代理](#8-nginx--https-反向代理)
9. [对外资源最终配置](#9-对外资源最终配置)
10. [验证清单](#10-验证清单)
11. [日常运维](#11-日常运维)
12. [常见问题](#12-常见问题)

---

## 1. 外部资源准备

部署前要先准备好这些云服务资源（部分要花钱，新账号通常都有免费额度）：

### 1.1 域名

- 主域名 `image2.one`（应用本体）
- 子域名 `img.image2.one`（R2 图片 CDN）

### 1.2 阿里云 RDS MySQL

- 地域：**和服务器同地域**（如果不同地域，每次查询都有跨地域延迟）
- 版本：MySQL 8.0
- 创建数据库：**ai_image_gen_prod**
  - 字符集：utf8mb4
  - 排序：utf8mb4_unicode_ci
- 创建账号：建议只授该库读写权限
- **把服务器公网 IP 加入 RDS 白名单**

记下连接信息：
```
内网/外网地址：rm-xxxxx.mysql.rds.aliyuncs.com
端口：3306
账号：app_user
密码：xxxxxxx
库名：ai_image_gen_prod
```

### 1.3 Cloudflare R2

1. 注册 Cloudflare 账号，**绑定你的域名 `image2.one`** 到 Cloudflare（DNS 托管）
2. Cloudflare 后台 → R2 → 创建 bucket：`gpt-image-2`
3. R2 → Manage R2 API Tokens → 创建 token
   - 权限：**Object Read & Write**
   - 限定到 `gpt-image-2` bucket
   - 保存 **Access Key ID** 和 **Secret Access Key**
4. R2 → 你的 bucket → Settings → **Custom Domains** → 绑 `img.image2.one`
5. R2 → 你的 bucket → Settings → **CORS Policy**：

```json
[
  {
    "AllowedOrigins": [
      "https://image2.one",
      "https://www.image2.one"
    ],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["Content-Type", "Content-Length"]
  }
]
```

> 上线后再加生产域名也可以；本地开发期间可以临时加 `http://localhost:3000` 调试。

### 1.4 微信公众号

- 注册个人订阅号（免费），完成认证（个人订阅号不用付费认证）
- 后台 → 设置与开发 → 基本配置：
  - **AppID**、**AppSecret** 记下来
  - **服务器配置**先不开（部署完了再来开）

### 1.5 OpenAI 兼容 API

- 你的供应商提供的：
  - `OPENAI_API_KEY`（如 `sk-xxx`）
  - `OPENAI_BASE_URL`（如 `https://api.9e.lv`）

### 1.6 公众号二维码

把"关注公众号"二维码图片保存到本地，命名 `wechat-qr.png`。后面会上传到服务器。

---

## 2. 服务器初始安全设置

首次登录服务器（用 root 或云控制台给的初始用户）：

### 2.1 创建非 root 用户

```bash
adduser ubuntu
usermod -aG sudo ubuntu
# 把 root 的 SSH 公钥拷给新用户
mkdir -p /home/ubuntu/.ssh
cp ~/.ssh/authorized_keys /home/ubuntu/.ssh/
chown -R ubuntu:ubuntu /home/ubuntu/.ssh
chmod 700 /home/ubuntu/.ssh
chmod 600 /home/ubuntu/.ssh/authorized_keys
```

之后用 `ssh ubuntu@your-server` 登录。

### 2.2 防火墙

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

> 不要开 3000（应用端口）和 6379（Redis）端口对外，让它们只本机访问。

### 2.3 更新系统

```bash
sudo apt-get update && sudo apt-get upgrade -y
```

---

## 3. 装基础软件

### 3.1 一次性装齐

```bash
sudo apt-get install -y \
  curl git build-essential ca-certificates \
  redis-server \
  nginx \
  certbot python3-certbot-nginx
```

### 3.2 Redis 开持久化

```bash
sudo sed -i 's/^# *appendonly no/appendonly yes/; s/^appendonly no/appendonly yes/' /etc/redis/redis.conf
sudo systemctl enable redis-server
sudo systemctl restart redis-server

# 验证
redis-cli ping     # 应该返回 PONG
```

### 3.3 Node 22（用 nvm）

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash

# nvm 装完要重开 shell：
exit
ssh ubuntu@your-server

# 装 node
nvm install 22
nvm alias default 22
node -v       # 应该是 v22.x
npm -v
```

### 3.4 PM2

```bash
npm install -g pm2
pm2 --version
```

---

## 4. 拉代码并初始化

### 4.1 git clone

```bash
mkdir -p ~/apps
cd ~/apps
git clone <你的仓库地址> ai-image-gen
cd ai-image-gen
```

> 仓库私有的话先把 deploy key 添加到 GitHub/Gitee 设置里。

### 4.2 切到正确的 Node 版本

```bash
nvm use     # 读 .nvmrc
```

### 4.3 装依赖

```bash
npm ci
```

`postinstall` 会自动跑 `prisma generate`。

### 4.4 上传二维码

在**本地电脑**上：

```bash
scp ./wechat-qr.png ubuntu@your-server:~/apps/ai-image-gen/public/
```

---

## 5. 配置环境变量

```bash
cd ~/apps/ai-image-gen
cp .env.production.template .env
nano .env
```

按下表填全（**所有项都必填**）：

```ini
NODE_ENV=production

# OpenAI
OPENAI_API_KEY=sk-xxxxxx
OPENAI_BASE_URL=https://api.9e.lv

# RDS 生产库（密码含 @ 必须 URL 编码为 %40）
DATABASE_URL=mysql://app_user:Pass%40123@rm-xxx.mysql.rds.aliyuncs.com:3306/ai_image_gen_prod

# 本机 Redis
REDIS_URL=redis://127.0.0.1:6379

# 微信
WECHAT_TOKEN=随便填一个 16 位以上随机串
WECHAT_APPID=wx....
WECHAT_APP_SECRET=....

# 前端可见
NEXT_PUBLIC_WECHAT_ACCOUNT_NAME=玖亿AI
NEXT_PUBLIC_WECHAT_QRCODE_URL=/wechat-qr.png

# R2
STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=....
R2_ACCESS_KEY_ID=....
R2_SECRET_ACCESS_KEY=....
R2_BUCKET=gpt-image-2
R2_PUBLIC_BASE_URL=https://img.image2.one

# Worker
WORKER_CONCURRENCY=4
```

**保存退出**（nano: Ctrl+O 回车 Ctrl+X）。

### 5.1 验证 RDS 连接

```bash
nvm use
node -e "
const m=require('mariadb');
m.createConnection(process.env.DATABASE_URL).then(c=>{
  return c.query('SELECT 1').then(r=>console.log('OK',r)).finally(()=>c.end());
}).catch(e=>console.error('FAIL',e.message));
" $(grep ^DATABASE_URL .env | xargs)
```

应该输出 `OK [ { 1: 1 } ]`。如果失败：
- RDS 白名单没加服务器 IP（最常见）
- 密码 URL 编码错（`@` 要写 `%40`）

### 5.2 验证 R2 凭证

```bash
nvm use
node -e "
require('dotenv').config();
const {S3Client,PutObjectCommand,DeleteObjectCommand}=require('@aws-sdk/client-s3');
const c=new S3Client({region:'auto',endpoint:'https://'+process.env.R2_ACCOUNT_ID+'.r2.cloudflarestorage.com',credentials:{accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY}});
(async()=>{
  const key='_test/'+Date.now()+'.txt';
  await c.send(new PutObjectCommand({Bucket:process.env.R2_BUCKET,Key:key,Body:'hi'}));
  console.log('upload OK:',key);
  const url=process.env.R2_PUBLIC_BASE_URL+'/'+key;
  const r=await fetch(url);
  console.log('public fetch:',r.status);
  await c.send(new DeleteObjectCommand({Bucket:process.env.R2_BUCKET,Key:key}));
  console.log('delete OK');
})().catch(e=>console.error('FAIL',e.message));
"
```

应该全部 OK。

---

## 6. 初始化数据库

```bash
cd ~/apps/ai-image-gen
nvm use
npm run db:push
```

应该看到 `Your database is now in sync with your Prisma schema`。

在 RDS 后台或 `mysql` 客户端确认表已创建：

```sql
USE ai_image_gen_prod;
SHOW TABLES;
-- 应该看到：users, images, jobs
```

---

## 7. 构建并启动应用

### 7.1 构建

```bash
npm run build
```

完成后 `.next/` 目录有产物。

### 7.2 PM2 启动

```bash
pm2 start ecosystem.config.cjs
pm2 status
```

应该看到：
```
┌─────┬─────────┬─────────┬──────┬──────┬──────────┐
│ id  │ name    │ status  │ pid  │ ...
├─────┼─────────┼─────────┼──────┼──────┼──────────┤
│ 0   │ web     │ online  │ ...  │
│ 1   │ worker  │ online  │ ...  │
└─────┴─────────┴─────────┴──────┴──────┴──────────┘
```

看 worker 日志确认它连上 Redis 并 ready：

```bash
pm2 logs worker --lines 30
```

应该看到：
```
[worker] starting queue="generate" concurrency=4
[worker] redis=redis://127.0.0.1:6379
[worker] ready
```

### 7.3 设置开机自启

```bash
pm2 save
pm2 startup
# 它会输出一行 sudo 命令，照搬执行
```

执行后用 `sudo systemctl status pm2-ubuntu` 验证 systemd 服务已启用。

### 7.4 本机自测

```bash
curl -I http://127.0.0.1:3000
# 应该返回 HTTP/1.1 200 OK（或 307 重定向到 /login）
```

---

## 8. Nginx + HTTPS 反向代理

### 8.1 DNS

先在你的域名注册商 / Cloudflare DNS 里加两条 A 记录：

| 类型 | 名称 | 值 |
|---|---|---|
| A | `image2.one` | 服务器公网 IP |
| A | `www.image2.one` | 服务器公网 IP |

> `img.image2.one` 是给 R2 用的，第 1.3 步已经在 Cloudflare 那边绑过 R2 了，不需要在这里加。

DNS 生效后（几分钟）：
```bash
dig image2.one +short
# 应该返回你的服务器 IP
```

### 8.2 Nginx 配置

```bash
sudo nano /etc/nginx/sites-available/image2.one
```

粘贴：

```nginx
server {
  listen 80;
  server_name image2.one www.image2.one;

  client_max_body_size 30M;

  # SSE 端点：必须关缓冲、长超时
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

  # 微信回调：严格 5s 内必须响应
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

启用：
```bash
sudo ln -s /etc/nginx/sites-available/image2.one /etc/nginx/sites-enabled/
sudo nginx -t      # 必须通过
sudo systemctl reload nginx
```

### 8.3 HTTPS 证书（certbot）

```bash
sudo certbot --nginx -d image2.one -d www.image2.one
```

按提示：
- 输入邮箱（接收证书过期通知）
- 同意条款
- 选 **2**（强制 HTTPS 重定向）

certbot 会自动改 Nginx 配置加 443 server + 80→443 重定向。

证书 90 天自动续期，systemd timer 已自动启用，不用管。

### 8.4 公网自测

在你自己电脑上：
```bash
curl -I https://image2.one
# 应该返回 HTTP/2 200（或 307 跳 login）
```

浏览器打开 `https://image2.one` → 应该跳到 `/login` 看到二维码 + 验证码。

---

## 9. 对外资源最终配置

部署完成后必须**回去**改这些云服务，让它们指向生产域名。

### 9.1 微信公众号

公众号后台 → 设置与开发 → 基本配置 → **服务器配置**：

| 字段 | 值 |
|---|---|
| URL | `https://image2.one/api/wechat/callback` |
| Token | 必须和 `.env` 里 `WECHAT_TOKEN` **完全一致** |
| EncodingAESKey | 点"随机生成" |
| 消息加解密方式 | **明文模式** |

点**提交**，看到"配置成功"即接通（微信会发一个 GET 请求过来做接入校验，校验通过才算成功）。

提交成功后**启用服务器配置**。

### 9.2 R2 CORS（如果之前只配了 localhost）

R2 后台 → bucket → Settings → CORS Policy，确认包含生产域名：

```json
[
  {
    "AllowedOrigins": [
      "https://image2.one",
      "https://www.image2.one"
    ],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["Content-Type", "Content-Length"]
  }
]
```

### 9.3 每日清理 cron

```bash
crontab -e
```

加一行（每天凌晨 3 点）：

```
0 3 * * * cd /home/ubuntu/apps/ai-image-gen && /home/ubuntu/.nvm/versions/node/v22.22.1/bin/npm run cleanup-temp >> /home/ubuntu/apps/ai-image-gen/logs/cleanup.log 2>&1
```

Node 路径检查：
```bash
which node
ls ~/.nvm/versions/node/
```

把 `v22.22.1` 换成你实际的版本号。

---

## 10. 验证清单

逐项打钩：

- [ ] `pm2 status` 显示 web 和 worker 都 `online`
- [ ] `curl -I https://image2.one` 返回 200 或 307（不是 502/504）
- [ ] 浏览器无痕模式打开 `https://image2.one` → 跳 `/login`，看到二维码 + 验证码
- [ ] 微信扫码关注 + 发送验证码 → 5 秒内自动跳转登录成功
- [ ] 输入"小猫"点生成 → 历史区出现 loading 占位 → 30-60 秒后出图
- [ ] 切到 `/gallery` → 浮动任务面板依然显示其他在跑的任务（如果有）
- [ ] 公开一张图 → 在 `/gallery` 看到，作者头像正常
- [ ] 在 `/gallery` 点"用这个提示词试试" → 跳到首页 + prompt 已填
- [ ] `pm2 logs worker` 看到 `[worker] processing job=...` 和 `done in xxxms`
- [ ] `redis-cli KEYS 'bull:*'` 看到 BullMQ 数据
- [ ] `mysql -h <rds> -u <user> -p ai_image_gen_prod -e 'SELECT COUNT(*) FROM jobs;'` 返回数字

---

## 11. 日常运维

### 11.1 代码升级（本地 push 之后）

```bash
ssh ubuntu@your-server
cd ~/apps/ai-image-gen
git pull
nvm use
npm ci
npm run db:push        # 如果 schema 变了
npm run build
pm2 reload ecosystem.config.cjs --update-env
```

或一键：
```bash
bash scripts/deploy.sh
```

### 11.2 看日志

```bash
pm2 logs web --lines 200
pm2 logs worker --lines 200
pm2 logs           # 看所有
```

历史日志在 `~/apps/ai-image-gen/logs/`。

### 11.3 看任务

```bash
# Redis 队列状态
redis-cli LLEN bull:generate:wait      # 排队中
redis-cli LRANGE bull:generate:active 0 -1   # 正在跑

# DB 失败任务
mysql -h <rds> -u <user> -p ai_image_gen_prod -e \
  "SELECT id,prompt,errorMessage,finishedAt FROM jobs WHERE status='failed' ORDER BY finishedAt DESC LIMIT 10;"
```

### 11.4 重启

```bash
pm2 restart web      # 只重 web
pm2 restart worker   # 只重 worker
pm2 restart all
```

### 11.5 紧急停服

```bash
pm2 stop all
# 恢复
pm2 start all
```

---

## 12. 常见问题

### Q: pm2 启动后 web 立刻 errored
看 `pm2 logs web` 找具体报错。通常是 `.env` 缺值。

### Q: worker 日志显示 Redis 连接错误
- `redis-cli ping` 验证 Redis 在跑
- `.env` 的 `REDIS_URL` 写对了吗
- Redis 配置文件里有没有要密码

### Q: 微信公众号"配置失败 token verify failed"
- `.env` 里的 `WECHAT_TOKEN` 必须和后台填的**完全一样**
- 服务器时间和北京时间是否偏移过大（用 `timedatectl` 看）
- `curl https://image2.one/api/wechat/callback?signature=t&timestamp=1&nonce=2&echostr=hi` 能通吗

### Q: SSE 大概 30 秒就断
Nginx 的 SSE location 没配 `proxy_buffering off`。回到第 8.2 步检查。

### Q: 图片显示但 fetch 报 CORS
R2 CORS Policy 没加生产域名。回到第 9.2 步检查。

### Q: 微信回调 5s 超时
- OpenAI 慢、RDS 慢都可能。`pm2 logs web` 看具体哪一步耗时
- 数据库做在不同地域：换到同地域

### Q: 部署时 `npm run db:push` 失败
- RDS 白名单没加服务器 IP
- `DATABASE_URL` 编码错（密码含 `@` 要 `%40`）
- 用 5.1 节的脚本验证连接

### Q: 服务器磁盘满了
```bash
# 看日志
du -sh ~/.pm2/logs/
du -sh ~/apps/ai-image-gen/logs/
# 清旧日志
pm2 flush
# 清 Next.js 缓存
rm -rf ~/apps/ai-image-gen/.next/cache
```

### Q: 想看实时请求
```bash
pm2 logs web        # 实时
tail -f ~/.pm2/logs/web-out.log
```

---

## 附录：目录结构

```
~/apps/ai-image-gen/
├── .env                    # ⚠️ 生产配置（不在 git 里）
├── .next/                  # next build 产物
├── ecosystem.config.cjs    # PM2 配置
├── lib/generated/          # Prisma 生成的客户端
├── logs/                   # PM2 + cleanup 日志
├── node_modules/
├── public/
│   └── wechat-qr.png      # 公众号关注二维码
├── scripts/
│   ├── bootstrap.sh        # 一次性装环境
│   ├── deploy.sh           # 日常升级
│   └── cleanup-temp.ts     # cron 调用
└── ...
```

---

部署完成后建议**24 小时内观察一次 worker 日志**，确认无异常错误堆栈。第一次跑通后这套架构基本稳定，只有代码更新时需要 `git pull && bash scripts/deploy.sh` 即可。
