"use client";

import { useEffect } from "react";
import { useConfigStore } from "@/lib/stores/config-store";

const LANG_MAP: Record<string, string> = {
  zh: "zh-CN",
  th: "th-TH",
};

/**
 * 监听 configStore.language 变化，动态更新 document.documentElement.lang。
 * 因 layout.tsx 是 RSC，无法直接使用 hooks，故抽为独立 client component 挂载。
 */
export function HtmlLangUpdater() {
  const language = useConfigStore((s) => s.language);

  useEffect(() => {
    document.documentElement.lang = LANG_MAP[language] ?? "zh-CN";
  }, [language]);

  return null;
}
