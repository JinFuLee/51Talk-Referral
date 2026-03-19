"use client";

import { useRef, useState } from "react";
import { datasourcesAPI } from "@/lib/api";

interface FileUploadPanelProps {
  onSuccess?: () => void;
}

export function FileUploadPanel({ onSuccess }: FileUploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [sourceId, setSourceId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleUpload() {
    const file = inputRef.current?.files?.[0];
    if (!file || !sourceId.trim()) {
      setMsg("请填写数据源 ID 并选择文件");
      return;
    }
    setUploading(true);
    setMsg(null);
    try {
      await datasourcesAPI.upload(sourceId.trim(), file);
      setMsg("上传成功");
      onSuccess?.();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "上传失败");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-[var(--bg-surface)] p-4 space-y-3 max-w-lg">
      <div className="flex gap-2">
        <input
          value={sourceId}
          onChange={(e) => setSourceId(e.target.value)}
          placeholder="数据源 ID（如 orders）"
          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input ref={inputRef} type="file" accept=".xlsx,.csv" className="hidden" aria-label="选择上传文件" />
        <button
          onClick={() => inputRef.current?.click()}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          选择文件
        </button>
      </div>
      <button
        onClick={handleUpload}
        disabled={uploading}
        className="w-full py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {uploading ? "上传中…" : "上传"}
      </button>
      {msg && (
        <p className={`text-xs ${msg.includes("成功") ? "text-success" : "text-destructive"}`}>
          {msg}
        </p>
      )}
    </div>
  );
}
