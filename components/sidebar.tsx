"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, MessageSquare, Mic, FileText, FolderOpen, Files } from "lucide-react"
import { cn } from "@/lib/utils"

type MenuItemKey = "pdf-merger" | "line-chat" | "transcription" | "rename" | "case-management"

interface SidebarProps {
  selectedItem: MenuItemKey
  onSelectItem: (item: MenuItemKey) => void
}

export function Sidebar({ selectedItem, onSelectItem }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const menuItems = [
    {
      key: "pdf-merger" as MenuItemKey,
      label: "PDF文件整合",
      icon: Files,
    },
    {
      key: "line-chat" as MenuItemKey,
      label: "Line聊天記錄排序",
      icon: MessageSquare,
    },
    {
      key: "transcription" as MenuItemKey,
      label: "錄音檔轉逐字稿",
      icon: Mic,
    },
    {
      key: "rename" as MenuItemKey,
      label: "檔案重新命名",
      icon: FileText,
    },
    {
      key: "case-management" as MenuItemKey,
      label: "案件管理",
      icon: FolderOpen,
    },
  ]

  return (
    <aside
      className={cn(
        "relative h-screen border-r border-border bg-card transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          {!isCollapsed && <h2 className="text-lg font-semibold">功能選單</h2>}
          <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(!isCollapsed)} className="ml-auto">
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        <nav className="flex-1 space-y-1 p-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <Button
                key={item.key}
                variant={selectedItem === item.key ? "secondary" : "ghost"}
                className={cn("w-full justify-start", isCollapsed ? "px-2" : "px-4")}
                onClick={() => onSelectItem(item.key)}
              >
                <Icon className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
                {!isCollapsed && <span>{item.label}</span>}
              </Button>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
