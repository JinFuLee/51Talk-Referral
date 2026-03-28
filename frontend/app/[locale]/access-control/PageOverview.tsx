'use client';

import { BarChart3, TrendingUp, Users, Shield, FileText, Settings, Globe } from 'lucide-react';
import { useLocale } from 'next-intl';

// ── I18N ─────────────────────────────────────────────────────────────────────

const I18N = {
  zh: {
    publicToggle: '公开',
    private: '私有',
    publicBadge: '公开',
    noPages: '暂无页面',
    visitors: '人可访问',
  },
  en: {
    publicToggle: 'Public',
    private: 'Private',
    publicBadge: 'Public',
    noPages: 'No pages',
    visitors: ' can access',
  },
} as const;

// ── 类型定义 ──────────────────────────────────────────────────────────────────

interface PageEntry {
  path: string;
  name_zh: string;
  name_en: string;
  description_zh?: string;
  description_en?: string;
  category: string;
  is_public: boolean;
  visitor_count?: number;
}

interface PageOverviewProps {
  pages: PageEntry[];
  onTogglePublic: (path: string, isPublic: boolean) => Promise<void>;
}

// ── 分类配置 ──────────────────────────────────────────────────────────────────

const CATEGORIES: Record<string, { zh: string; th: string; icon: React.ReactNode }> = {
  ops_core: {
    zh: '运营核心',
    th: 'ปฏิบัติการหลัก',
    icon: <BarChart3 className="w-4 h-4" />,
  },
  performance: {
    zh: '业绩管理',
    th: 'ผลงาน',
    icon: <TrendingUp className="w-4 h-4" />,
  },
  student: {
    zh: '学员管理',
    th: 'จัดการสมาชิก',
    icon: <Users className="w-4 h-4" />,
  },
  risk: {
    zh: '风险与质量',
    th: 'ความเสี่ยง',
    icon: <Shield className="w-4 h-4" />,
  },
  reports: {
    zh: '报告汇报',
    th: 'รายงาน',
    icon: <FileText className="w-4 h-4" />,
  },
  system: {
    zh: '系统管理',
    th: 'ระบบ',
    icon: <Settings className="w-4 h-4" />,
  },
};

// ── 子组件 ────────────────────────────────────────────────────────────────────

function PageItem({
  page,
  lang,
  onToggle,
}: {
  page: PageEntry;
  lang: 'zh' | 'en';
  onToggle: (path: string, isPublic: boolean) => Promise<void>;
}) {
  const t = I18N[lang];
  const name = lang === 'zh' ? page.name_zh : page.name_en;
  const desc = lang === 'zh' ? page.description_zh : page.description_en;

  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-[var(--bg-subtle)] transition-colors group">
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--text-primary)] truncate">{name}</span>
            {page.is_public && (
              <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium shrink-0">
                <Globe className="w-2.5 h-2.5" />
                {t.publicBadge}
              </span>
            )}
          </div>
          {desc && (
            <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate max-w-xs">{desc}</p>
          )}
          <p className="text-[10px] text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity">
            {page.path}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 ml-4 shrink-0">
        {page.visitor_count !== undefined && (
          <span className="text-xs text-[var(--text-muted)]">
            {page.visitor_count}
            {t.visitors}
          </span>
        )}
        {/* Toggle 开关 */}
        <button
          role="switch"
          aria-checked={page.is_public}
          onClick={() => onToggle(page.path, !page.is_public)}
          title={page.is_public ? t.private : t.publicToggle}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2 ${
            page.is_public ? 'bg-emerald-500' : 'bg-[var(--n-300)]'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
              page.is_public ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
}

// ── 主组件 ────────────────────────────────────────────────────────────────────

export default function PageOverview({ pages, onTogglePublic }: PageOverviewProps) {
  const locale = useLocale();
  const lang = locale === 'zh' || locale === 'zh-TW' ? 'zh' : 'en';

  // 按分类分组
  const grouped: Record<string, PageEntry[]> = {};
  for (const page of pages) {
    const cat = page.category || 'system';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(page);
  }

  const categoryKeys = Object.keys(CATEGORIES).filter((k) => grouped[k] && grouped[k].length > 0);

  return (
    <div className="space-y-4">
      {categoryKeys.length === 0 ? (
        <div className="state-empty">
          <Settings className="w-8 h-8 text-[var(--n-300)]" />
          <span className="text-sm">{I18N[lang].noPages}</span>
        </div>
      ) : (
        categoryKeys.map((catKey) => {
          const catInfo = CATEGORIES[catKey];
          const catPages = grouped[catKey] ?? [];
          const publicCount = catPages.filter((p) => p.is_public).length;

          return (
            <div key={catKey} className="card-base p-4">
              {/* 分类标题 */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[var(--text-muted)]">{catInfo.icon}</span>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    {catInfo.zh}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">({catPages.length})</span>
                </div>
                {publicCount > 0 && (
                  <span className="text-xs text-emerald-600">{publicCount} 个公开</span>
                )}
              </div>

              {/* 页面列表 */}
              <div className="divide-y divide-[var(--border-subtle)]">
                {catPages.map((page) => (
                  <PageItem key={page.path} page={page} lang={lang} onToggle={onTogglePublic} />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
