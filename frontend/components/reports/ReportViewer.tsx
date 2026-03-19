"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { Options } from "react-markdown";

// Dynamically import the entire rendering chunk — react-markdown + remark-gfm
// are heavy (remark AST, unified pipeline). Deferring them keeps the initial
// JS bundle lean; the component is only ever used client-side anyway.
const MarkdownRenderer = dynamic<Options>(
  () =>
    Promise.all([
      import("react-markdown").then((m) => m.default),
      import("remark-gfm").then((m) => m.default),
    ]).then(([ReactMarkdown, remarkGfm]) => {
      const Renderer: ComponentType<Options> = (props) => (
        <ReactMarkdown {...props} remarkPlugins={[remarkGfm, ...(props.remarkPlugins ?? [])]} />
      );
      return Renderer;
    }),
  { ssr: false, loading: () => <div className="animate-pulse text-slate-400 text-sm">加载中…</div> }
);

interface ReportViewerProps {
  content: string;
  filename: string;
  downloadURL: string;
}

export function ReportViewer({ content, filename, downloadURL }: ReportViewerProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-[var(--bg-surface)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
        <span className="text-sm font-medium text-slate-700 truncate">{filename}</span>
        <a
          href={downloadURL}
          download={filename}
          className="ml-3 shrink-0 px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded-lg hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          下载
        </a>
      </div>
      <div className="p-6 prose prose-slate prose-sm max-w-none overflow-auto">
        <MarkdownRenderer>{content}</MarkdownRenderer>
      </div>
    </div>
  );
}
