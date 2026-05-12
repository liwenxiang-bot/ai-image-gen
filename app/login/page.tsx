import LoginClient from "./LoginClient";

export const metadata = {
  title: "登录 — GPT Image 2",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <LoginClient
        qrcodeUrl={process.env.NEXT_PUBLIC_WECHAT_QRCODE_URL || "/wechat-qr.png"}
        accountName={process.env.NEXT_PUBLIC_WECHAT_ACCOUNT_NAME || "玖亿AI"}
      />
    </div>
  );
}
