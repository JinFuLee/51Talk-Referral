'use client';

import { useState } from 'react';
import { RoiDashboard } from '@/components/checkin/RoiDashboard';
import { RoiStudentTable } from '@/components/checkin/RoiStudentTable';
import { RoiChannelMatrix } from '@/components/checkin/RoiChannelMatrix';

interface Props {
  roleFilter?: string;
  enclosureFilter?: string | null;
}

const SUB_TABS = [
  { id: 'dashboard' as const, label: '全局仪表盘' },
  { id: 'students' as const, label: '学员 ROI 排行' },
  { id: 'channels' as const, label: '渠道 ROI 矩阵' },
];

type SubTabId = (typeof SUB_TABS)[number]['id'];

export function RoiAnalysisTab({ enclosureFilter }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>('dashboard');

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
