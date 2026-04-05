'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { RoiDashboard } from '@/components/checkin/RoiDashboard';
import { RoiStudentTable } from '@/components/checkin/RoiStudentTable';
import { RoiChannelMatrix } from '@/components/checkin/RoiChannelMatrix';
interface Props {
  roleFilter?: string;
  enclosureFilter?: string | null;
}

type SubTabId = 'dashboard' | 'students' | 'channels';

export function RoiAnalysisTab({ roleFilter, enclosureFilter }: Props) {
    const t = useTranslations('RoiAnalysisTab');
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>('dashboard');

  const SUB_TABS: { id: SubTabId; label: string }[] = [
    { id: 'dashboard', label: t('dashboard') },
    { id: 'students', label: t('students') },
    { id: 'channels', label: t('channels') },
  ];

  return (
    <div className="space-y-4">
      {/* 子 Tab 导航 */}
      <div className="flex gap-1 border-b border-default-token">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={[
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
              activeSubTab === tab.id
                ? 'border-action-accent-token text-action-accent-token'
                : 'border-transparent text-secondary-token hover:text-primary-token',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 子面板内容 */}
      <div>
        {activeSubTab === 'dashboard' && (
          <RoiDashboard roleFilter={roleFilter} enclosureFilter={enclosureFilter} />
        )}
        {activeSubTab === 'students' && (
          <RoiStudentTable roleFilter={roleFilter} enclosureFilter={enclosureFilter} />
        )}
        {activeSubTab === 'channels' && (
          <RoiChannelMatrix roleFilter={roleFilter} enclosureFilter={enclosureFilter} />
        )}
      </div>
    </div>
  );
}
