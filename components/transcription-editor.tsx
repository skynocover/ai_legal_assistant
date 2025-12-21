"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Upload, FileAudio, Download, Mic, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AudioFile {
  id: string;
  file: File;
  name: string;
  url: string;
}

interface TranscriptEntry {
  time: string;
  speaker: string;
  content: string;
  note?: string;
}

const sampleData: TranscriptEntry[] = [
  { time: "00:00:15", speaker: "speaker1", content: "歡迎大家參加今天的會議，我們今天要討論新產品的開發計畫。" },
  { time: "00:00:28", speaker: "speaker2", content: "謝謝主持人，我認為我們應該先確認市場需求。" },
  { time: "00:00:45", speaker: "speaker1", content: "這個建議很好，我們可以先做一些市場調查。" },
  { time: "00:01:02", speaker: "speaker3", content: "我同意，另外我們也需要評估技術可行性。" },
  { time: "00:01:18", speaker: "speaker2", content: "關於預算方面，我們需要更詳細的規劃。" },
];

export function TranscriptionEditor() {
  const [audioFile, setAudioFile] = useState<AudioFile | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>(sampleData);
  const [speakerNames, setSpeakerNames] = useState<Record<string, string>>({
    speaker1: "主持人",
    speaker2: "張經理",
    speaker3: "李工程師",
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  const uniqueSpeakers = Array.from(new Set(transcripts.map((t) => t.speaker)));

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("transcripts", JSON.stringify(transcripts));
      localStorage.setItem("speakerNames", JSON.stringify(speakerNames));
    }
  }, [transcripts, speakerNames]);

  const setAudioFromFile = (file: File) => {
    if (audioFile?.url) URL.revokeObjectURL(audioFile.url);
    setAudioFile({ id: Math.random().toString(36).substr(2, 9), file, name: file.name, url: URL.createObjectURL(file) });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file?.type.startsWith("audio/")) setAudioFromFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("audio/")) setAudioFromFile(file);
  };

  const handleRemoveFile = () => {
    if (audioFile?.url) URL.revokeObjectURL(audioFile.url);
    setAudioFile(null);
  };

  const parseTimeToSeconds = (time: string): number => {
    const parts = time.split(":").map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return 0;
  };

  const handleTimeClick = (time: string) => {
    if (audioRef.current) {
      audioRef.current.currentTime = parseTimeToSeconds(time);
      audioRef.current.play();
    }
  };

  const handleContentChange = (index: number, newContent: string) => {
    const updated = [...transcripts];
    updated[index].content = newContent;
    setTranscripts(updated);
  };

  const handleNoteChange = (index: number, newNote: string) => {
    const updated = [...transcripts];
    updated[index].note = newNote;
    setTranscripts(updated);
  };

  const handleSpeakerNameChange = (speakerId: string, newName: string) => {
    setSpeakerNames((prev) => ({ ...prev, [speakerId]: newName }));
  };

  const getSpeakerDisplayName = (speakerId: string) => {
    return speakerNames[speakerId] || speakerId;
  };

  const handleExport = () => {
    const exportText = transcripts.map((entry) => {
      const speaker = getSpeakerDisplayName(entry.speaker);
      return `${entry.time} ${speaker}\n${entry.content}${entry.note ? `\n備註：${entry.note}` : ""}\n`;
    }).join("\n");
    const blob = new Blob([exportText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `逐字稿_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleTranscribe = async (): Promise<void> => {
    if (!audioFile) {
      toast({ title: "無法轉錄", description: "請先上傳錄音檔", variant: "destructive" });
      return;
    }
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("audio", audioFile.file);
      const response = await fetch("/api/transcribe", { method: "POST", body: formData });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "轉錄請求失敗");
      }
      const result = await response.json();
      if (!result.transcript || !Array.isArray(result.transcript)) {
        throw new Error("AI 回應格式錯誤");
      }
      setTranscripts(result.transcript);
      setSpeakerNames({});
      toast({ title: "轉錄完成", description: `成功轉錄 ${result.transcript.length} 個段落` });
    } catch (error) {
      toast({
        title: "轉錄失敗",
        description: error instanceof Error ? error.message : "發生未知錯誤",
        variant: "destructive",
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="p-6 border-b border-border shrink-0">
        <h1 className="text-2xl font-bold mb-4 text-foreground">錄音檔轉逐字稿</h1>
        {!audioFile ? (
          <Card
            className={cn("border-2 border-dashed", isDragging && "border-primary bg-primary/5")}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <div className="p-6 text-center">
              <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-3">拖放錄音檔至此或點擊上傳</p>
              <label>
                <input type="file" accept="audio/*" className="hidden" onChange={handleFileChange} />
                <Button variant="outline" asChild><span>選擇錄音檔</span></Button>
              </label>
            </div>
          </Card>
        ) : (
          <Card className="p-4">
            <div className="flex items-center gap-4 mb-3">
              <FileAudio className="w-8 h-8 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-sm">{audioFile.name}</p>
                <p className="text-xs text-muted-foreground">{(audioFile.file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleRemoveFile} disabled={isTranscribing}>移除</Button>
              <Button size="sm" onClick={handleTranscribe} disabled={isTranscribing}>
                {isTranscribing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Mic className="w-4 h-4 mr-1" />}
                {isTranscribing ? "轉換中..." : "開始轉換"}
              </Button>
            </div>
            <audio ref={audioRef} src={audioFile.url} controls className="w-full" />
          </Card>
        )}
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <Card>
          <CardHeader><CardTitle>說話者名稱設定</CardTitle></CardHeader>
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>逐字稿內容</CardTitle>
            <Button onClick={handleExport} variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />匯出
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">時間</TableHead>
                  <TableHead className="w-32">說話者</TableHead>
                  <TableHead>內容</TableHead>
                  <TableHead className="w-48">備註</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transcripts.map((entry, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        className="font-mono text-xs"
                        onClick={() => handleTimeClick(entry.time)}
                        disabled={!audioFile}
                      >
                        {entry.time}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">{getSpeakerDisplayName(entry.speaker)}</TableCell>
                    <TableCell>
                      <Textarea
                        value={entry.content}
                        onChange={(e) => handleContentChange(index, e.target.value)}
                        className="min-h-16 resize-none"
                        rows={2}
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
  );
}
