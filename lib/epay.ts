import { createHash } from "crypto";

/**
 * 彩虹/派坊系易支付对接。
 *
 * 签名规则（已据官方文档核实）：
 *   1. 取所有业务参数，剔除 sign、sign_type 以及空值；
 *   2. 按参数名 ASCII 升序排序；
 *   3. 拼成 a=b&c=d 形式（值不做 url 编码）；
 *   4. 末尾直接拼接商户 KEY，做 MD5，结果取小写。
 *
 * 异步通知：易支付以 GET 请求 notify_url，trade_status==TRADE_SUCCESS 表示成功，
 * 处理完毕必须向易支付输出纯文本 "success"。
 */

export type EpayConfig = {
  apiUrl: string;
  pid: string;
  key: string;
  notifyUrl: string;
  returnUrl: string;
  payType: string;
};

export function getEpayConfig(): EpayConfig {
  const apiUrl = (process.env.EPAY_API_URL || "").replace(/\/+$/, "");
  const pid = process.env.EPAY_PID || "";
  const key = process.env.EPAY_KEY || "";
  const notifyUrl = process.env.EPAY_NOTIFY_URL || "";
  const returnUrl = process.env.EPAY_RETURN_URL || "";
  const payType = process.env.EPAY_PAY_TYPE || "";
  if (!apiUrl || !pid || !key) {
    throw new Error("易支付未配置（缺少 EPAY_API_URL / EPAY_PID / EPAY_KEY）");
  }
  return { apiUrl, pid, key, notifyUrl, returnUrl, payType };
}

/** 套餐档位 —— 前后端共用的单一数据源。定价：1 积分 = 0.1 元（生一次图 1 积分）。 */
export const PACKAGES = [
  { id: "p1", amount: "6", credits: 60, label: "60 积分" },
  { id: "p2", amount: "18", credits: 180, label: "180 积分" },
  { id: "p3", amount: "30", credits: 300, label: "300 积分" },
] as const;

export type Package = (typeof PACKAGES)[number];

export function findPackage(id: string): Package | undefined {
  return PACKAGES.find((p) => p.id === id);
}

/** 取参与签名的有序拼接串（剔除 sign/sign_type/空值，按 key ASCII 升序）。 */
function signableString(params: Record<string, string>): string {
  return Object.keys(params)
    .filter((k) => k !== "sign" && k !== "sign_type")
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== "")
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
}

/** 生成签名：md5(签名串 + KEY) 小写。 */
export function buildSign(params: Record<string, string>, key: string): string {
  const base = signableString(params);
  return createHash("md5").update(base + key, "utf8").digest("hex");
}

/** 校验回调签名是否合法。 */
export function verifySign(params: Record<string, string>, key: string): boolean {
  const sign = params.sign;
  if (!sign) return false;
  const expected = buildSign(params, key);
  return expected === sign.toLowerCase();
}

/**
 * 构造页面跳转支付 URL（submit.php，GET 形式）。
 * 用户访问该 URL 即跳到易支付收银台扫码。
 */
export function buildSubmitUrl(input: {
  outTradeNo: string;
  amount: string;
  name: string;
}): string {
  const cfg = getEpayConfig();
  const params: Record<string, string> = {
    pid: cfg.pid,
    out_trade_no: input.outTradeNo,
    notify_url: cfg.notifyUrl,
    return_url: cfg.returnUrl,
    name: input.name,
    money: input.amount,
  };
  if (cfg.payType) params.type = cfg.payType;

  const sign = buildSign(params, cfg.key);
  const query = new URLSearchParams({ ...params, sign, sign_type: "MD5" });
  return `${cfg.apiUrl}/submit.php?${query.toString()}`;
}
