import { NextRequest, NextResponse } from "next/server";
import axios, { AxiosError } from "axios";

interface FileData {
  name: string;
  base64: string;
  mimeType: string;
}

interface SuggestRequest {
  file: FileData;
  namingExamples: string[];
}

interface SuggestResponse {
  suggestedName: string;
  reason: string;
}

const BASE_SYSTEM_PROMPT = `你是一個專業的法律文件命名助手。
你的任務是根據文件內容和提供的命名範例，為這個檔案建議一個合適的新檔名。

命名規則：
1. 檔名應該簡潔明瞭，能夠反映文件的主要內容
2. 參考提供的命名範例風格
3. 如果文件包含日期，應該使用民國年格式（如：114年5月）
4. 如果是地址相關文件，應該包含地址資訊
5. 如果是特定類型的文件（如謄本、收據、帳單等），應該包含文件類型

注意：
- 保持原始檔案的副檔名
- 不要使用特殊字符
- 檔名長度適中，不要太長
- 只回應這一個檔案的命名建議`;

const RESPONSE_SCHEMA = {
  type: "json_schema",
  json_schema: {
    name: "filename_suggestion_response",
    strict: true,
    schema: {
      type: "object",
      properties: {
        suggestedName: {
          type: "string",
          description: "建議的新檔名（包含副檔名）",
        },
        reason: {
          type: "string",
          description: "命名原因的簡短說明",
        },
      },
      required: ["suggestedName", "reason"],
      additionalProperties: false,
    },
  },
} as const;

function buildSystemPrompt(namingExamples: string[]): string {
  let prompt = BASE_SYSTEM_PROMPT;

  if (namingExamples.length > 0) {
    prompt += `\n\n命名範例：\n${namingExamples.map((ex, i) => `${i + 1}. ${ex}`).join("\n")}`;
  }

  return prompt;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: SuggestRequest = await request.json();
    const { file, namingExamples } = body;

    if (!file) {
      return NextResponse.json({ error: "沒有提供檔案" }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "未設定 OPENROUTER_API_KEY" },
        { status: 500 }
      );
    }

    // 建立 system prompt（包含命名範例）
    const systemPrompt = buildSystemPrompt(namingExamples);

    // 建立 user content
    const userContent: Array<{
      type: string;
      text?: string;
      image_url?: { url: string };
    }> = [];

    // 判斷是否為圖片或 PDF
    const isImage = file.mimeType.startsWith("image/");
    const isPdf = file.mimeType === "application/pdf";

    if (isImage || isPdf) {
      // 加入圖片或 PDF
      userContent.push({
        type: "image_url",
        image_url: {
          url: `data:${file.mimeType};base64,${file.base64}`,
        },
      });
    }

    // 加入檔名資訊和指令
    const userText = isPdf
      ? `這是一個 PDF 檔案，原始檔名：${file.name}\n請根據 PDF 內容為這個檔案建議一個合適的新檔名。`
      : `原始檔名：${file.name}\n請為這個檔案建議一個合適的新檔名。`;

    userContent.push({
      type: "text",
      text: userText,
    });

    // 印出 prompts 確認
    console.log("=== System Prompt ===");
    console.log(systemPrompt);
    console.log("\n=== User Prompt ===");
    console.log(userText);
    if (isImage) {
      console.log("[附帶圖片]");
    }
    if (isPdf) {
      console.log("[附帶 PDF]");
    }
    console.log("====================\n");

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: systemPrompt,
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

    const content = response.data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: "AI 沒有回應" }, { status: 500 });
    }

    // 解析 JSON 回應
    let suggestResult: SuggestResponse;
    try {
      suggestResult = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      return NextResponse.json(
        { error: "AI 回應格式錯誤", details: content },
        { status: 500 }
      );
    }

    console.log("=== AI Response ===");
    console.log(suggestResult);
    console.log("===================\n");

    return NextResponse.json(suggestResult);
  } catch (error) {
    console.error("Suggest filename error:", error);

    if (error instanceof AxiosError) {
      const status = error.response?.status || 500;
      const errorData = error.response?.data;
      console.error("OpenRouter API error:", status, errorData);

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
