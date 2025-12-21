import { NextRequest, NextResponse } from "next/server";
import axios, { AxiosError } from "axios";

interface TranscriptSegment {
  time: string;
  speaker: string;
  content: string;
}

const SYSTEM_PROMPT = `你現在是一個專門把錄音檔轉成逐字稿的工具

輸出時格式為

[
  {
    "time": "時間",
    "speaker": "speaker1",
    "content": "說話的內容"
  },
  {
    "time": "時間",
    "speaker": "speaker2",
    "content": "說話的內容"
  }
]

現在將這個檔案轉成逐字稿給我`;

// JSON Schema for structured output
const RESPONSE_SCHEMA = {
  type: "json_schema",
  json_schema: {
    name: "transcription_response",
    strict: true,
    schema: {
      type: "object",
      properties: {
        transcript: {
          type: "array",
          items: {
            type: "object",
            properties: {
              time: {
                type: "string",
                description: "時間標記，例如 00:00:15",
              },
              speaker: {
                type: "string",
                description: "說話者標識，例如 speaker1, speaker2",
              },
              content: {
                type: "string",
                description: "說話的內容",
              },
            },
            required: ["time", "speaker", "content"],
            additionalProperties: false,
          },
          description: "逐字稿段落陣列",
        },
      },
      required: ["transcript"],
      additionalProperties: false,
    },
  },
} as const;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: "沒有提供音訊檔案" }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "未設定 OPENROUTER_API_KEY" },
        { status: 500 }
      );
    }

    // 將音訊檔轉為 base64
    const arrayBuffer = await audioFile.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = audioFile.type || "audio/mpeg";

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
            content: [
              {
                type: "audio_url",
                audio_url: {
                  url: `data:${mimeType};base64,${base64Audio}`,
                },
              },
              {
                type: "text",
                text: "請將這個錄音檔轉成逐字稿",
              },
            ],
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
    let transcriptResult: { transcript: TranscriptSegment[] };
    try {
      transcriptResult = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      return NextResponse.json(
        { error: "AI 回應格式錯誤", details: content },
        { status: 500 }
      );
    }

    return NextResponse.json(transcriptResult);
  } catch (error) {
    console.error("Transcription error:", error);

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
