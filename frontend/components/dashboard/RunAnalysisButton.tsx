"use client";

import { useState } from "react";
import { analysisAPI } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";

export function RunAnalysisButton() {
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleRun() {
    setRunning(true);
    setMsg(null);
    try {
      await analysisAPI.run();
      setMsg("分析完成");
      setTimeout(() => setMsg(null), 3000);
      window.location.reload();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "分析失败");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {msg && <span className="text-xs text-slate-500">{msg}</span>}
      <button
        onClick={handleRun}
        disabled={running}
        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-sm font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {running && <Spinner size="sm" className="text-white" />}
        {running ? "分析中…" : "运行分析"}
      </button>
    </div>
  );
}
