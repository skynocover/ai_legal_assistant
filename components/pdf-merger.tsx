"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  FileText,
  Upload,
  Plus,
  Trash2,
  Eye,
  ChevronDown,
  ChevronUp,
  Loader2,
  Settings,
} from "lucide-react";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface FileWithInfo {
  file: File;
  id: string;
  name: string;
  pageCount?: number;
}

export function PdfMerger() {
  const [mainDocument, setMainDocument] = useState<FileWithInfo | null>(null);
  const [attachments, setAttachments] = useState<FileWithInfo[]>([]);
  const [evidence, setEvidence] = useState<FileWithInfo[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fontBytes, setFontBytes] = useState<ArrayBuffer | null>(null);
  const [fontSize, setFontSize] = useState(16);
  const [attachmentStartNumber, setAttachmentStartNumber] = useState(1);
  const [evidenceStartNumber, setEvidenceStartNumber] = useState(1);
  const [addBlankForDoubleSided, setAddBlankForDoubleSided] = useState(true);
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);
  const [attachmentName, setAttachmentName] = useState("附件");
  const [evidenceName, setEvidenceName] = useState("證物");
  const { toast } = useToast();

  useEffect(() => {
    const loadFont = async () => {
      try {
        const response = await fetch(
          "https://fonts.gstatic.com/s/notosanssc/v36/k3kCo84MPvpLmixcA63oeAL7Iqp5IZJF9bmaG9_FnYxNbPzS5HE.ttf"
        );
        const arrayBuffer = await response.arrayBuffer();
        setFontBytes(arrayBuffer);
      } catch (error) {
        console.error("Failed to load font:", error);
        setFontBytes(null);
      }
    };
    loadFont();
  }, []);

  const handleFileUpload = useCallback(
    (files: FileList | null, type: "main" | "attachment" | "evidence") => {
      if (!files) return;

      const newFiles = Array.from(files).map((file) => ({
        file,
        id: crypto.randomUUID(),
        name: file.name,
      }));

      if (type === "main") {
        setMainDocument(newFiles[0] || null);
      } else if (type === "attachment") {
        setAttachments((prev) => [...prev, ...newFiles]);
      } else if (type === "evidence") {
        setEvidence((prev) => [...prev, ...newFiles]);
      }
    },
    []
  );

  const removeFile = useCallback(
    (id: string, type: "main" | "attachment" | "evidence") => {
      if (type === "main") {
        setMainDocument(null);
      } else if (type === "attachment") {
        setAttachments((prev) => prev.filter((f) => f.id !== id));
      } else if (type === "evidence") {
        setEvidence((prev) => prev.filter((f) => f.id !== id));
      }
    },
    []
  );

  const addTextToPDF = async (
    pdfBytes: ArrayBuffer,
    text: string,
    pageCount: number,
    fontBuffer: ArrayBuffer,
    textFontSize: number
  ) => {
    const pdfDoc = await PDFDocument.load(pdfBytes);

    let font;
    if (fontBuffer) {
      pdfDoc.registerFontkit(fontkit);
      font = await pdfDoc.embedFont(fontBuffer);
    } else {
      font = await pdfDoc.embedFont("Helvetica");
    }

    const pages = pdfDoc.getPages();

    if (pages.length > 0) {
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();

      firstPage.drawText(text, {
        x: width - 100,
        y: height - 50,
        size: textFontSize,
        font,
        color: rgb(0, 0, 0),
      });
    }

    pages.forEach((page, index) => {
      const { width } = page.getSize();
      page.drawText(`第 ${index + 1} 頁 共 ${pageCount} 頁`, {
        x: width - 120,
        y: 30,
        size: 10,
        font,
        color: rgb(0, 0, 0),
      });
    });

    return await pdfDoc.save();
  };

  const processAndMergePDFs = async () => {
    if (!mainDocument && attachments.length === 0 && evidence.length === 0) {
      toast({
        title: "錯誤",
        description: "請至少上傳一個檔案",
        variant: "destructive",
      });
      return;
    }

    if (!fontBytes) {
      toast({
        title: "請稍候",
        description: "字體載入中，請稍後再試",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const mergedPdf = await PDFDocument.create();

      if (mainDocument) {
        const mainBytes = await mainDocument.file.arrayBuffer();
        const mainPdf = await PDFDocument.load(mainBytes);
        const mainPages = await mergedPdf.copyPages(
          mainPdf,
          mainPdf.getPageIndices()
        );
        mainPages.forEach((page) => mergedPdf.addPage(page));

        if (addBlankForDoubleSided && mainPdf.getPageCount() % 2 !== 0) {
          mergedPdf.addPage();
        }
      }

      for (let i = 0; i < attachments.length; i++) {
        const attachment = attachments[i];
        const attachmentBytes = await attachment.file.arrayBuffer();
        const attachmentPdf = await PDFDocument.load(attachmentBytes);
        const pageCount = attachmentPdf.getPageCount();

        const processedBytes = await addTextToPDF(
          attachmentBytes,
          `${attachmentName}${attachmentStartNumber + i}`,
          pageCount,
          fontBytes,
          fontSize
        );

        const processedPdf = await PDFDocument.load(processedBytes);
        const pages = await mergedPdf.copyPages(
          processedPdf,
          processedPdf.getPageIndices()
        );
        pages.forEach((page) => mergedPdf.addPage(page));

        if (addBlankForDoubleSided && pageCount % 2 !== 0) {
          mergedPdf.addPage();
        }
      }

      for (let i = 0; i < evidence.length; i++) {
        const evidenceFile = evidence[i];
        const evidenceBytes = await evidenceFile.file.arrayBuffer();
        const evidencePdf = await PDFDocument.load(evidenceBytes);
        const pageCount = evidencePdf.getPageCount();

        const processedBytes = await addTextToPDF(
          evidenceBytes,
          `${evidenceName}${evidenceStartNumber + i}`,
          pageCount,
          fontBytes,
          fontSize
        );

        const processedPdf = await PDFDocument.load(processedBytes);
        const pages = await mergedPdf.copyPages(
          processedPdf,
          processedPdf.getPageIndices()
        );
        pages.forEach((page) => mergedPdf.addPage(page));

        if (addBlankForDoubleSided && pageCount % 2 !== 0) {
          mergedPdf.addPage();
        }
      }

      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);

      toast({
        title: "成功",
        description: "PDF 文件整合完成",
      });
    } catch (error) {
      console.error("處理PDF時發生錯誤:", error);
      toast({
        title: "錯誤",
        description: "處理PDF時發生錯誤，請檢查檔案格式",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-screen">
      <div className="w-96 flex-shrink-0 overflow-y-auto border-r p-4 space-y-4">
        <h1 className="text-2xl font-bold">PDF 文件整合</h1>
        <p className="text-muted-foreground text-sm">
          上傳、編輯並整合您的PDF文件
        </p>

        <Collapsible open={isSettingsExpanded} onOpenChange={setIsSettingsExpanded}>
          <Card className="p-4">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                <span className="flex items-center gap-2 font-semibold">
                  <Settings className="h-4 w-4" />
                  詳細設定
                </span>
                {isSettingsExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div>
                <Label className="text-sm font-medium">字體大小: {fontSize}px</Label>
                <Slider
                  value={[fontSize]}
                  onValueChange={(value) => setFontSize(value[0])}
                  min={10}
                  max={30}
                  step={1}
                  className="mt-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>10px</span>
                  <span>30px</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="doubleSided"
                  checked={addBlankForDoubleSided}
                  onCheckedChange={(checked) =>
                    setAddBlankForDoubleSided(checked === true)
                  }
                />
                <Label htmlFor="doubleSided" className="text-sm">
                  雙面列印補充空白頁
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                勾選後會為奇數頁的檔案自動加入空白頁，確保每個檔案的第一頁都在正面
              </p>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Card className="p-4 space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            書狀本文
          </h2>
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-4 text-center transition-colors",
              "hover:border-blue-400"
            )}
          >
            {mainDocument ? (
              <div className="flex items-center justify-between bg-muted p-2 rounded">
                <span className="text-sm font-medium truncate">
                  {mainDocument.name}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(mainDocument.id, "main")}
                  className="h-6 w-6 text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="cursor-pointer block">
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">點擊上傳主要文件</p>
                <p className="text-xs text-muted-foreground">支援 PDF 格式</p>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => handleFileUpload(e.target.files, "main")}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Plus className="h-4 w-4 text-green-600" />
            附件
          </h2>
          <div className="space-y-2">
            {attachments.map((attachment, index) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between bg-muted p-2 rounded"
              >
                <span className="text-sm font-medium truncate flex-1">
                  {attachmentName}
                  {attachmentStartNumber + index}: {attachment.name}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(attachment.id, "attachment")}
                  className="h-6 w-6 text-destructive flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <label className="cursor-pointer block border-2 border-dashed rounded-lg p-3 text-center hover:border-green-400 transition-colors">
              <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
              <p className="text-sm text-muted-foreground">添加附件</p>
              <input
                type="file"
                accept=".pdf"
                multiple
                onChange={(e) => handleFileUpload(e.target.files, "attachment")}
                className="hidden"
              />
            </label>
          </div>
          <div className="space-y-2 pt-2 border-t">
            <div>
              <Label className="text-sm">名稱</Label>
              <Input
                value={attachmentName}
                onChange={(e) => setAttachmentName(e.target.value)}
                placeholder="附件"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">起始編號</Label>
              <Input
                type="number"
                min={1}
                value={attachmentStartNumber}
                onChange={(e) =>
                  setAttachmentStartNumber(
                    Math.max(1, parseInt(e.target.value) || 1)
                  )
                }
                className="mt-1"
              />
            </div>
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Eye className="h-4 w-4 text-purple-600" />
            證物
          </h2>
          <div className="space-y-2">
            {evidence.map((evidenceFile, index) => (
              <div
                key={evidenceFile.id}
                className="flex items-center justify-between bg-muted p-2 rounded"
              >
                <span className="text-sm font-medium truncate flex-1">
                  {evidenceName}
                  {evidenceStartNumber + index}: {evidenceFile.name}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(evidenceFile.id, "evidence")}
                  className="h-6 w-6 text-destructive flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <label className="cursor-pointer block border-2 border-dashed rounded-lg p-3 text-center hover:border-purple-400 transition-colors">
              <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
              <p className="text-sm text-muted-foreground">添加證物</p>
              <input
                type="file"
                accept=".pdf"
                multiple
                onChange={(e) => handleFileUpload(e.target.files, "evidence")}
                className="hidden"
              />
            </label>
          </div>
          <div className="space-y-2 pt-2 border-t">
            <div>
              <Label className="text-sm">名稱</Label>
              <Input
                value={evidenceName}
                onChange={(e) => setEvidenceName(e.target.value)}
                placeholder="證物"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">起始編號</Label>
              <Input
                type="number"
                min={1}
                value={evidenceStartNumber}
                onChange={(e) =>
                  setEvidenceStartNumber(
                    Math.max(1, parseInt(e.target.value) || 1)
                  )
                }
                className="mt-1"
              />
            </div>
          </div>
        </Card>

        <Button
          onClick={processAndMergePDFs}
          disabled={
            isProcessing ||
            (!mainDocument && attachments.length === 0 && evidence.length === 0)
          }
          className="w-full"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              處理中...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              整合文件
            </>
          )}
        </Button>
      </div>

      <div className="flex-1 p-4 bg-muted/30">
        <h2 className="text-lg font-semibold mb-4">預覽</h2>
        {previewUrl ? (
          <div className="h-[calc(100vh-8rem)] border rounded-lg overflow-hidden bg-background">
            <iframe
              src={previewUrl}
              className="w-full h-full"
              title="PDF Preview"
            />
          </div>
        ) : (
          <div className="h-[calc(100vh-8rem)] flex flex-col items-center justify-center text-muted-foreground">
            <FileText className="h-16 w-16 mb-4" />
            <p>上傳檔案並點擊整合後，預覽將顯示在這裡</p>
          </div>
        )}
      </div>
    </div>
  );
}
