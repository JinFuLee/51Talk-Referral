'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { RoiDashboard } from '@/components/checkin/RoiDashboard';
import { RoiStudentTable } from '@/components/checkin/RoiStudentTable';
import { RoiChannelMatrix } from '@/components/checkin/RoiChannelMatrix';

const I18N = {
  zh: {
    dashboard: '全局仪表盘',
    students: '学员 ROI 排行',
    channels: '渠道 ROI 矩阵',
  },
  'zh-TW': {
    dashboard: '全局儀表板',
    students: '學員 ROI 排行',
    channels: '渠道 ROI 矩陣',
  },
  en: {
    dashboard: 'Overview Dashboard',
    students: 'Student ROI Ranking',
    channels: 'Channel ROI Matrix',
  },
  th: {
    dashboard: 'ภาพรวม Dashboard',
    students: 'อันดับ ROI นักเรียน',
    channels: 'เมทริกซ์ ROI ช่องทาง',
  },
} as const;

type TabLocale = keyof typeof I18N;

interface Props {
  roleFilter?: string;
  enclosureFilter?: string | null;
}

type SubTabId = 'dashboard' | 'students' | 'channels';

export function RoiAnalysisTab({ enclosureFilter }: Props) {
  const locale = useLocale();
  const t = I18N[(locale as TabLocale) in I18N ? (locale as TabLocale) : 'zh'];
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>('dashboard');

  const SUB_TABS: { id: SubTabId; label: string }[] = [
    { id: 'dashboard', label: t.dashboard },
    { id: 'students', label: t.students },
    { id: 'channels', label: t.channels },
  ];

  return (
    <div className="space-y-4">
      {/* 子 Tab 导航 */}
      <div className="flex gap-1 border-b border-[var(--border-default)]">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={[
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
              activeSubTab === tab.id
                ? 'border-[var(--action-accent)] text-[var(--action-accent)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 子面板内容 */}
      <div>
        {activeSubTab === 'dashboard' && <RoiDashboard enclosureFilter={enclosureFilter} />}
        {activeSubTab === 'students' && <RoiStudentTable enclosureFilter={enclosureFilter} />}
        {activeSubTab === 'channels' && <RoiChannelMatrix enclosureFilter={enclosureFilter} />}
      </div>
    </div>
  );
}
