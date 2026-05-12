import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { JobsProvider } from "@/hooks/useJobs";
import JobsPanel from "@/components/jobs/JobsPanel";
import GlobalHeader from "@/components/layout/GlobalHeader";
import GlobalFooter from "@/components/layout/GlobalFooter";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GPT Image 2 — AI 画图工具",
  description: "基于 GPT Image 2 模型的在线 AI 画图工具，支持文生图、图生图，免费体验最强 AI 绘画",
  keywords: ["GPT Image 2", "AI 画图", "AI 绘画", "文生图", "图生图", "AI Image Generator"],
  openGraph: {
    title: "GPT Image 2 — AI 画图工具",
    description: "基于 GPT Image 2 模型的在线 AI 画图工具，支持文生图、图生图，免费体验最强 AI 绘画",
    type: "website",
    locale: "zh_CN",
  },
  twitter: {
    card: "summary_large_image",
    title: "GPT Image 2 — AI 画图工具",
    description: "基于 GPT Image 2 模型的在线 AI 画图工具，支持文生图、图生图",
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-screen flex flex-col bg-background text-foreground">
        <JobsProvider>
          <GlobalHeader />
          {children}
          <GlobalFooter />
          <JobsPanel />
        </JobsProvider>
      </body>
    </html>
  );
}
