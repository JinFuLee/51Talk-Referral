'use client';

import { useState, useCallback, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { toast } from 'sonner';

const I18N = {
  zh: {
    pageTitle: '系统设置',
    saveTargets: '保存目标',
    saveSuccess: '保存成功',
    saveFailed: '保存失败',
    rateInvalid: '请输入有效汇率',
    applied: '已应用',
    plan: '方案',
  },
  'zh-TW': {
    pageTitle: '系統設定',
    saveTargets: '儲存目標',
    saveSuccess: '儲存成功',
    saveFailed: '儲存失敗',
    rateInvalid: '請輸入有效匯率',
    applied: '已套用',
    plan: '方案',
  },
  en: {
    pageTitle: 'System Settings',
    saveTargets: 'Save Targets',
    saveSuccess: 'Saved successfully',
    saveFailed: 'Save failed',
    rateInvalid: 'Please enter a valid rate',
    applied: 'Applied',
    plan: 'plan',
  },
  th: {
    pageTitle: 'การตั้งค่าระบบ',
    saveTargets: 'บันทึกเป้าหมาย',
    saveSuccess: 'บันทึกสำเร็จ',
    saveFailed: 'บันทึกไม่สำเร็จ',
    rateInvalid: 'กรุณาใส่อัตราแลกเปลี่ยนที่ถูกต้อง',
    applied: 'ใช้แล้ว',
    plan: 'แผน',
  },
};
import { usePageDimensions } from '@/lib/hooks/use-page-dimensions';
import { useExchangeRate, useTargetsV2, useTargetRecommendation } from '@/lib/hooks';
import { PageHeader } from '@/components/layout/PageHeader';
import { BIZ_PAGE } from '@/lib/layout';
import { configAPI } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import type {
  MonthlyTargetV2,
  HardTarget,
  ChannelDecomposition,
  ChannelTarget,
  EnclosureTarget,
  SOPTargets,
  TargetScenario,
} from '@/lib/types';
import ExchangeRateCard from './ExchangeRateCard';
import TargetSettingsCard from './TargetSettingsCard';
import ChannelSettingsCard from './ChannelSettingsCard';
import EnclosureSettingsCard from './EnclosureSettingsCard';
import SOPSettingsCard from './SOPSettingsCard';
import EnclosureRoleCard from './EnclosureRoleCard';
import CheckinThresholdsCard from './CheckinThresholdsCard';
import IndicatorMatrixCard from './IndicatorMatrixCard';
import BmCalendarCard from './BmCalendarCard';
import { TargetRecommender } from '@/components/settings/TargetRecommender';
import DataSourceCard from './DataSourceCard';
import IncentiveBudgetCard from './IncentiveBudgetCard';
import { defaultV2, MONTHS } from './defaultV2';

export default function SettingsPage() {
  usePageDimensions({});
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const { data: rate, mutate: mutateRate } = useExchangeRate();
  const { data: serverV2, mutate: mutateV2 } = useTargetsV2(selectedMonth);
  const { data: recommendation } = useTargetRecommendation(selectedMonth);
  const [v2, setV2] = useState<MonthlyTargetV2>(defaultV2(selectedMonth));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [rateInput, setRateInput] = useState('');
  const [rateSaving, setRateSaving] = useState(false);
  const [rateMsg, setRateMsg] = useState<string | null>(null);
  const [showEnclosures, setShowEnclosures] = useState(false);
  const [showSOP, setShowSOP] = useState(false);

  const exchangeRate = rate?.rate ?? 35;

  useEffect(() => {
    setV2(serverV2 ?? defaultV2(selectedMonth));
  }, [serverV2, selectedMonth]);

  const updateHard = useCallback((patch: Partial<HardTarget>) => {
    setV2((prev) => {
      const h = { ...prev.hard, ...patch };
      if ('referral_pct' in patch && h.lock_field === 'pct') {
        h.referral_revenue = Math.round(h.total_revenue * h.referral_pct);
      }
      if ('referral_revenue' in patch && h.lock_field === 'amount') {
        h.referral_pct = h.total_revenue > 0 ? h.referral_revenue / h.total_revenue : 0;
      }
      if ('total_revenue' in patch) {
        if (h.lock_field === 'pct') {
          h.referral_revenue = Math.round(h.total_revenue * h.referral_pct);
        } else {
          h.referral_pct = h.total_revenue > 0 ? h.referral_revenue / h.total_revenue : 0;
        }
      }
      return { ...prev, hard: h };
    });
  }, []);

  const updateChannel = useCallback(
    (key: keyof ChannelDecomposition, patch: Partial<ChannelTarget>) => {
      setV2((prev) => ({
        ...prev,
        channels: { ...prev.channels, [key]: { ...prev.channels[key], ...patch } },
      }));
    },
    []
  );

  const updateEnclosure = useCallback((key: string, patch: Partial<EnclosureTarget>) => {
    setV2((prev) => ({
      ...prev,
      enclosures: { ...prev.enclosures, [key]: { ...prev.enclosures[key], ...patch } },
    }));
  }, []);

  const updateSOP = useCallback((patch: Partial<SOPTargets>) => {
    setV2((prev) => ({ ...prev, sop: { ...prev.sop, ...patch } }));
  }, []);

  function applyScenario(scenario: TargetScenario, _t = t) {
    setV2((prev) => {
      const prefill = scenario.v2_prefill;
      const keys = ['cc_narrow', 'ss_narrow', 'lp_narrow', 'wide'] as const;
      const newChannels = { ...prev.channels };
      for (const k of keys) {
        if (prefill.channels[k]) newChannels[k] = { ...prev.channels[k], ...prefill.channels[k] };
      }
      return {
        ...prev,
        hard: {
          ...prev.hard,
          referral_revenue: prefill.hard.referral_revenue,
          lock_field: prefill.hard.lock_field as 'pct' | 'amount',
          referral_pct:
            prev.hard.total_revenue > 0
              ? prefill.hard.referral_revenue / prev.hard.total_revenue
              : prev.hard.referral_pct,
        },
        channels: newChannels,
        sop: { ...prev.sop, ...prefill.sop },
      };
    });
    setMsg(`${t.applied}"${scenario.label}"${t.plan}`);
  }

  async function handleSave() {
    setSaving(true);
    setMsg(null);
    try {
      mutateV2(v2, false);
      await configAPI.putTargetsV2(selectedMonth, v2);
      await mutateV2();
      setMsg(t.saveSuccess);
      toast.success(t.saveSuccess);
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : t.saveFailed;
      setMsg(errMsg);
      toast.error(errMsg);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveRate() {
    const val = parseFloat(rateInput);
    if (isNaN(val) || val <= 0) {
      setRateMsg(t.rateInvalid);
      return;
    }
    setRateSaving(true);
    setRateMsg(null);
    try {
      await configAPI.putExchangeRate(val);
      await mutateRate();
      setRateMsg(t.saveSuccess);
      setRateInput('');
      toast.success(t.saveSuccess);
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : t.saveFailed;
      setRateMsg(errMsg);
      toast.error(errMsg);
    } finally {
      setRateSaving(false);
    }
  }

  return (
    <div className={BIZ_PAGE}>
      <PageHeader title={t.pageTitle}>
        <div className="flex items-center gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
          >
            {MONTHS.map((m) => (
              <option key={m} value={m}>
                {m.slice(0, 4)}年{m.slice(4)}月
              </option>
            ))}
          </select>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-action text-white rounded-lg text-sm font-medium hover:bg-action-active disabled:opacity-50 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-action"
          >
            {saving ? <Spinner size="sm" /> : t.saveTargets}
          </button>
        </div>
      </PageHeader>

      {msg && (
        <p
          className={`text-sm ${msg.includes('成功') ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}
        >
          {msg}
        </p>
      )}

      <DataSourceCard />
      <ExchangeRateCard
        rate={rate}
        rateInput={rateInput}
        rateSaving={rateSaving}
        rateMsg={rateMsg}
        onInputChange={setRateInput}
        onSave={handleSaveRate}
      />
      <TargetSettingsCard
        v2={v2}
        exchangeRate={exchangeRate}
        recommendation={recommendation}
        onUpdateHard={updateHard}
        onApplyScenario={applyScenario}
      />
      <TargetRecommender />
      <ChannelSettingsCard v2={v2} onUpdateChannel={updateChannel} />
      <EnclosureSettingsCard
        v2={v2}
        open={showEnclosures}
        onToggle={() => setShowEnclosures((v) => !v)}
        onUpdateEnclosure={updateEnclosure}
      />
      <SOPSettingsCard
        v2={v2}
        open={showSOP}
        onToggle={() => setShowSOP((v) => !v)}
        onUpdateSOP={updateSOP}
      />
      <EnclosureRoleCard />
      <CheckinThresholdsCard />
      <IncentiveBudgetCard month={selectedMonth} />
      <IndicatorMatrixCard />
      <BmCalendarCard selectedMonth={selectedMonth} />
    </div>
  );
}
