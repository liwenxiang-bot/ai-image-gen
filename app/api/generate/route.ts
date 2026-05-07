import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com").replace(
    /\/+$/,
    ""
  );

  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: "未配置 API Key，请在 .env.local 中设置 OPENAI_API_KEY" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { prompt, mode, image, size, quality } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { success: false, error: "请输入提示词" },
        { status: 400 }
      );
    }

    let apiResponse: Response;

    if (mode === "image-to-image" && image) {
      // Image-to-image: use /v1/images/edits with multipart/form-data
      const formData = new FormData();
      formData.append("model", "gpt-image-2");
      formData.append("prompt", prompt);
      formData.append("n", "1");
      if (size && size !== "auto") formData.append("size", size);
      if (quality) formData.append("quality", quality);

      // Convert base64 to Blob
      const binaryStr = atob(image);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "image/png" });
      formData.append("image[]", blob, "image.png");

      apiResponse = await fetch(`${baseUrl}/v1/images/edits`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      });
    } else {
      // Text-to-image: use /v1/images/generations with JSON
      const payload: Record<string, unknown> = {
        model: "gpt-image-2",
        prompt,
        n: 1,
        quality: quality || "auto",
      };
      if (size && size !== "auto") payload.size = size;

      apiResponse = await fetch(`${baseUrl}/v1/images/generations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });
    }

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json().catch(() => ({}));
      const errorMessage =
        errorData?.error?.message ||
        errorData?.message ||
        `API 请求失败 (${apiResponse.status})`;
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: apiResponse.status }
      );
    }

    const data = await apiResponse.json();
    const imageData = data?.data?.[0];

    if (!imageData) {
      return NextResponse.json(
        { success: false, error: "API 返回数据格式异常" },
        { status: 500 }
      );
    }

    // Handle both b64_json and url response formats
    let imageBase64 = imageData.b64_json;

    if (!imageBase64 && imageData.url) {
      // Fetch the image URL and convert to base64
      const imgResponse = await fetch(imageData.url);
      const imgBuffer = await imgResponse.arrayBuffer();
      imageBase64 = Buffer.from(imgBuffer).toString("base64");
    }

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: "无法获取生成的图片" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      image: imageBase64,
      revisedPrompt: imageData.revised_prompt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "服务器内部错误";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
