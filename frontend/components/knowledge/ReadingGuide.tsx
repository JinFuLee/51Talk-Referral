'use client';

import { useLocale } from 'next-intl';
import { X, BookOpen, ArrowRight } from 'lucide-react';

/* ── I18N ────────────────────────────────────────────────────────── */

const I18N = {
  zh: {
    title: '欢迎来到知识库',
    subtitle: '推荐新手从以下内容开始阅读',
    ariaClose: '关闭引导',
    dismissBtn: '不再显示',
    badgeMust: '必读',
    badgeRecommended: '选读',
    badgeReference: '参考',
  },
  'zh-TW': {
    title: '歡迎來到知識庫',
    subtitle: '推薦新手從以下內容開始閱讀',
    ariaClose: '關閉引導',
    dismissBtn: '不再顯示',
    badgeMust: '必讀',
    badgeRecommended: '選讀',
    badgeReference: '參考',
  },
  en: {
    title: 'Welcome to the Knowledge Base',
    subtitle: 'Recommended reading for new users',
    ariaClose: 'Close guide',
    dismissBtn: "Don't show again",
    badgeMust: 'Must read',
    badgeRecommended: 'Recommended',
    badgeReference: 'Reference',
  },
  th: {
    title: 'ยินดีต้อนรับสู่คลังความรู้',
    subtitle: 'แนะนำสำหรับผู้ใช้ใหม่',
    ariaClose: 'ปิดคู่มือ',
    dismissBtn: 'ไม่ต้องแสดงอีก',
    badgeMust: 'ต้องอ่าน',
    badgeRecommended: 'แนะนำ',
    badgeReference: 'อ้างอิง',
  },
} as const;

type Locale = keyof typeof I18N;

const STORAGE_KEY = 'knowledge-guide-dismissed';

interface ReadingItem {
  bookId: string;
  chapterId: string;
  title: string;
  description: string;
  badge: 'must' | 'recommended' | 'reference';
}

const READING_ITEMS: ReadingItem[] = [
  {
    bookId: 'business-glossary',
    chapterId: 'core-roles',
    title: '业务角色速查（CC / SS / LP）',
    description: '了解三大岗位职责与分工边界',
    badge: 'must',
  },
  {
    bookId: 'business-glossary',
    chapterId: 'enclosure-definition',
    title: '围场定义与计算规则',
    description: '付费当日起算天数分段逻辑',
    badge: 'must',
  },
  {
    bookId: 'business-glossary',
    chapterId: 'metrics-formula',
    title: '核心指标公式大全',
    description: '参与率、打卡率、触达率、带新系数等',
    badge: 'must',
  },
  {
    bookId: 'methodology',
    chapterId: 'six-step-analysis',
    title: '六步分析法',
    description: '从数据到决策的结构化分析框架',
    badge: 'recommended',
  },
  {
    bookId: 'methodology',
    chapterId: 'five-why',
    title: '5-Why 根因分析',
    description: '异常偏离时的因果链追溯方法',
    badge: 'reference',
  },
];

interface ReadingGuideProps {
  onNavigate: (bookId: string, chapterId: string) => void;
  onDismiss: () => void;
}

export function ReadingGuide({ onNavigate, onDismiss }: ReadingGuideProps) {
  const locale = useLocale() as Locale;
  const t = I18N[locale] ?? I18N.zh;

  const BADGE_CONFIG = {
    must: {
      label: t.badgeMust,
      className: 'bg-[var(--color-danger-surface)] text-[var(--color-danger)]',
    },
    recommended: {
      label: t.badgeRecommended,
      className: 'bg-[var(--color-warning-surface)] text-[var(--color-warning)]',
    },
    reference: {
      label: t.badgeReference,
      className: 'bg-[var(--bg-subtle)] text-[var(--text-muted)]',
    },
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="card-base shadow-[var(--shadow-raised)] w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[var(--color-accent-surface)]">
              <BookOpen className="w-5 h-5 text-[var(--color-accent)]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">{t.title}</h2>
              <p className="text-xs text-[var(--text-muted)]">{t.subtitle}</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors focus-visible:outline-none"
            aria-label={t.ariaClose}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Reading list */}
        <div className="px-5 py-4 space-y-2">
          {READING_ITEMS.map((item, i) => {
            const badge = BADGE_CONFIG[item.badge];
            return (
              <button
                key={i}
                onClick={() => {
                  onNavigate(item.bookId, item.chapterId);
                  handleDismiss();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--bg-subtle)] transition-colors text-left group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)]"
              >
                <span
                  className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded ${badge.className}`}
                >
                  {badge.label}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {item.title}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] truncate">{item.description}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--border-subtle)] flex justify-end">
          <button
            onClick={handleDismiss}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] underline decoration-dotted transition-colors focus-visible:outline-none"
          >
            {t.dismissBtn}
          </button>
        </div>
      </div>
    </div>
  );
}

export function shouldShowGuide(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return !localStorage.getItem(STORAGE_KEY);
  } catch {
    return false;
  }
}
