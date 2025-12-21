"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Upload,
  FileText,
  ArrowUp,
  ArrowDown,
  Trash2,
  ArrowUpDown,
  Calendar,
  GripVertical,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ImageFile {
  id: string;
  file: File;
  preview: string;
  customName: string;
  createdDate: Date | null;
}

export function ImageToPdfConverter() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSorting, setIsSorting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (images.length > 0) {
      generatePdf();
    } else {
      setPdfUrl(null);
    }
  }, [images]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      addImages(Array.from(files));
    }
  };

  const addImages = (files: File[]) => {
    const newImages: ImageFile[] = files
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        preview: URL.createObjectURL(file),
        customName: file.name,
        createdDate: file.lastModified ? new Date(file.lastModified) : null,
      }));
    setImages((prev) => [...prev, ...newImages]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    addImages(files);
  };

  const moveImage = (index: number, direction: "up" | "down") => {
    const newImages = [...images];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newImages.length) return;
    [newImages[index], newImages[targetIndex]] = [
      newImages[targetIndex],
      newImages[index],
    ];
    setImages(newImages);
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // 移除 data:image/xxx;base64, 前綴
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAutoSort = async (): Promise<void> => {
    if (images.length === 0) {
      toast({
        title: "無法排序",
        description: "請先上傳圖片",
        variant: "destructive",
      });
      return;
    }

    setIsSorting(true);

    try {
      // 準備圖片資料
      const imageDataList = await Promise.all(
        images.map(async (img) => ({
          name: img.customName,
          base64: await fileToBase64(img.file),
          mimeType: img.file.type || "image/jpeg",
        }))
      );

      const response = await fetch("/api/sort-images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ images: imageDataList }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "排序請求失敗");
      }

      const result = await response.json();
      const sortedNames = result.order?.imageName;

      if (!sortedNames || !Array.isArray(sortedNames)) {
        throw new Error("AI 回應格式錯誤");
      }

      // 根據 AI 回傳的順序重新排序圖片
      const sortedImages = sortedNames
        .map((name: string) => images.find((img) => img.customName === name))
        .filter((img): img is ImageFile => img !== undefined);

      // 如果有些圖片沒有被 AI 回傳，附加到最後
      const remainingImages = images.filter(
        (img) => !sortedNames.includes(img.customName)
      );

      setImages([...sortedImages, ...remainingImages]);

      toast({
        title: "排序完成",
        description: result.order?.reason || "圖片已根據 AI 分析重新排序",
      });
    } catch (error) {
      console.error("Auto sort error:", error);
      toast({
        title: "排序失敗",
        description: error instanceof Error ? error.message : "發生未知錯誤",
        variant: "destructive",
      });
    } finally {
      setIsSorting(false);
    }
  };

  const sortByDate = () => {
    const sortedImages = [...images].sort((a, b) => {
      if (!a.createdDate && !b.createdDate) return 0;
      if (!a.createdDate) return 1;
      if (!b.createdDate) return -1;
      return a.createdDate.getTime() - b.createdDate.getTime();
    });
    setImages(sortedImages);
  };

  const updateImageName = (id: string, newName: string) => {
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, customName: newName } : img))
    );
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newImages = [...images];
    const draggedItem = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedItem);

    setDraggedIndex(index);
    setImages(newImages);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const generatePdf = async () => {
    if (images.length === 0) return;

    // 使用 jsPDF 生成 PDF
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF();

    for (let i = 0; i < images.length; i++) {
      if (i > 0) {
        pdf.addPage();
      }

      const img = images[i];
      const imgData = await loadImage(img.preview);

      // 計算圖片在 PDF 中的尺寸
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgRatio = imgData.width / imgData.height;
      const pageRatio = pageWidth / pageHeight;

      let finalWidth = pageWidth;
      let finalHeight = pageHeight;

      if (imgRatio > pageRatio) {
        finalHeight = pageWidth / imgRatio;
      } else {
        finalWidth = pageHeight * imgRatio;
      }

      const x = (pageWidth - finalWidth) / 2;
      const y = (pageHeight - finalHeight) / 2;

      pdf.addImage(img.preview, "JPEG", x, y, finalWidth, finalHeight);

      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(img.customName, 10, 10);
    }

    const pdfBlob = pdf.output("blob");
    const url = URL.createObjectURL(pdfBlob);
    setPdfUrl(url);
  };

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const formatDate = (date: Date | null) => {
    if (!date) return null;
    return date.toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex h-screen">
      {/* Left Side - Upload and Image List */}
      <div className="w-1/2 border-r border-border flex flex-col">
        {/* Upload Section */}
        <div className="p-6 border-b border-border">
          <h1 className="text-2xl font-bold mb-6 text-foreground">
            Line聊天記錄排序
          </h1>

          <Card
            className={cn(
              "border-2 border-dashed transition-colors",
              isDragging && "border-primary bg-primary/5"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="p-8 text-center">
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                拖放圖片至此或點擊上傳
              </p>
              <label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button variant="outline" asChild>
                  <span>選擇圖片</span>
                </Button>
              </label>
            </div>
          </Card>

          <div className="flex gap-2 mt-4">
            <Button
              onClick={sortByDate}
              variant="outline"
              disabled={images.length === 0}
              className="flex-1 bg-transparent"
            >
              <Calendar className="w-4 h-4 mr-2" />
              日期排序
            </Button>
            <Button
              onClick={handleAutoSort}
              variant="outline"
              disabled={images.length === 0 || isSorting}
              className="flex-1 bg-transparent"
            >
              {isSorting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ArrowUpDown className="w-4 h-4 mr-2" />
              )}
              {isSorting ? "排序中..." : "自動排序"}
            </Button>
          </div>
        </div>

        {/* Image List */}
        <div className="flex-1 overflow-y-auto p-6">
          <h2 className="text-lg font-semibold mb-4 text-foreground">
            已上傳圖片 ({images.length})
          </h2>

          {images.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>尚未上傳任何圖片</p>
            </div>
          ) : (
            <div className="space-y-3">
              {images.map((image, index) => (
                <Card
                  key={image.id}
                  className={cn(
                    "p-3 cursor-move transition-opacity",
                    draggedIndex === index && "opacity-50"
                  )}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnter={(e) => handleDragEnter(e, index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-5 h-5 text-muted-foreground shrink-0" />
                    <img
                      src={image.preview || "/placeholder.svg"}
                      alt={`Preview ${index + 1}`}
                      className="w-16 h-16 object-cover rounded shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      {editingId === image.id ? (
                        <Input
                          value={image.customName}
                          onChange={(e) =>
                            updateImageName(image.id, e.target.value)
                          }
                          onBlur={() => setEditingId(null)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") setEditingId(null);
                          }}
                          className="h-7 text-sm"
                          autoFocus
                        />
                      ) : (
                        <p
                          className="text-sm font-medium truncate cursor-pointer hover:text-primary"
                          onClick={() => setEditingId(image.id)}
                        >
                          {image.customName}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{(image.file.size / 1024).toFixed(1)} KB</span>
                        {image.createdDate && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(image.createdDate)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveImage(index, "up")}
                        disabled={index === 0}
                      >
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveImage(index, "down")}
                        disabled={index === images.length - 1}
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeImage(image.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Side - PDF Preview */}
      <div className="w-1/2 bg-muted/30 flex flex-col">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">PDF 預覽</h2>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {pdfUrl ? (
            <div className="h-full">
              <iframe
                src={pdfUrl}
                className="w-full h-full border border-border rounded-lg bg-white"
                title="PDF Preview"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>PDF 將在此顯示</p>
                <p className="text-sm mt-2">上傳圖片後將自動生成 PDF</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
