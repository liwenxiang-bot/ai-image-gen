#!/usr/bin/env bash
# 部署 / 升级脚本：每次代码变更后跑这个。
#
# 用法（在项目根目录）：bash scripts/deploy.sh
#
# 做的事：
#   1. git pull (如果是 git 仓库)
#   2. nvm use（读 .nvmrc）
#   3. npm ci 装依赖
#   4. prisma db push（同步 schema）
#   5. next build
#   6. pm2 reload ecosystem 优雅重启 web + worker
#
# 前置：
#   - 已跑过 scripts/bootstrap.sh
#   - 当前目录是 git 仓库
#   - .env 已存在并填好
#   - pm2 已全局安装

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> 项目目录：$ROOT_DIR"

# 1. 加载 nvm
if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
  export NVM_DIR="$HOME/.nvm"
  # shellcheck source=/dev/null
  . "$NVM_DIR/nvm.sh"
fi

if [[ -f .nvmrc ]]; then
  echo "==> nvm use"
  nvm use
fi

# 2. 检查 .env
if [[ ! -f .env ]]; then
  echo "ERROR: 缺 .env 文件。先 cp .env.production.template .env 并填写。"
  exit 1
fi

# 3. git pull
if [[ -d .git ]]; then
  echo "==> git pull"
  git pull --ff-only
fi

# 4. 装依赖（locked）
echo "==> npm ci"
npm ci

# 5. 同步数据库
echo "==> prisma db push"
npm run db:push

# 6. 构建
echo "==> next build"
npm run build

# 7. pm2 启动 / 重载
if pm2 describe web >/dev/null 2>&1; then
  echo "==> pm2 reload"
  pm2 reload ecosystem.config.cjs --update-env
else
  echo "==> pm2 start (首次)"
  pm2 start ecosystem.config.cjs
  pm2 save
  echo ""
  echo "首次部署 —— 别忘了运行：pm2 startup（按提示 sudo 一下让 pm2 开机自启）"
fi

echo
echo "==> 部署完成"
pm2 status
