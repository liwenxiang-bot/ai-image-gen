# 微信公众号联调指南

本应用使用 **个人未认证订阅号 + 验证码** 模式登录：用户在网页拿到 6 位验证码 → 关注公众号 → 把验证码发给公众号 → 网页 5 秒内自动登录。

## 一、公众号后台配置

### 1. 启用服务器配置

公众号后台 → **设置与开发 → 基本配置** → **服务器配置 → 启用**

- **服务器地址(URL)**：`https://<你的域名>/api/wechat/callback`
- **令牌(Token)**：任意随机字符串（写到 `.env.local` 的 `WECHAT_TOKEN`）
- **消息加解密密钥(EncodingAESKey)**：点"随机生成"即可（本应用未启用加密，可忽略）
- **消息加解密方式**：**明文模式**

### 2. 验证 URL

点击"提交"。微信会向你的 URL 发一个 GET 请求做接入校验：

```
GET /api/wechat/callback?signature=xxx&timestamp=xxx&nonce=xxx&echostr=xxx
```

服务器端会：
1. 用 `WECHAT_TOKEN` + timestamp + nonce 排序 + SHA1 计算签名
2. 与请求中 `signature` 比对
3. 比对一致则原样返回 `echostr`

后台看到"提交成功"即可。

### 3. IP 白名单

在 **基本配置 → IP 白名单** 中加入服务器 IP（如有）。开发期 ngrok 不需要。

---

## 二、本地开发联调（ngrok）

公众号必须能 HTTPS 访问到你的回调，因此本地开发要用内网穿透。

### 1. 安装 ngrok

```bash
brew install ngrok
ngrok config add-authtoken <你的 token>
```

注册 https://ngrok.com 拿 authtoken。

### 2. 启动应用 + ngrok

```bash
# 终端 1
npm run dev

# 终端 2
ngrok http 3000
```

ngrok 会输出 `https://xxxx-xx-xx-xx.ngrok-free.app` 这样的临时域名。

### 3. 把 ngrok 域名填入公众号后台

把 `https://xxxx.ngrok-free.app/api/wechat/callback` 填入"服务器地址"，点击"提交"，看到成功即接入完成。

> ⚠️ **免费版 ngrok 域名每次重启会变**，调试期间尽量保持 ngrok 不断。

---

## 三、完整登录流程验证

1. 浏览器打开 `https://<你的 ngrok 域名>/` → 自动跳转 `/login`
2. 页面显示一个 6 位验证码（如 `K9X3PM`）
3. 在微信里**关注公众号** → 发送 `K9X3PM`
4. 公众号被动回复"登录成功，请返回网页继续操作"
5. 网页 2 秒内自动跳转回 `/`，Header 右上角显示用户标识

---

## 四、故障排查

### 接入校验失败
- `WECHAT_TOKEN` 是否与后台填写一致
- 服务器时钟是否偏移过大（微信会校验 timestamp）
- 看应用日志，回调路由是否抛错

### 发送消息没反应
- 公众号"服务器配置"是否已**启用**
- 是否选择了**明文模式**（本应用不解密 AES）
- 看 `npm run dev` 控制台是否有 POST `/api/wechat/callback` 日志

### 公众号回复超过 5 秒导致用户看到"该公众号暂时无法提供服务"
- 微信被动回复严格 5 秒超时
- 数据库延迟是常见原因，检查 RDS 连接是否慢
- 实在不行，回调里可以先返回成功并异步处理（但订阅号无法主动推送，只能不回消息）

### 订阅号限制
- **个人未认证订阅号**没有客服消息、模板消息、带参二维码权限
- 只能做"被动回复"
- 用户必须关注才能收到回复

---

## 五、生产部署

1. 把应用部署到固定 HTTPS 域名（Vercel / 阿里云 ECS 等）
2. 公众号后台把"服务器地址"改为生产域名
3. 在生产环境的 `.env` 中设置 `DATABASE_URL` 指向 RDS 生产库
4. RDS 把生产服务器 IP 加入白名单
