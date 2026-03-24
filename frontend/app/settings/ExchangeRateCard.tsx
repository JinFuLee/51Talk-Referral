'use client';

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
  return (
    <Card title="汇率配置">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <span>当前汇率：</span>
          <span className="font-semibold text-[var(--text-primary)]">
            {rate ? `${rate.rate} ${rate.unit}` : '加载中…'}
          </span>
        </div>
        <div className="flex gap-2">
          <input
            value={rateInput}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="新汇率 (THB/USD)"
            type="number"
            step="0.01"
            className="flex-1 px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          />
          <button
            onClick={onSave}
            disabled={rateSaving || !rateInput}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-500"
          >
            {rateSaving ? <Spinner size="sm" /> : '保存'}
          </button>
        </div>
        {rateMsg && (
          <p className={`text-xs ${rateMsg.includes('成功') ? 'text-green-600' : 'text-red-500'}`}>
            {rateMsg}
          </p>
        )}
      </div>
    </Card>
  );
}
