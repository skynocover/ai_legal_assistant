"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { ImageToPdfConverter } from "@/components/image-to-pdf-converter"
import { TranscriptionEditor } from "@/components/transcription-editor"
import { FileRenamer } from "@/components/file-renamer"
import { CaseManagement } from "@/components/case-management"

type MenuItemKey = "line-chat" | "transcription" | "rename" | "case-management"

export default function Home() {
  const [selectedItem, setSelectedItem] = useState<MenuItemKey>("line-chat")

  const renderContent = () => {
    switch (selectedItem) {
      case "line-chat":
        return <ImageToPdfConverter />
      case "transcription":
        return <TranscriptionEditor />
      case "rename":
        return <FileRenamer />
      case "case-management":
        return <CaseManagement />
      default:
        return null
    }
  }

  return (
    <main className="flex min-h-screen">
      <Sidebar selectedItem={selectedItem} onSelectItem={setSelectedItem} />
      <div className="flex-1">{renderContent()}</div>
    </main>
  )
}
