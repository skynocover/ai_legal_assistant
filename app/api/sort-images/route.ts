import { NextRequest, NextResponse } from "next/server";
import axios, { AxiosError } from "axios";

interface ImageData {
  name: string;
  base64: string;
  mimeType: string;
}

interface SortRequest {
  images: ImageData[];
}

interface SortResponse {
  order: {
    reason: string;
    imageName: string[];
  };
}

const SYSTEM_PROMPT = `你現在是一個將圖片排序的AI工具
我現在會給你圖片名稱跟圖片
這些圖片內容是聊天室
有些圖片有日期跟時間 有些沒有
你則需要根據日期與時間或是對話內容
回應我這些圖片的排序

回應時給我一個圖片名稱的陣列
`;

// JSON Schema for structured output
const RESPONSE_SCHEMA = {
  type: "json_schema",
  json_schema: {
    name: "image_sort_response",
    strict: true,
    schema: {
      type: "object",
      properties: {
        order: {
          type: "object",
          properties: {
            // reason: {
            //   type: "string",
            //   description: "排序原因的詳細說明",
            // },
            imageName: {
              type: "array",
              items: { type: "string" },
              description: "按照時間順序排列的圖片名稱陣列",
            },
          },
          required: ["imageName"],
          // required: ["reason", "imageName"],
          additionalProperties: false,
        },
      },
      required: ["order"],
      additionalProperties: false,
    },
  },
} as const;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: SortRequest = await request.json();
    const { images } = body;

    if (!images || images.length === 0) {
      return NextResponse.json({ error: "沒有提供圖片" }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "未設定 OPENROUTER_API_KEY" },
        { status: 500 }
      );
    }

    // 建立 messages 陣列
    const userContent: Array<{
      type: string;
      text?: string;
      image_url?: { url: string };
    }> = [];

    // 依序加入每張圖片和其檔名
    for (const image of images) {
      // 加入圖片
      userContent.push({
        type: "image_url",
        image_url: {
          url: `data:${image.mimeType};base64,${image.base64}`,
        },
      });
      // 加入檔名
      userContent.push({
        type: "text",
        text: image.name,
      });
    }

    // 加入最後的指令
    userContent.push({
      type: "text",
      text: "給我圖片的排序",
    });

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: userContent,
          },
        ],
        response_format: RESPONSE_SCHEMA,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer":
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
          "X-Title": "AI Legal Assistant",
        },
      }
    );
    console.log(response.data.choices?.[0]?.message?.reasoning);

    const content = response.data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: "AI 沒有回應" }, { status: 500 });
    }

    // 解析 JSON 回應
    let sortResult: SortResponse;
    try {
      sortResult = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      return NextResponse.json(
        { error: "AI 回應格式錯誤", details: content },
        { status: 500 }
      );
    }

    return NextResponse.json(sortResult);
  } catch (error) {
    console.error("Sort images error:", error);

    if (error instanceof AxiosError) {
      const status = error.response?.status || 500;
      const errorData = error.response?.data;
      console.error("OpenRouter API error:", status, errorData);

      // 根據狀態碼提供更明確的錯誤訊息
      let errorMessage = "AI 服務請求失敗";
      if (status === 503) {
        errorMessage = "AI 服務暫時無法使用，請稍後再試";
      } else if (status === 429) {
        errorMessage = "請求過於頻繁，請稍後再試";
      } else if (status === 401) {
        errorMessage = "API 金鑰無效或已過期";
      } else if (status === 400) {
        errorMessage = "請求格式錯誤";
      }

      return NextResponse.json(
        { error: errorMessage, details: errorData, status },
        { status }
      );
    }

    return NextResponse.json({ error: "伺服器內部錯誤" }, { status: 500 });
  }
}
