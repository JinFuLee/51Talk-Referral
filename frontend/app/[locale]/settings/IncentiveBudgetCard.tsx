'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import useSWR from 'swr';
import { Card } from '@/components/ui/Card';
import { swrFetcher } from '@/lib/api';
import type { IncentiveBudget } from '@/lib/types/incentive';

const I18N = {
  zh: {
    cardTitle: '激励预算配置',
    desc: '设置当月内场与外场激励总预算（泰铢），进度页面将自动计算消耗比例。当前月份：',
    year: '年',
    month: '月',
    loading: '加载中…',
    indoor: '内场激励预算',
    indoorHint: '对 CC/SS/LP 员工的内部奖励',
    outdoor: '外场激励预算',
    outdoorHint: '对学员推荐人的外部奖励',
    invalidBudget: '请输入有效的预算金额（≥0）',
    savingBtn: '保存中…',
    savedBtn: '已保存',
    saveBtn: '保存预算',
    saveFailed: '保存失败',
  },
  'zh-TW': {
    cardTitle: '激勵預算設定',
    desc: '設定當月內場與外場激勵總預算（泰銖），進度頁面將自動計算消耗比例。當前月份：',
    year: '年',
    month: '月',
    loading: '載入中…',
    indoor: '內場激勵預算',
    indoorHint: '對 CC/SS/LP 員工的內部獎勵',
    outdoor: '外場激勵預算',
    outdoorHint: '對學員推薦人的外部獎勵',
    invalidBudget: '請輸入有效的預算金額（≥0）',
    savingBtn: '儲存中…',
    savedBtn: '已儲存',
    saveBtn: '儲存預算',
    saveFailed: '儲存失敗',
  },
  en: {
    cardTitle: 'Incentive Budget',
    desc: 'Set indoor and outdoor incentive budgets (THB). Progress pages auto-calculate usage. Current month: ',
    year: '',
    month: '',
    loading: 'Loading…',
    indoor: 'Indoor Incentive Budget',
    indoorHint: 'Internal rewards for CC/SS/LP staff',
    outdoor: 'Outdoor Incentive Budget',
    outdoorHint: 'External rewards for student referrers',
    invalidBudget: 'Please enter a valid budget (≥0)',
    savingBtn: 'Saving…',
    savedBtn: 'Saved',
    saveBtn: 'Save Budget',
    saveFailed: 'Save failed',
  },
  th: {
    cardTitle: 'งบประมาณจูงใจ',
    desc: 'ตั้งงบประมาณจูงใจในและนอกสถานที่ (THB) หน้าความคืบหน้าจะคำนวณอัตโนมัติ เดือนปัจจุบัน: ',
    year: '',
    month: '',
    loading: 'กำลังโหลด…',
    indoor: 'งบจูงใจในสถานที่',
    indoorHint: 'รางวัลภายในสำหรับพนักงาน CC/SS/LP',
    outdoor: 'งบจูงใจนอกสถานที่',
    outdoorHint: 'รางวัลภายนอกสำหรับผู้แนะนำ',
    invalidBudget: 'กรุณาใส่งบประมาณที่ถูกต้อง (≥0)',
    savingBtn: 'กำลังบันทึก…',
    savedBtn: 'บันทึกแล้ว',
    saveBtn: 'บันทึกงบประมาณ',
    saveFailed: 'บันทึกไม่สำเร็จ',
  },
};

interface Props {
  month: string;
}

export default function IncentiveBudgetCard({ month }: Props) {
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];
  const { data, mutate, isLoading } = useSWR<IncentiveBudget>('/api/incentive/budget', swrFetcher);

  const [indoorBudget, setIndoorBudget] = useState('');
  const [outdoorBudget, setOutdoorBudget] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && data) {
      setIndoorBudget(String(data.indoor_budget_thb));
      setOutdoorBudget(String(data.outdoor_budget_thb));
    }
  }, [isLoading, data]);

  async function handleSave() {
    const indoor = parseFloat(indoorBudget);
    const outdoor = parseFloat(outdoorBudget);
    if (isNaN(indoor) || indoor < 0 || isNaN(outdoor) || outdoor < 0) {
      setError(t.invalidBudget);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/incentive/budget', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          indoor_budget_thb: indoor,
          outdoor_budget_thb: outdoor,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await mutate();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title={t.cardTitle}>
      <div className="space-y-4">
        <p className="text-xs text-[var(--text-muted)]">
          {t.desc}
          {t.year
            ? `${month.slice(0, 4)}${t.year}${month.slice(4)}${t.month}`
            : `${month.slice(0, 4)}-${month.slice(4)}`}
        </p>

        {isLoading && (
          <div className="py-2 text-center text-xs text-[var(--text-muted)]">{t.loading}</div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {/* indoor */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-500" />
              {t.indoor}
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                step={1000}
                value={indoorBudget}
                onChange={(e) => setIndoorBudget(e.target.value)}
                placeholder="35000"
                className="w-28 px-2 py-1.5 border border-[var(--border-subtle)] rounded text-sm font-mono tabular-nums bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-action"
              />
              <span className="text-xs text-[var(--text-muted)]">฿</span>
            </div>
            <p className="text-[10px] text-[var(--text-muted)]">{t.indoorHint}</p>
          </div>

          {/* outdoor */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-purple-500" />
              {t.outdoor}
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                step={1000}
                value={outdoorBudget}
                onChange={(e) => setOutdoorBudget(e.target.value)}
                placeholder="20000"
                className="w-28 px-2 py-1.5 border border-[var(--border-subtle)] rounded text-sm font-mono tabular-nums bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-action"
              />
              <span className="text-xs text-[var(--text-muted)]">฿</span>
            </div>
            <p className="text-[10px] text-[var(--text-muted)]">{t.outdoorHint}</p>
          </div>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={handleSave}
            disabled={saving || isLoading}
            className="px-3 py-1 bg-action text-white rounded text-xs font-medium hover:bg-action-active transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-action disabled:opacity-40"
          >
            {saving ? t.savingBtn : saved ? t.savedBtn : t.saveBtn}
          </button>
        </div>
      </div>
    </Card>
  );
}
