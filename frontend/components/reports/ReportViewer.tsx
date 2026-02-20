"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ReportViewerProps {
  content: string;
  filename: string;
  downloadURL: string;
}

export function ReportViewer({ content, filename, downloadURL }: ReportViewerProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
        <span className="text-sm font-medium text-slate-700 truncate">{filename}</span>
        <a
          href={downloadURL}
          download={filename}
          className="ml-3 shrink-0 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
        >
          下载
        </a>
      </div>
      <div className="p-6 prose prose-slate prose-sm max-w-none overflow-auto">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </div>
  );
}
