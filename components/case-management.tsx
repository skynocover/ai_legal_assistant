"use client"

import type React from "react"

import { useState, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Plus, Upload, Trash2, Edit2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

interface CaseData {
  id: string
  name: string
  clientId: string
  caseId: string
  caseType: string
  court: string
  division: string
  assignedLawyer: string
}

type SortField = keyof CaseData
type SortDirection = "asc" | "desc" | null

export function CaseManagement() {
  const [cases, setCases] = useState<CaseData[]>([
    {
      id: "1",
      name: "王小明",
      clientId: "C001",
      caseId: "A2024001",
      caseType: "民事訴訟",
      court: "台北地方法院",
      division: "民事庭",
      assignedLawyer: "張律師",
    },
    {
      id: "2",
      name: "李大華",
      clientId: "C002",
      caseId: "A2024002",
      caseType: "刑事訴訟",
      court: "新北地方法院",
      division: "刑事庭",
      assignedLawyer: "陳律師",
    },
    {
      id: "3",
      name: "陳美玲",
      clientId: "C003",
      caseId: "A2024003",
      caseType: "行政訴訟",
      court: "台北高等行政法院",
      division: "行政庭",
      assignedLawyer: "林律師",
    },
    {
      id: "4",
      name: "林志明",
      clientId: "C004",
      caseId: "A2024004",
      caseType: "民事訴訟",
      court: "桃園地方法院",
      division: "民事庭",
      assignedLawyer: "張律師",
    },
    {
      id: "5",
      name: "黃淑芬",
      clientId: "C005",
      caseId: "A2024005",
      caseType: "家事訴訟",
      court: "台中地方法院",
      division: "家事庭",
      assignedLawyer: "王律師",
    },
  ])

  const [searchTerms, setSearchTerms] = useState({
    name: "",
    clientId: "",
    caseId: "",
    caseType: "",
    court: "",
    division: "",
    assignedLawyer: "",
  })

  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCase, setEditingCase] = useState<CaseData | null>(null)
  const [formData, setFormData] = useState<Omit<CaseData, "id">>({
    name: "",
    clientId: "",
    caseId: "",
    caseType: "",
    court: "",
    division: "",
    assignedLawyer: "",
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc")
      } else if (sortDirection === "desc") {
        setSortDirection(null)
        setSortField(null)
      } else {
        setSortDirection("asc")
      }
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const handleAddCase = () => {
    setEditingCase(null)
    setFormData({
      name: "",
      clientId: "",
      caseId: "",
      caseType: "",
      court: "",
      division: "",
      assignedLawyer: "",
    })
    setIsDialogOpen(true)
  }

  const handleEditCase = (caseItem: CaseData) => {
    setEditingCase(caseItem)
    setFormData({
      name: caseItem.name,
      clientId: caseItem.clientId,
      caseId: caseItem.caseId,
      caseType: caseItem.caseType,
      court: caseItem.court,
      division: caseItem.division,
      assignedLawyer: caseItem.assignedLawyer,
    })
    setIsDialogOpen(true)
  }

  const handleDeleteCase = (id: string) => {
    setCases((prev) => prev.filter((c) => c.id !== id))
  }

  const handleSaveCase = () => {
    if (editingCase) {
      setCases((prev) => prev.map((c) => (c.id === editingCase.id ? { ...formData, id: c.id } : c)))
    } else {
      const newCase: CaseData = {
        ...formData,
        id: Math.random().toString(36).substr(2, 9),
      }
      setCases((prev) => [...prev, newCase])
    }
    setIsDialogOpen(false)
  }

  const handleImportExcel = () => {
    fileInputRef.current?.click()
  }

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      console.log("[v0] Importing Excel file:", file.name)
    }
  }

  const filteredAndSortedCases = useMemo(() => {
    const filtered = cases.filter((caseItem) => {
      return (
        caseItem.name.toLowerCase().includes(searchTerms.name.toLowerCase()) &&
        caseItem.clientId.toLowerCase().includes(searchTerms.clientId.toLowerCase()) &&
        caseItem.caseId.toLowerCase().includes(searchTerms.caseId.toLowerCase()) &&
        caseItem.caseType.toLowerCase().includes(searchTerms.caseType.toLowerCase()) &&
        caseItem.court.toLowerCase().includes(searchTerms.court.toLowerCase()) &&
        caseItem.division.toLowerCase().includes(searchTerms.division.toLowerCase()) &&
        caseItem.assignedLawyer.toLowerCase().includes(searchTerms.assignedLawyer.toLowerCase())
      )
    })

    if (sortField && sortDirection) {
      filtered.sort((a, b) => {
        const aValue = a[sortField]
        const bValue = b[sortField]

        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [cases, searchTerms, sortField, sortDirection])

  const updateSearchTerm = (field: keyof typeof searchTerms, value: string) => {
    setSearchTerms((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />
    }
    if (sortDirection === "asc") {
      return <ArrowUp className="w-4 h-4 ml-1" />
    }
    if (sortDirection === "desc") {
      return <ArrowDown className="w-4 h-4 ml-1" />
    }
    return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />
  }

  const columns: { field: SortField; label: string; searchKey: keyof typeof searchTerms }[] = [
    { field: "name", label: "姓名", searchKey: "name" },
    { field: "clientId", label: "客戶編號", searchKey: "clientId" },
    { field: "caseId", label: "案件編號", searchKey: "caseId" },
    { field: "caseType", label: "案由", searchKey: "caseType" },
    { field: "court", label: "法院", searchKey: "court" },
    { field: "division", label: "股別", searchKey: "division" },
    { field: "assignedLawyer", label: "指派律師", searchKey: "assignedLawyer" },
  ]

  return (
    <div className="h-screen flex flex-col">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">案件管理</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleImportExcel}>
              <Upload className="w-4 h-4 mr-2" />
              匯入 Excel
            </Button>
            <Button onClick={handleAddCase}>
              <Plus className="w-4 h-4 mr-2" />
              新增案件
            </Button>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileImport} />
      </div>

      <div className="flex-1 overflow-auto p-6">
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column.field}>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort(column.field)}
                      className="flex items-center hover:bg-transparent p-0 h-auto font-semibold"
                    >
                      {column.label}
                      {renderSortIcon(column.field)}
                    </Button>
                  </TableHead>
                ))}
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
              <TableRow className="hover:bg-transparent">
                {columns.map((column) => (
                  <TableHead key={`search-${column.field}`} className="py-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                      <Input
                        placeholder="搜尋..."
                        value={searchTerms[column.searchKey]}
                        onChange={(e) => updateSearchTerm(column.searchKey, e.target.value)}
                        className="h-8 pl-7 text-xs"
                      />
                    </div>
                  </TableHead>
                ))}
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedCases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    沒有符合條件的案件
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedCases.map((caseItem) => (
                  <TableRow key={caseItem.id}>
                    <TableCell className="font-medium">{caseItem.name}</TableCell>
                    <TableCell>{caseItem.clientId}</TableCell>
                    <TableCell>{caseItem.caseId}</TableCell>
                    <TableCell>{caseItem.caseType}</TableCell>
                    <TableCell>{caseItem.court}</TableCell>
                    <TableCell>{caseItem.division}</TableCell>
                    <TableCell>{caseItem.assignedLawyer}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEditCase(caseItem)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteCase(caseItem.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        <div className="mt-4 text-sm text-muted-foreground">
          顯示 {filteredAndSortedCases.length} / {cases.length} 筆案件
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingCase ? "編輯案件" : "新增案件"}</DialogTitle>
            <DialogDescription>請填寫案件相關資訊</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">姓名</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientId">客戶編號</Label>
              <Input
                id="clientId"
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="caseId">案件編號</Label>
              <Input
                id="caseId"
                value={formData.caseId}
                onChange={(e) => setFormData({ ...formData, caseId: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="caseType">案由</Label>
              <Input
                id="caseType"
                value={formData.caseType}
                onChange={(e) => setFormData({ ...formData, caseType: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="court">法院</Label>
              <Input
                id="court"
                value={formData.court}
                onChange={(e) => setFormData({ ...formData, court: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="division">股別</Label>
              <Input
                id="division"
                value={formData.division}
                onChange={(e) => setFormData({ ...formData, division: e.target.value })}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="assignedLawyer">指派律師</Label>
              <Input
                id="assignedLawyer"
                value={formData.assignedLawyer}
                onChange={(e) => setFormData({ ...formData, assignedLawyer: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveCase}>儲存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
