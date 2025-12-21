現在需要在錄音檔轉逐字稿增加逐字稿編輯功能

使用以下的畫面

```ts
interface TranscriptEntry {
  time: string
  speaker: string
  content: string
  note?: string
}

const sampleData: TranscriptEntry[] = [
  {
    time: "00:00:15",
    speaker: "speaker1",
    content: "歡迎大家參加今天的會議，我們今天要討論新產品的開發計畫。",
  },
  {
    time: "00:00:28",
    speaker: "speaker2",
    content: "謝謝主持人，我認為我們應該先確認市場需求。",
  },
  {
    time: "00:00:45",
    speaker: "speaker1",
    content: "這個建議很好，我們可以先做一些市場調查。",
  },
  {
    time: "00:01:02",
    speaker: "speaker3",
    content: "我同意，另外我們也需要評估技術可行性。",
  },
  {
    time: "00:01:18",
    speaker: "speaker2",
    content: "關於預算方面，我們需要更詳細的規劃。",
  },
]

export default function TranscriptEditor() {
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>(sampleData)
  const [speakerNames, setSpeakerNames] = useState<Record<string, string>>({
    speaker1: "主持人",
    speaker2: "張經理",
    speaker3: "李工程師",
  })

  // Get unique speakers
  const uniqueSpeakers = Array.from(new Set(transcripts.map((t) => t.speaker)))

  const handleContentChange = (index: number, newContent: string) => {
    const updated = [...transcripts]
    updated[index].content = newContent
    setTranscripts(updated)
  }

  const handleNoteChange = (index: number, newNote: string) => {
    const updated = [...transcripts]
    updated[index].note = newNote
    setTranscripts(updated)
  }

  const handleSpeakerNameChange = (speakerId: string, newName: string) => {
    setSpeakerNames((prev) => ({
      ...prev,
      [speakerId]: newName,
    }))
  }

  const getSpeakerDisplayName = (speakerId: string) => {
    return speakerNames[speakerId] || speakerId
  }

  const handleExport = () => {
    let exportText = ""

    transcripts.forEach((entry) => {
      const speaker = getSpeakerDisplayName(entry.speaker)
      const note = entry.note || ""

      exportText += `${entry.time} ${speaker}\n`
      exportText += `${entry.content}\n`
      exportText += `${note}\n`
      exportText += `\n\n`
    })

    const blob = new Blob([exportText], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `逐字稿_${new Date().toISOString().slice(0, 10)}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">逐字稿編輯器</h1>
          <p className="mt-2 text-muted-foreground">編輯會議逐字稿和管理說話者名稱</p>
        </div>

        {/* Speaker Name Mapping Table */}
        <Card>
          <CardHeader>
            <CardTitle>說話者名稱設定</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/3">說話者 ID</TableHead>
                  <TableHead>自定義名稱</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uniqueSpeakers.map((speaker) => (
                  <TableRow key={speaker}>
                    <TableCell className="font-mono text-sm">{speaker}</TableCell>
                    <TableCell>
                      <Input
                        value={speakerNames[speaker] || ""}
                        onChange={(e) => handleSpeakerNameChange(speaker, e.target.value)}
                        placeholder="輸入自定義名稱"
                        className="max-w-md"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Transcript Content Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>逐字稿內容</CardTitle>
            <Button onClick={handleExport} variant="outline" size="sm" className="gap-2 bg-transparent">
              <Download className="h-4 w-4" />
              匯出
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">時間</TableHead>
                  <TableHead className="w-48">說話者</TableHead>
                  <TableHead>內容</TableHead>
                  <TableHead className="w-64">備註</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transcripts.map((entry, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Button variant="outline" size="sm" className="font-mono text-xs bg-transparent">
                        {entry.time}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">{getSpeakerDisplayName(entry.speaker)}</TableCell>
                    <TableCell>
                      <Textarea
                        value={entry.content}
                        onChange={(e) => handleContentChange(index, e.target.value)}
                        className="min-h-20 resize-none"
                        rows={3}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={entry.note || ""}
                        onChange={(e) => handleNoteChange(index, e.target.value)}
                        placeholder="新增備註..."
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

點擊時間就會讓音訊檔的播放時間跳轉到該時間
為了確認畫面 先使用現在給你的sample data




