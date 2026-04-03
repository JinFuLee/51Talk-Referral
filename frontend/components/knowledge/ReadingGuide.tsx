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
    items: [
      { title: '业务角色速查（CC / SS / LP）', description: '了解三大岗位职责与分工边界' },
      { title: '围场定义与计算规则', description: '付费当日起算天数分段逻辑' },
      { title: '核心指标公式大全', description: '参与率、打卡率、触达率、带新系数等' },
      { title: '六步分析法', description: '从数据到决策的结构化分析框架' },
      { title: '5-Why 根因分析', description: '异常偏离时的因果链追溯方法' },
    ],
  },
  'zh-TW': {
    title: '歡迎來到知識庫',
    subtitle: '推薦新手從以下內容開始閱讀',
    ariaClose: '關閉引導',
    dismissBtn: '不再顯示',
    badgeMust: '必讀',
    badgeRecommended: '選讀',
    badgeReference: '參考',
    items: [
      { title: '業務角色速查（CC / SS / LP）', description: '了解三大崗位職責與分工邊界' },
      { title: '圍場定義與計算規則', description: '付費當日起算天數分段邏輯' },
      { title: '核心指標公式大全', description: '參與率、打卡率、觸達率、帶新係數等' },
      { title: '六步分析法', description: '從數據到決策的結構化分析框架' },
      { title: '5-Why 根因分析', description: '異常偏離時的因果鏈追溯方法' },
    ],
  },
  en: {
    title: 'Welcome to the Knowledge Base',
    subtitle: 'Recommended reading for new users',
    ariaClose: 'Close guide',
    dismissBtn: "Don't show again",
    badgeMust: 'Must read',
    badgeRecommended: 'Recommended',
    badgeReference: 'Reference',
    items: [
      {
        title: 'Role Reference (CC / SS / LP)',
        description: 'Responsibilities and boundaries of the three roles',
      },
      {
        title: 'Enclosure Definition & Calculation',
        description: 'Day-based segmentation logic from first payment',
      },
      {
        title: 'Core Metric Formulas',
        description: 'Participation rate, check-in rate, reach rate, referral coefficient, etc.',
      },
      {
        title: 'Six-Step Analysis Framework',
        description: 'Structured analysis from data to decision',
      },
      {
        title: '5-Why Root Cause Analysis',
        description: 'Causal chain tracing for anomaly deviations',
      },
    ],
  },
  th: {
    title: 'ยินดีต้อนรับสู่คลังความรู้',
    subtitle: 'แนะนำสำหรับผู้ใช้ใหม่',
    ariaClose: 'ปิดคู่มือ',
    dismissBtn: 'ไม่ต้องแสดงอีก',
    badgeMust: 'ต้องอ่าน',
    badgeRecommended: 'แนะนำ',
    badgeReference: 'อ้างอิง',
    items: [
      { title: 'คู่มือบทบาท (CC / SS / LP)', description: 'ความรับผิดชอบและขอบเขตของสามบทบาท' },
      { title: 'นิยามคอกและกฎการคำนวณ', description: 'ตรรกะการแบ่งเซกเมนต์ตามวันนับจากวันชำระ' },
      {
        title: 'สูตรตัวชี้วัดหลัก',
        description: 'อัตราการมีส่วนร่วม เช็คอิน การเข้าถึง สัมประสิทธิ์แนะนำ เป็นต้น',
      },
      {
        title: 'กรอบการวิเคราะห์ 6 ขั้นตอน',
        description: 'การวิเคราะห์เชิงโครงสร้างจากข้อมูลสู่การตัดสินใจ',
      },
      {
        title: 'การวิเคราะห์รากเหง้า 5-Why',
        description: 'การตามรอยสาเหตุเมื่อพบความเบี่ยงเบนผิดปกติ',
      },
    ],
  },
} as const;

type Locale = keyof typeof I18N;

const STORAGE_KEY = 'knowledge-guide-dismissed';

interface ReadingItem {
  bookId: string;
  chapterId: string;
  badge: 'must' | 'recommended' | 'reference';
}

const READING_ITEMS: ReadingItem[] = [
  { bookId: 'business-glossary', chapterId: 'core-roles', badge: 'must' },
  { bookId: 'business-glossary', chapterId: 'enclosure-definition', badge: 'must' },
  { bookId: 'business-glossary', chapterId: 'metrics-formula', badge: 'must' },
  { bookId: 'methodology', chapterId: 'six-step-analysis', badge: 'recommended' },
  { bookId: 'methodology', chapterId: 'five-why', badge: 'reference' },
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
            const localItem = t.items[i];
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
                    {localItem.title}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] truncate">
                    {localItem.description}
                  </p>
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
