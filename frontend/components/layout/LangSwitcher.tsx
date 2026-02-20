"use client";

interface LangSwitcherProps {
  lang: "zh" | "th";
  onLangChange: (lang: "zh" | "th") => void;
}

export function LangSwitcher({ lang, onLangChange }: LangSwitcherProps) {
  return (
    <div className="flex rounded-md border border-gray-200 overflow-hidden">
      <button
        onClick={() => onLangChange("zh")}
        className={`px-3 py-1 text-xs font-medium transition-colors ${
          lang === "zh"
            ? "bg-blue-600 text-white"
            : "bg-white text-gray-600 hover:bg-gray-50"
        }`}
      >
        ZH
      </button>
      <button
        onClick={() => onLangChange("th")}
        className={`px-3 py-1 text-xs font-medium transition-colors ${
          lang === "th"
            ? "bg-blue-600 text-white"
            : "bg-white text-gray-600 hover:bg-gray-50"
        }`}
      >
        TH
      </button>
    </div>
  );
}
