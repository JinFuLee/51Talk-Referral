'use client';

import { useLocale } from 'next-intl';
import { PresentationLauncher } from '@/components/presentation/PresentationLauncher';

const I18N = {
  zh: { title: '汇报模式', subtitle: '选择汇报场景与时间维度，进入全屏汇报' },
  'zh-TW': { title: '匯報模式', subtitle: '選擇匯報場景與時間維度，進入全螢幕匯報' },
  en: {
    title: 'Presentation Mode',
    subtitle: 'Select audience and timeframe to enter fullscreen presentation',
  },
  th: { title: 'โหมดนำเสนอ', subtitle: 'เลือกสถานการณ์และกรอบเวลาเพื่อเข้าสู่การนำเสนอแบบเต็มจอ' },
};

export default function PresentPage() {
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">{t.title}</h1>
          <p className="text-[var(--text-secondary)] mt-2">{t.subtitle}</p>
        </div>
        <PresentationLauncher />
      </div>
    </div>
  );
}
