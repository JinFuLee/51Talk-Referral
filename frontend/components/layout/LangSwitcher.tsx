"use client";

interface LangSwitcherProps {
  lang: "zh" | "th";
  onLangChange: (lang: "zh" | "th") => void;
}

export function LangSwitcher({ lang, onLangChange }: LangSwitcherProps) {
  return (
    <div className="flex rounded-md border border-gray-200 overflow-hidden" role="group" aria-label="语言切换">
      <button
        onClick={() => onLangChange("zh")}
        aria-pressed={lang === "zh"}
        className={`px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
          lang === "zh"
            ? "bg-primary text-primary-foreground"
            : "bg-white text-gray-600 hover:bg-gray-50"
        }`}
      >
        ZH
      </button>
      <button
        onClick={() => onLangChange("th")}
        aria-pressed={lang === "th"}
        className={`px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
          lang === "th"
            ? "bg-primary text-primary-foreground"
            : "bg-white text-gray-600 hover:bg-gray-50"
        }`}
      >
        TH
      </button>
    </div>
  );
}
