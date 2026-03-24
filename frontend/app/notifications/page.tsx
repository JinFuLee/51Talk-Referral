'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageTabs } from '@/components/ui/PageTabs';
import { Card } from '@/components/ui/Card';
import { BIZ_PAGE } from '@/lib/layout';
import { TodayStatus } from './TodayStatus';
import { BotManager } from './BotManager';
import { PushControl } from './PushControl';
import { OutputGallery } from './OutputGallery';
import { ScheduleManager } from './ScheduleManager';

const I18N = {
  zh: {
    title: '通知推送管理',
    subtitle: 'Lark / 钉钉多通道消息推送配置与控制',
    todayStatus: '今日推送状态',
    bots: '机器人管理',
    push: '推送控制',
    schedule: '定时排程',
    outputs: '产出档案',
    lark: 'Lark',
    dingtalk: '钉钉',
    lang: 'EN',
  },
  en: {
    title: 'Notification Management',
    subtitle: 'Lark / DingTalk multi-channel push config',
    todayStatus: "Today's Status",
    bots: 'Bot Management',
    push: 'Push Control',
    schedule: 'Scheduled Tasks',
    outputs: 'Output Archive',
    lark: 'Lark',
    dingtalk: 'DingTalk',
    lang: '中',
  },
} as const;

type Lang = keyof typeof I18N;
type Platform = 'lark' | 'dingtalk';

const PLATFORM_TABS = (lang: Lang) => [
  { id: 'lark' as Platform, label: I18N[lang].lark },
  { id: 'dingtalk' as Platform, label: I18N[lang].dingtalk },
];

export default function NotificationsPage() {
  const [lang, setLang] = useState<Lang>('zh');
  const [platform, setPlatform] = useState<Platform>('lark');

  const t = I18N[lang];

  return (
    <div className={BIZ_PAGE}>
      {/* Page Header */}
      <PageHeader title={t.title} subtitle={t.subtitle} icon={Bell}>
        <button
          onClick={() => setLang((l) => (l === 'zh' ? 'en' : 'zh'))}
          className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-[var(--text-secondary)] hover:bg-slate-50 transition-colors"
        >
          {t.lang}
        </button>
      </PageHeader>

      {/* Today's Push Status */}
      <Card title={t.todayStatus}>
        <TodayStatus />
      </Card>

      {/* Platform Tabs */}
      <PageTabs
        tabs={PLATFORM_TABS(lang)}
        activeId={platform}
        onChange={(id) => setPlatform(id as Platform)}
      />

      {/* Bot Manager */}
      <Card>
        <BotManager platform={platform} />
      </Card>

      {/* Push Control */}
      <Card title={t.push}>
        <PushControl platform={platform} />
      </Card>

      {/* Schedule Manager */}
      <Card title={t.schedule}>
        <ScheduleManager lang={lang} />
      </Card>

      {/* Output Gallery */}
      <Card title={t.outputs}>
        <OutputGallery platform={platform} />
      </Card>
    </div>
  );
}
