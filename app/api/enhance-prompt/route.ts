import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json(
      { success: false, error: "未登录" },
      { status: 401 }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com").replace(
    /\/+$/,
    ""
  );

  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: "未配置 API Key" },
      { status: 500 }
    );
  }

  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { success: false, error: "请输入提示词" },
        { status: 400 }
      );
    }

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5.4",
        messages: [
          {
            role: "system",
            content: `你是 AI 绘画（GPT Image 2）的提示词专家。把用户输入的简短描述扩写成一段详尽、画面感强的中文 prompt，让模型生成更出色的图片。

规则：
- 直接输出扩写后的中文 prompt，不要任何前后缀、引号、Markdown 或解释
- 保留用户原意，不偏题
- 主动补充具体细节：构图、光影、色彩、材质、氛围、镜头视角、风格
- 用户已指定的风格（如二次元、油画、赛博朋克）必须保留
- 控制在 200 字以内，保持自然流畅，避免堆砌生硬的标签词
- 用描述性、画面化的语言，不要罗列英文术语`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          success: false,
          error: errorData?.error?.message || `请求失败 (${response.status})`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return NextResponse.json(
        { success: false, error: "优化失败，请重试" },
        { status: 500 }
      );
    }

    const cleaned = content.replace(/^["']+|["']+$/g, "").trim();
    return NextResponse.json({ success: true, prompt: cleaned });
  } catch (error) {
    const message = error instanceof Error ? error.message : "服务器内部错误";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
