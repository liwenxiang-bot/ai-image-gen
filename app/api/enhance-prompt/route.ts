import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
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
            content: `You are an expert prompt engineer for AI image generation (GPT Image 2). Your job is to take a short user description (often in Chinese) and expand it into a detailed, high-quality English prompt that will produce stunning images.

Rules:
- Output a JSON object with two fields: "en" (English prompt) and "zh" (Chinese translation of the English prompt)
- The English prompt should include specific details: lighting, composition, style, mood, colors, textures
- Keep the English prompt under 200 words
- The Chinese translation should be natural and readable, helping users understand what the English prompt describes
- Maintain the user's original intent
- Use descriptive, vivid language
- If the user specifies a style (e.g. anime, oil painting), keep it
- Output ONLY valid JSON, no markdown fences, no explanations`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
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

    try {
      const parsed = JSON.parse(content);
      return NextResponse.json({
        success: true,
        prompt: parsed.en,
        translation: parsed.zh,
      });
    } catch {
      // Fallback: if JSON parsing fails, treat the whole response as the prompt
      return NextResponse.json({ success: true, prompt: content, translation: "" });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "服务器内部错误";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
