const TARGET_SAMPLE_RATE = 16000;
const TARGET_BITRATE = "32k";
const MAX_FILE_SIZE = 7 * 1024 * 1024; // 7MB

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ffmpeg: any = null;
let ffmpegLoading: Promise<void> | null = null;

interface CompressResult {
  compressedFile: File;
  originalSize: number;
  compressedSize: number;
  isOverLimit: boolean;
}

async function loadFFmpeg() {
  if (ffmpeg?.loaded) {
    return ffmpeg;
  }

  // 避免重複載入
  if (ffmpegLoading) {
    await ffmpegLoading;
    return ffmpeg;
  }

  ffmpegLoading = (async () => {
    const { FFmpeg } = await import("@ffmpeg/ffmpeg");

    ffmpeg = new FFmpeg();

    ffmpeg.on("log", ({ message }: { message: string }) => {
      console.log("[FFmpeg]", message);
    });

    ffmpeg.on("progress", ({ progress }: { progress: number }) => {
      console.log(`[FFmpeg] 進度: ${(progress * 100).toFixed(0)}%`);
    });

    // 直接從 CDN 載入，不使用 toBlobURL
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
    await ffmpeg.load({
      coreURL: `${baseURL}/ffmpeg-core.js`,
      wasmURL: `${baseURL}/ffmpeg-core.wasm`,
    });

    console.log("FFmpeg 載入完成");
  })();

  await ffmpegLoading;
  return ffmpeg;
}

export async function compressAudio(file: File): Promise<CompressResult> {
  if (typeof window === "undefined") {
    throw new Error("compressAudio can only be used in browser");
  }

  console.log("開始壓縮音訊...");
  const originalSize = file.size;

  const ff = await loadFFmpeg();

  // 取得檔案副檔名
  const inputExt = file.name.split(".").pop()?.toLowerCase() || "mp3";
  const inputName = `input.${inputExt}`;
  const outputName = "output.mp3";

  // 讀取檔案為 Uint8Array
  const fileBuffer = await file.arrayBuffer();
  const fileData = new Uint8Array(fileBuffer);

  // 寫入輸入檔案
  await ff.writeFile(inputName, fileData);

  // 執行轉檔：16kHz mono, 32kbps MP3
  await ff.exec([
    "-i", inputName,
    "-ar", String(TARGET_SAMPLE_RATE),
    "-ac", "1",
    "-b:a", TARGET_BITRATE,
    "-y",
    outputName,
  ]);

  // 讀取輸出檔案
  const data = await ff.readFile(outputName);
  const compressedBlob = new Blob([data], { type: "audio/mpeg" });
  const compressedSize = compressedBlob.size;
  const isOverLimit = compressedSize > MAX_FILE_SIZE;

  // 清理暫存檔
  await ff.deleteFile(inputName);
  await ff.deleteFile(outputName);

  console.log(`原始: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`壓縮後: ${(compressedSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`壓縮比: ${((1 - compressedSize / originalSize) * 100).toFixed(1)}%`);
  if (isOverLimit) {
    console.warn(`警告: 壓縮後檔案超過 7MB 限制`);
  }

  const compressedFile = new File(
    [compressedBlob],
    file.name.replace(/\.[^/.]+$/, "") + "_compressed.mp3",
    { type: "audio/mpeg" }
  );

  return { compressedFile, originalSize, compressedSize, isOverLimit };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
