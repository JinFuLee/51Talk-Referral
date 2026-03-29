'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { usePageDimensions } from '@/lib/hooks/use-page-dimensions';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageTabs } from '@/components/ui/PageTabs';
import { Card } from '@/components/ui/Card';
import { BIZ_PAGE } from '@/lib/layout';
import { TodayStatus } from './TodayStatus';
import { BotManager } from './BotManager';
import { PushControl } from './PushControl';
import { OutputGallery } from './OutputGallery';
import { ScheduleManager } from './ScheduleManager';

type Platform = 'lark' | 'dingtalk';

export default function NotificationsPage() {
  usePageDimensions({});
  const t = useTranslations('notifications');
  const [platform, setPlatform] = useState<Platform>('lark');

  const platformTabs = [
    { id: 'lark' as Platform, label: t('lark') },
    { id: 'dingtalk' as Platform, label: t('dingtalk') },
  ];

  return (
    <div className={BIZ_PAGE}>
      {/* Page Header */}
      <PageHeader title={t('title')} subtitle={t('subtitle')} icon={Bell} />

      {/* Today's Push Status */}
      <Card title={t('todayStatus')}>
        <TodayStatus />
      </Card>

      {/* Platform Tabs */}
      <PageTabs
        tabs={platformTabs}
        activeId={platform}
        onChange={(id) => setPlatform(id as Platform)}
      />

      {/* Bot Manager */}
      <Card>
        <BotManager platform={platform} />
      </Card>

      {/* Push Control */}
      <Card title={t('push')}>
        <PushControl platform={platform} />
      </Card>

      {/* Schedule Manager */}
      <Card title={t('schedule')}>
        <ScheduleManager />
      </Card>

      {/* Output Gallery */}
      <Card title={t('outputs')}>
        <OutputGallery platform={platform} />
      </Card>
    </div>
  );
}
