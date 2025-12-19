"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Upload, FileAudio, Download, Mic } from "lucide-react"
import { cn } from "@/lib/utils"

interface AudioFile {
  id: string
  file: File
  name: string
}

export function TranscriptionEditor() {
  const [audioFile, setAudioFile] = useState<AudioFile | null>(null)
  const [transcription, setTranscription] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("transcription")
      return (
        saved ||
        "# 逐字稿標題\n\n這裡會顯示轉換後的逐字稿內容。\n\n## 段落一\n\n您可以在此編輯文字內容，支援 Markdown 格式。\n\n- 項目一\n- 項目二\n- 項目三\n\n## 段落二\n\n**粗體文字** 和 *斜體文字* 都可以使用。"
      )
    }
    return "# 逐字稿標題\n\n這裡會顯示轉換後的逐字稿內容。\n\n## 段落一\n\n您可以在此編輯文字內容，支援 Markdown 格式。\n\n- 項目一\n- 項目二\n- 項目三\n\n## 段落二\n\n**粗體文字** 和 *斜體文字* 都可以使用。"
  })
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("transcription", transcription)
    }
  }, [transcription])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith("audio/")) {
      setAudioFile({
        id: Math.random().toString(36).substr(2, 9),
        file,
        name: file.name,
      })
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith("audio/")) {
      setAudioFile({
        id: Math.random().toString(36).substr(2, 9),
        file,
        name: file.name,
      })
    }
  }

  const handleDownload = () => {
    const blob = new Blob([transcription], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `逐字稿_${new Date().toLocaleDateString("zh-TW")}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleRemoveFile = () => {
    setAudioFile(null)
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Upload Section */}
      <div className="p-6 border-b border-border">
        <h1 className="text-2xl font-bold mb-6 text-foreground">錄音檔轉逐字稿</h1>

        {!audioFile ? (
          <Card
            className={cn("border-2 border-dashed transition-colors", isDragging && "border-primary bg-primary/5")}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="p-8 text-center">
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">拖放錄音檔至此或點擊上傳</p>
              <label>
                <input type="file" accept="audio/*" className="hidden" onChange={handleFileChange} />
                <Button variant="outline" asChild>
                  <span>選擇錄音檔</span>
                </Button>
              </label>
            </div>
          </Card>
        ) : (
          <Card className="p-4">
            <div className="flex items-center gap-4">
              <FileAudio className="w-10 h-10 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{audioFile.name}</p>
                <p className="text-sm text-muted-foreground">{(audioFile.file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleRemoveFile}>
                  移除
                </Button>
                <Button disabled>
                  <Mic className="w-4 h-4 mr-2" />
                  開始轉換
                </Button>
              </div>
            </div>
          </Card>
        )}

        <p className="text-sm text-muted-foreground mt-3">註：AI 轉換功能尚未實作，目前僅提供編輯器介面預覽</p>
      </div>

      {/* Editor Section */}
      <div className="flex-1 overflow-hidden flex flex-col p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">逐字稿編輯器</h2>
          <Button onClick={handleDownload} variant="default">
            <Download className="w-4 h-4 mr-2" />
            下載
          </Button>
        </div>

        <Card className="flex-1 overflow-hidden">
          <Textarea
            value={transcription}
            onChange={(e) => setTranscription(e.target.value)}
            placeholder="轉換後的逐字稿將顯示在此處，您可以直接編輯..."
            className="h-full w-full resize-none border-0 p-6 font-mono text-sm focus-visible:ring-0"
          />
        </Card>

        <div className="mt-4 text-xs text-muted-foreground">
          <p>支援 Markdown 語法：</p>
          <p className="mt-1"># 標題、**粗體**、*斜體*、- 清單、[連結](url) 等</p>
          <p className="mt-2 text-primary">✓ 內容會自動儲存到本地</p>
        </div>
      </div>
    </div>
  )
}
