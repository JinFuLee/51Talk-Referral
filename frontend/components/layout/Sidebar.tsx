'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import clsx from 'clsx';

// ── I18N ────────────────────────────────────────────────────────────────────

const I18N = {
  zh: {
    subtitle: '51Talk 泰国转介绍',
    footer: 'M9 · Next.js 前端',
    nav: {
      '/': '看板',
      '/analysis': '深度分析',
      '/ranking': '绩效排名',
      '/trend': '趋势分析',
      '/funnel': '漏斗分析',
      '/outreach-quality': '接通质量',
      '/followup-quality': '跟进质量',
      '/referral-contributor': '推荐者贡献',
      '/incentive-tracking': '激励追踪',
      '/renewal-risk': '续费风险',
      '/reports': '分析报告',
      '/datasources': '数据源',
      '/snapshots': '历史快照',
      '/settings': '设置',
    },
  },
  'zh-TW': {
    subtitle: '51Talk 泰國轉介紹',
    footer: 'M9 · Next.js 前端',
    nav: {
      '/': '看板',
      '/analysis': '深度分析',
      '/ranking': '績效排名',
      '/trend': '趨勢分析',
      '/funnel': '漏斗分析',
      '/outreach-quality': '接通質量',
      '/followup-quality': '跟進質量',
      '/referral-contributor': '推薦者貢獻',
      '/incentive-tracking': '激勵追蹤',
      '/renewal-risk': '續費風險',
      '/reports': '分析報告',
      '/datasources': '資料來源',
      '/snapshots': '歷史快照',
      '/settings': '設定',
    },
  },
  en: {
    subtitle: '51Talk Thailand Referral',
    footer: 'M9 · Next.js Frontend',
    nav: {
      '/': 'Dashboard',
      '/analysis': 'Deep Analysis',
      '/ranking': 'Performance Ranking',
      '/trend': 'Trend Analysis',
      '/funnel': 'Funnel Analysis',
      '/outreach-quality': 'Call Quality',
      '/followup-quality': 'Follow-up Quality',
      '/referral-contributor': 'Referral Contributors',
      '/incentive-tracking': 'Incentive Tracking',
      '/renewal-risk': 'Renewal Risk',
      '/reports': 'Reports',
      '/datasources': 'Data Sources',
      '/snapshots': 'Snapshots',
      '/settings': 'Settings',
    },
  },
  th: {
    subtitle: '51Talk ไทย แนะนำเพื่อน',
    footer: 'M9 · Next.js Frontend',
    nav: {
      '/': 'แดชบอร์ด',
      '/analysis': 'วิเคราะห์เชิงลึก',
      '/ranking': 'อันดับผลงาน',
      '/trend': 'วิเคราะห์แนวโน้ม',
      '/funnel': 'วิเคราะห์ Funnel',
      '/outreach-quality': 'คุณภาพการโทร',
      '/followup-quality': 'คุณภาพการติดตาม',
      '/referral-contributor': 'ผู้แนะนำ',
      '/incentive-tracking': 'ติดตามสิ่งจูงใจ',
      '/renewal-risk': 'ความเสี่ยงต่ออายุ',
      '/reports': 'รายงาน',
      '/datasources': 'แหล่งข้อมูล',
      '/snapshots': 'ภาพรวมประวัติ',
      '/settings': 'การตั้งค่า',
    },
  },
} as const;

type SidebarLocale = keyof typeof I18N;

const NAV_HREFS = [
  '/',
  '/analysis',
  '/ranking',
  '/trend',
  '/funnel',
  '/outreach-quality',
  '/followup-quality',
  '/referral-contributor',
  '/incentive-tracking',
  '/renewal-risk',
  '/reports',
  '/datasources',
  '/snapshots',
  '/settings',
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const locale = useLocale();
  const t = I18N[(locale as SidebarLocale) in I18N ? (locale as SidebarLocale) : 'zh'];

  return (
    <aside className="w-56 bg-subtle flex flex-col shrink-0">
      <div className="px-4 py-5 border-b border-default-token">
        <div className="text-white font-bold text-sm leading-tight">ref-ops-engine</div>
        <div className="text-muted-token text-xs mt-0.5">{t.subtitle}</div>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {NAV_HREFS.map((href) => {
          const isActive =
            href === '/' ? pathname === '/' || pathname === `/${locale}` : pathname.includes(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={clsx(
                'flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-token hover:text-white hover:bg-subtle'
              )}
            >
              {t.nav[href]}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-3 border-t border-default-token">
        <p className="text-xs text-secondary-token">{t.footer}</p>
      </div>
    </aside>
  );
}
