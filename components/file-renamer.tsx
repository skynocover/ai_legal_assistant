"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Upload, Plus, Trash2, Edit2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileItem {
  id: string
  file: File
  originalName: string
  editableName: string
}

interface NamingPattern {
  id: string
  pattern: string
  isEditing: boolean
}

export function FileRenamer() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [patterns, setPatterns] = useState<NamingPattern[]>([
    { id: "1", pattern: "文件_{日期}_{序號}", isEditing: false },
    { id: "2", pattern: "{原檔名}_已處理", isEditing: false },
  ])
  const [isDragging, setIsDragging] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files
    if (uploadedFiles) {
      addFiles(Array.from(uploadedFiles))
    }
  }

  const addFiles = (uploadedFiles: File[]) => {
    const newFiles: FileItem[] = uploadedFiles.map((file, index) => {
      const suggestedName = generateSuggestedName(file.name, files.length + index + 1)
      return {
        id: Math.random().toString(36).substr(2, 9),
        file,
        originalName: file.name,
        editableName: suggestedName,
      }
    })
    setFiles((prev) => [...prev, ...newFiles])
  }

  const generateSuggestedName = (originalName: string, index: number): string => {
    const date = new Date().toLocaleDateString("zh-TW").replace(/\//g, "")
    const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf(".")) || originalName
    const ext = originalName.substring(originalName.lastIndexOf("."))

    if (patterns.length > 0) {
      let suggestion = patterns[0].pattern
      suggestion = suggestion.replace("{日期}", date)
      suggestion = suggestion.replace("{序號}", String(index).padStart(3, "0"))
      suggestion = suggestion.replace("{原檔名}", nameWithoutExt)
      return suggestion + ext
    }

    return `${nameWithoutExt}_${date}${ext}`
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
    const uploadedFiles = Array.from(e.dataTransfer.files)
    addFiles(uploadedFiles)
  }

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== id))
  }

  const updateEditableName = (id: string, newName: string) => {
    setFiles((prev) => prev.map((file) => (file.id === id ? { ...file, editableName: newName } : file)))
  }

  const addPattern = () => {
    setPatterns((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        pattern: "新範例_{日期}",
        isEditing: true,
      },
    ])
  }

  const removePattern = (id: string) => {
    setPatterns((prev) => prev.filter((pattern) => pattern.id !== id))
  }

  const updatePattern = (id: string, newPattern: string) => {
    setPatterns((prev) => prev.map((pattern) => (pattern.id === id ? { ...pattern, pattern: newPattern } : pattern)))
  }

  const togglePatternEdit = (id: string) => {
    setPatterns((prev) =>
      prev.map((pattern) => (pattern.id === id ? { ...pattern, isEditing: !pattern.isEditing } : pattern)),
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="p-6 border-b border-border">
        <h1 className="text-2xl font-bold text-foreground mb-6">檔案重新命名</h1>

        <Card
          className={cn("border-2 border-dashed transition-colors mb-6", isDragging && "border-primary bg-primary/5")}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="p-6 text-center">
            <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-3">拖放檔案至此或點擊上傳</p>
            <label>
              <input type="file" multiple className="hidden" onChange={handleFileChange} />
              <Button variant="outline" asChild>
                <span>選擇檔案</span>
              </Button>
            </label>
          </div>
        </Card>

        {files.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-foreground mb-3">已選擇的檔案</h2>
            <div className="space-y-2">
              {files.map((fileItem) => (
                <Card key={fileItem.id} className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-2">原始檔名：{fileItem.originalName}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium whitespace-nowrap">新檔名：</span>
                        <Input
                          value={fileItem.editableName}
                          onChange={(e) => updateEditableName(fileItem.id, e.target.value)}
                          className="flex-1"
                          placeholder="輸入新檔名"
                        />
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeFile(fileItem.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">命名範例</h2>
            <Button onClick={addPattern} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              新增
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            {patterns.map((pattern) => (
              <Card key={pattern.id} className="p-2">
                <div className="flex items-center gap-2">
                  {pattern.isEditing ? (
                    <Input
                      value={pattern.pattern}
                      onChange={(e) => updatePattern(pattern.id, e.target.value)}
                      onBlur={() => togglePatternEdit(pattern.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") togglePatternEdit(pattern.id)
                      }}
                      className="flex-1 h-8 text-xs"
                      autoFocus
                    />
                  ) : (
                    <p className="flex-1 text-xs font-mono truncate">{pattern.pattern}</p>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => togglePatternEdit(pattern.id)}>
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removePattern(pattern.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            <p className="font-semibold mb-1">可用變數：</p>
            <div className="flex gap-4">
              <span>• {"{日期}"}</span>
              <span>• {"{序號}"}</span>
              <span>• {"{原檔名}"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
