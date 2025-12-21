/**
 * 將圖片轉換為 WebP 格式（JPEG 和 GIF 除外）
 * @param file 原始圖片檔案
 * @param quality 壓縮品質 (0-1)
 * @returns 轉換後的檔案
 */
export async function convertImageToWebp(
  file: File,
  quality: number = 0.8
): Promise<File> {
  const mimeType = file.type.toLowerCase();

  // JPEG 和 GIF 不需要轉換
  if (mimeType === "image/jpeg" || mimeType === "image/gif") {
    return file;
  }

  // 非圖片檔案直接返回
  if (!mimeType.startsWith("image/")) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      if (!ctx) {
        reject(new Error("無法創建 canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("無法轉換圖片"));
            return;
          }

          // 更新檔名為 .webp
          const originalName = file.name;
          const nameWithoutExt =
            originalName.substring(0, originalName.lastIndexOf(".")) ||
            originalName;
          const newName = `${nameWithoutExt}.webp`;

          const newFile = new File([blob], newName, { type: "image/webp" });
          resolve(newFile);
        },
        "image/webp",
        quality
      );
    };

    img.onerror = () => {
      reject(new Error("無法載入圖片"));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * 壓縮 PDF 檔案（透過降低圖片品質）
 * 注意：這是一個簡化版本，實際上在純前端很難有效壓縮 PDF
 * @param file PDF 檔案
 * @returns 壓縮後的檔案（或原檔案如果無法壓縮）
 */
export async function compressPdf(file: File): Promise<File> {
  // 檢查是否為 PDF
  if (file.type !== "application/pdf") {
    return file;
  }

  // 對於簡單的壓縮，我們可以嘗試使用 canvas 重新渲染
  // 但這需要 pdf.js 庫，目前先返回原檔案
  // 實際的 PDF 壓縮建議在後端進行

  // 簡單壓縮：如果檔案大於 5MB，顯示警告
  if (file.size > 5 * 1024 * 1024) {
    console.warn(`PDF 檔案 ${file.name} 大於 5MB，建議手動壓縮`);
  }

  return file;
}

/**
 * 處理上傳的檔案（圖片轉換 + PDF 壓縮）
 * @param file 原始檔案
 * @returns 處理後的檔案
 */
export async function processFile(file: File): Promise<File> {
  const mimeType = file.type.toLowerCase();

  if (mimeType.startsWith("image/")) {
    return convertImageToWebp(file);
  }

  if (mimeType === "application/pdf") {
    return compressPdf(file);
  }

  return file;
}

/**
 * 將檔案轉換為 Base64
 * @param file 檔案
 * @returns Base64 字串
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // 移除 data:xxx;base64, 前綴
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 取得當前日期的各種格式
 */
export function getDateFormats(): {
  minguo: string;
  minguoShort: string;
  western: string;
  westernShort: string;
} {
  const now = new Date();
  const year = now.getFullYear();
  const minguoYear = year - 1911;
  const month = now.getMonth() + 1;
  const day = now.getDate();

  return {
    minguo: `${minguoYear}年${month}月${day}日`,
    minguoShort: `${minguoYear}年${month}月`,
    western: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    westernShort: `${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`,
  };
}
