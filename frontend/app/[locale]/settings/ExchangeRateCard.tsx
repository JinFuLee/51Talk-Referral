'use client';

import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';

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
  const t = useTranslations('ExchangeRateCard');

  return (
    <Card title={t('cardTitle')}>
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-secondary-token">
          <span>{t('currentRate')}</span>
          <span className="font-semibold text-primary-token">
            {rate ? `${rate.rate} ${rate.unit}` : t('loading')}
          </span>
        </div>
        <div className="flex gap-2">
          <input
            value={rateInput}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={t('placeholder')}
            type="number"
            step="0.01"
            className="flex-1 px-3 py-2 border border-subtle-token rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
          />
          <button
            onClick={onSave}
            disabled={rateSaving || !rateInput}
            className="px-4 py-2 bg-action text-white rounded-lg text-sm font-medium hover:bg-action-active disabled:opacity-50 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-action"
          >
            {rateSaving ? <Spinner size="sm" /> : t('save')}
          </button>
        </div>
        {rateMsg && (
          <p
            className={`text-xs ${rateMsg.includes('成功') || rateMsg.toLowerCase().includes('success') ? 'text-success-token' : 'text-danger-token'}`}
          >
            {rateMsg}
          </p>
        )}
      </div>
    </Card>
  );
}
