"use client";

import { PresentationLauncher } from "@/components/presentation/PresentationLauncher";

export default function PresentPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">汇报模式</h1>
          <p className="text-[var(--text-secondary)] mt-2">选择汇报场景与时间维度，进入全屏汇报</p>
        </div>
        <PresentationLauncher />
      </div>
    </div>
  );
}
