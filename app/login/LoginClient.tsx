"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Check, Copy, Loader2, Palette, RefreshCw, Sparkles } from "lucide-react";
import Button from "@/components/ui/Button";

type Status = "loading" | "waiting" | "expired" | "ok" | "error";

type StartResponse = { code: string; expiresAt: number };
type StatusResponse = { status: "pending" | "expired" | "ok" };

const POLL_INTERVAL_MS = 3500;

export default function LoginClient({
  qrcodeUrl,
  accountName,
}: {
  qrcodeUrl: string;
  accountName: string;
}) {
  const [code, setCode] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [status, setStatus] = useState<Status>("loading");
  const [remaining, setRemaining] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const tickRef = useRef<NodeJS.Timeout | null>(null);
  const copyResetRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
    pollingRef.current = null;
    tickRef.current = null;
  };

  const fetchCode = useCallback(async (showLoading = true) => {
    stopPolling();
    if (showLoading) setStatus("loading");
    try {
      const res = await fetch("/api/auth/wechat/start", { method: "POST" });
      if (!res.ok) throw new Error("failed");
      const data: StartResponse = await res.json();
      setCode(data.code);
      setExpiresAt(data.expiresAt);
      setStatus("waiting");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    // Initial fetch on mount; fetchCode is an async action that also updates state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchCode(false);
    return stopPolling;
  }, [fetchCode]);

  useEffect(() => {
    if (status !== "waiting" || !code) return;

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/auth/wechat/status?code=${encodeURIComponent(code)}`,
          { cache: "no-store" },
        );
        const data: StatusResponse = await res.json();
        if (data.status === "ok") {
          stopPolling();
          setStatus("ok");
          window.location.href = "/";
        } else if (data.status === "expired") {
          stopPolling();
          setStatus("expired");
        }
      } catch {
        // ignore transient errors; keep polling
      }
    };

    pollingRef.current = setInterval(poll, POLL_INTERVAL_MS);

    const updateRemaining = () => {
      const ms = expiresAt - Date.now();
      if (ms <= 0) {
        stopPolling();
        setStatus("expired");
        setRemaining(0);
        return;
      }
      setRemaining(Math.ceil(ms / 1000));
    };
    updateRemaining();
    tickRef.current = setInterval(updateRemaining, 1000);

    return stopPolling;
  }, [status, code, expiresAt]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  const handleCopy = async () => {
    if (!code || status !== "waiting") return;
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // ignore; some browsers without clipboard permission
    }
    setCopied(true);
    if (copyResetRef.current) clearTimeout(copyResetRef.current);
    copyResetRef.current = setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
      <div className="grid md:grid-cols-2">
        {/* 左栏：品牌 + 二维码 */}
        <div className="relative flex flex-col items-center justify-between gap-5 overflow-hidden border-b border-border bg-gradient-to-br from-accent/15 via-accent/5 to-background p-8 md:border-b-0 md:border-r md:p-10">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-accent/20 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-accent/10 blur-3xl"
          />

          <div className="relative flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15">
                <Palette className="h-4 w-4 text-accent" />
              </div>
              <span className="text-base font-bold tracking-tight">
                GPT Image 2
              </span>
            </div>
            <p className="text-center text-xs text-foreground/55">
              AI 画图，免费体验
            </p>
          </div>

          <div className="relative flex flex-col items-center gap-3">
            <div className="relative">
              <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-accent/30 to-accent/5 opacity-60 blur-md" />
              <div className="relative rounded-2xl bg-background p-2.5 shadow-md ring-1 ring-border/60">
                <Image
                  src={qrcodeUrl}
                  alt={`${accountName} 公众号二维码`}
                  width={200}
                  height={200}
                  className="rounded-lg"
                  unoptimized
                />
              </div>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <div className="text-[11px] text-foreground/50">微信扫码关注</div>
              <div className="text-sm font-semibold">{accountName}</div>
            </div>
          </div>

          <ul className="relative space-y-1.5 text-xs text-foreground/65">
            <li className="flex items-center gap-1.5">
              <Check className="h-3 w-3 text-accent" />
              文生图 / 图生图，支持多张参考图
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="h-3 w-3 text-accent" />
              AI 提示词增强，效果更出色
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="h-3 w-3 text-accent" />
              历史记录云端保存，跨设备同步
            </li>
          </ul>
        </div>

        {/* 右栏：登录操作 */}
        <div className="flex flex-col justify-center gap-5 p-8 md:p-10">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
              <Sparkles className="h-3 w-3" />
              登录后免费使用
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight">微信登录</h1>
            <p className="mt-2 text-sm text-foreground/60">
              扫码关注公众号，向公众号发送下方验证码即可登录。
            </p>
          </div>

          <div className="rounded-xl border border-border bg-muted/50 p-5">
            <div className="text-xs uppercase tracking-wider text-foreground/50">
              你的验证码
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleCopy}
                disabled={status !== "waiting" || !code}
                className="group inline-flex items-center gap-2 font-mono text-3xl font-bold tracking-[0.4em] text-accent transition-opacity disabled:cursor-default enabled:hover:opacity-80"
                aria-label="点击复制验证码"
                title={status === "waiting" ? "点击复制" : undefined}
              >
                {status === "loading" ? (
                  <Loader2 className="h-7 w-7 animate-spin" />
                ) : (
                  <span>{code || "------"}</span>
                )}
                {status === "waiting" && code && (
                  <span className="ml-1 text-foreground/40 transition-colors group-hover:text-accent">
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => fetchCode()}
                disabled={status === "loading"}
                className="text-foreground/60 hover:text-foreground disabled:opacity-50"
                aria-label="刷新验证码"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            {status === "waiting" && remaining > 0 && (
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-foreground/50">
                  {mins}:{secs.toString().padStart(2, "0")} 后过期
                </span>
                {copied && (
                  <span className="font-medium text-green-600">
                    已复制，去微信粘贴发送
                  </span>
                )}
              </div>
            )}
          </div>

          <StatusPill status={status} />

          {status === "expired" && (
            <Button onClick={() => fetchCode()} variant="primary" size="md">
              重新获取验证码
            </Button>
          )}
          {status === "error" && (
            <Button onClick={() => fetchCode()} variant="primary" size="md">
              重试
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  const label =
    status === "loading"
      ? "加载中..."
      : status === "waiting"
      ? "等待你在公众号中发送验证码..."
      : status === "ok"
      ? "登录成功，正在跳转..."
      : status === "expired"
      ? "验证码已过期"
      : "网络异常";

  const tone =
    status === "ok"
      ? "bg-green-500/10 text-green-600"
      : status === "expired" || status === "error"
      ? "bg-red-500/10 text-red-600"
      : "bg-accent/10 text-accent";

  return (
    <div className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${tone}`}>
      {status === "waiting" && <Loader2 className="h-4 w-4 animate-spin" />}
      <span>{label}</span>
    </div>
  );
}
