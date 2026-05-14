#!/usr/bin/env bash
# 服务器初始化脚本：在一台干净的 Ubuntu/Debian 服务器上装齐所有依赖。
# 只需要在首次部署时跑一次。
#
# 用法：sudo bash scripts/bootstrap.sh
#
# 装的东西：
#   - Node.js 22 (via nvm under the invoking user)
#   - Redis (with appendonly persistence)
#   - PM2 (global)
#   - Nginx + certbot (for TLS)
#   - 工具：git, build-essential
#
# 注意：脚本以 sudo 运行，但 nvm/node/pm2 装在调用者的 $HOME 下。

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "请用 sudo 运行：sudo bash scripts/bootstrap.sh"
  exit 1
fi

REAL_USER="${SUDO_USER:-$USER}"
REAL_HOME=$(eval echo "~$REAL_USER")

echo "==> 用户：$REAL_USER  HOME：$REAL_HOME"

echo "==> 更新 apt"
apt-get update -y

echo "==> 安装基础工具"
apt-get install -y curl git build-essential ca-certificates redis-server nginx

echo "==> 启用 Redis + 开启持久化"
sed -i 's/^# *appendonly no/appendonly yes/; s/^appendonly no/appendonly yes/' /etc/redis/redis.conf || true
systemctl enable redis-server
systemctl restart redis-server

echo "==> 安装 certbot"
apt-get install -y certbot python3-certbot-nginx

echo "==> 为 $REAL_USER 安装 nvm + Node (读项目 .nvmrc)"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
sudo -u "$REAL_USER" PROJECT_DIR="$PROJECT_DIR" bash <<'EOF'
set -euo pipefail
if [[ ! -d "$HOME/.nvm" ]]; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
fi
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
cd "$PROJECT_DIR"
nvm install         # 读 .nvmrc 装对应版本
nvm alias default "$(cat .nvmrc)"
npm install -g pm2
EOF

echo
echo "==> bootstrap 完成"
echo "==> 接下来："
echo "    1. 切换到 $REAL_USER：su - $REAL_USER"
echo "    2. git clone <repo> 到 ~/apps/ai-image-gen"
echo "    3. cp .env.production.template .env 并填写"
echo "    4. cd ~/apps/ai-image-gen && bash scripts/deploy.sh"
echo "    5. pm2 startup 设置开机自启"
echo "    6. 配置 Nginx 并跑 certbot 拿证书"
