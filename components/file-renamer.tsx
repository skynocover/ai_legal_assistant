"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Upload,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  Loader2,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { processFile, fileToBase64 } from "@/lib/file-utils";
import axios from "axios";

interface FileItem {
  id: string;
  file: File;
  originalName: string;
  editableName: string;
  isProcessing: boolean;
  aiReason?: string;
}

interface NamingPattern {
  id: string;
  pattern: string;
  isEditing: boolean;
}

const DEFAULT_PATTERNS: NamingPattern[] = [
  { id: "1", pattern: "羅斯福路112年8-10月水電瓦斯費", isEditing: false },
  { id: "2", pattern: "建物謄本A棟B戶", isEditing: false },
  {
    id: "3",
    pattern: "道呈案件開案表-Mark專用",
    isEditing: false,
  },
];

const AVAILABLE_VARIABLES = [
  { name: "{日期}", desc: "民國日期 (如: 114年1月15日)" },
  { name: "{西元日期}", desc: "西元日期 (如: 2025-01-15)" },
  { name: "{原檔名}", desc: "原始檔案名稱" },
  { name: "{序號}", desc: "檔案序號 (001, 002...)" },
  { name: "{副檔名}", desc: "原始副檔名" },
];

export function FileRenamer() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [patterns, setPatterns] = useState<NamingPattern[]>(DEFAULT_PATTERNS);
  const [isDragging, setIsDragging] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (uploadedFiles) {
      await addFiles(Array.from(uploadedFiles));
    }
    // 重置 input value，讓相同檔案可以再次選擇
    e.target.value = "";
  };

  const addFiles = async (uploadedFiles: File[]) => {
    const newFiles: FileItem[] = [];

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      const processedFile = await processFile(file);
      const suggestedName = generateSuggestedName(processedFile.name);

      newFiles.push({
        id: Math.random().toString(36).substr(2, 9),
        file: processedFile,
        originalName: file.name,
        editableName: suggestedName,
        isProcessing: false,
      });
    }

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const generateSuggestedName = (originalName: string): string => {
    // 上傳時直接使用原始檔名
    return originalName;
  };

  const handleAiSuggest = async () => {
    if (files.length === 0) return;

    setIsAiProcessing(true);
    setFiles((prev) => prev.map((f) => ({ ...f, isProcessing: true })));

    const namingExamples = patterns.map((p) => p.pattern);

    // 對每個檔案分別呼叫 API，誰先回應就先更新
    const promises = files.map(async (fileItem) => {
      try {
        const base64 = await fileToBase64(fileItem.file);
        const response = await axios.post("/api/suggest-filename", {
          file: {
            name: fileItem.originalName,
            base64,
            mimeType: fileItem.file.type,
          },
          namingExamples,
        });

        const { suggestedName, reason } = response.data;
        if (suggestedName) {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileItem.id
                ? {
                    ...f,
                    editableName: suggestedName,
                    aiReason: reason,
                    isProcessing: false,
                  }
                : f
            )
          );
        } else {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileItem.id ? { ...f, isProcessing: false } : f
            )
          );
        }
      } catch (error) {
        console.error(`AI 命名失敗 (${fileItem.originalName}):`, error);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileItem.id ? { ...f, isProcessing: false } : f
          )
        );
      }
    });

    await Promise.allSettled(promises);
    setIsAiProcessing(false);
  };

  const handleDownload = (fileItem: FileItem) => {
    const url = URL.createObjectURL(fileItem.file);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileItem.editableName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = () => {
    files.forEach((f) => handleDownload(f));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    await addFiles(Array.from(e.dataTransfer.files));
  };

  const removeFile = (id: string) =>
    setFiles((prev) => prev.filter((f) => f.id !== id));
  const updateEditableName = (id: string, newName: string) =>
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, editableName: newName } : f))
    );

  const addPattern = () =>
    setPatterns((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        pattern: "新範例_{日期}",
        isEditing: true,
      },
    ]);
  const removePattern = (id: string) =>
    setPatterns((prev) => prev.filter((p) => p.id !== id));
  const updatePattern = (id: string, newPattern: string) =>
    setPatterns((prev) =>
      prev.map((p) => (p.id === id ? { ...p, pattern: newPattern } : p))
    );
  const togglePatternEdit = (id: string) =>
    setPatterns((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isEditing: !p.isEditing } : p))
    );

  return (
    <div className="h-screen flex flex-col bg-background overflow-auto">
      <div className="p-6 border-b border-border">
        <h1 className="text-2xl font-bold text-foreground mb-6">
          檔案重新命名
        </h1>

        <Card
          className={cn(
            "border-2 border-dashed transition-colors mb-6",
            isDragging && "border-primary bg-primary/5"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="p-6 text-center">
            <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-1">
              拖放檔案至此或點擊上傳
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              圖片會自動轉換為 WebP 格式（JPEG/GIF 除外）
            </p>
            <label>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
                accept="image/*,.pdf"
              />
              <Button variant="outline" asChild>
                <span>選擇檔案</span>
              </Button>
            </label>
          </div>
        </Card>

        {files.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">
                已選擇的檔案 ({files.length})
              </h2>
              <div className="flex gap-2">
                <Button
                  onClick={handleAiSuggest}
                  size="sm"
                  disabled={isAiProcessing}
                >
                  {isAiProcessing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  AI 自動命名
                </Button>
                <Button onClick={handleDownloadAll} size="sm" variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  下載全部
                </Button>
              </div>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-auto">
              {files.map((fileItem) => (
                <Card key={fileItem.id} className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-2">
                        原始檔名：{fileItem.originalName}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium whitespace-nowrap">
                          新檔名：
                        </span>
                        <Input
                          value={fileItem.editableName}
                          onChange={(e) =>
                            updateEditableName(fileItem.id, e.target.value)
                          }
                          className="flex-1"
                          placeholder="輸入新檔名"
                        />
                      </div>
                      {fileItem.aiReason && (
                        <p className="text-xs text-muted-foreground mt-1">
                          AI: {fileItem.aiReason}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(fileItem)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(fileItem.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">命名範例</h2>
            <Button onClick={addPattern} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              新增
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
            {patterns.map((pattern) => (
              <Card key={pattern.id} className="p-2">
                <div className="flex items-center gap-2">
                  {pattern.isEditing ? (
                    <Input
                      value={pattern.pattern}
                      onChange={(e) =>
                        updatePattern(pattern.id, e.target.value)
                      }
                      onBlur={() => togglePatternEdit(pattern.id)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && togglePatternEdit(pattern.id)
                      }
                      className="flex-1 h-8 text-xs"
                      autoFocus
                    />
                  ) : (
                    <p className="flex-1 text-xs font-mono truncate">
                      {pattern.pattern}
                    </p>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => togglePatternEdit(pattern.id)}
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => removePattern(pattern.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded">
          <p className="font-semibold mb-2">可用變數：</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {AVAILABLE_VARIABLES.map((v) => (
              <div key={v.name} className="flex flex-col">
                <span className="font-mono text-foreground">{v.name}</span>
                <span className="text-muted-foreground">{v.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
