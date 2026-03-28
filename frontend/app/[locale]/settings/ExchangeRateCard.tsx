'use client';

import { useLocale } from 'next-intl';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';

const I18N = {
  zh: {
    cardTitle: '汇率配置',
    currentRate: '当前汇率：',
    loading: '加载中…',
    placeholder: '新汇率 (THB/USD)',
    save: '保存',
  },
  'zh-TW': {
    cardTitle: '匯率設定',
    currentRate: '當前匯率：',
    loading: '載入中…',
    placeholder: '新匯率 (THB/USD)',
    save: '儲存',
  },
  en: {
    cardTitle: 'Exchange Rate',
    currentRate: 'Current rate:',
    loading: 'Loading…',
    placeholder: 'New rate (THB/USD)',
    save: 'Save',
  },
  th: {
    cardTitle: 'อัตราแลกเปลี่ยน',
    currentRate: 'อัตราปัจจุบัน:',
    loading: 'กำลังโหลด…',
    placeholder: 'อัตราใหม่ (THB/USD)',
    save: 'บันทึก',
  },
};

interface ExchangeRateCardProps {
  rate: { rate: number; unit: string } | undefined;
  rateInput: string;
  rateSaving: boolean;
  rateMsg: string | null;
  onInputChange: (v: string) => void;
  onSave: () => void;
}

export default function ExchangeRateCard({
  rate,
  rateInput,
  rateSaving,
  rateMsg,
  onInputChange,
  onSave,
}: ExchangeRateCardProps) {
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];

  return (
    <Card title={t.cardTitle}>
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <span>{t.currentRate}</span>
          <span className="font-semibold text-[var(--text-primary)]">
            {rate ? `${rate.rate} ${rate.unit}` : t.loading}
          </span>
        </div>
        <div className="flex gap-2">
          <input
            value={rateInput}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={t.placeholder}
            type="number"
            step="0.01"
            className="flex-1 px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
          />
          <button
            onClick={onSave}
            disabled={rateSaving || !rateInput}
            className="px-4 py-2 bg-action text-white rounded-lg text-sm font-medium hover:bg-action-active disabled:opacity-50 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-action"
          >
            {rateSaving ? <Spinner size="sm" /> : t.save}
          </button>
        </div>
        {rateMsg && (
          <p
            className={`text-xs ${rateMsg.includes('成功') || rateMsg.toLowerCase().includes('success') ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}
          >
            {rateMsg}
          </p>
        )}
      </div>
    </Card>
  );
}
