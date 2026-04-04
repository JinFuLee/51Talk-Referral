'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { Card } from '@/components/ui/Card';
import {
  type CheckinThresholds,
  DEFAULT_THRESHOLDS,
  useCheckinThresholds,
} from '@/lib/hooks/useCheckinThresholds';

const I18N = {
  zh: {
    cardTitle: '打卡率阈值配置',
    desc: '设置打卡率的达标/接近/落后阈值，影响打卡管理页面所有颜色标注。',
    loading: '加载中…',
    goodLabel: '达标阈值',
    goodHint: '≥ 此值显示绿色',
    warningLabel: '接近阈值',
    warningHint: '≥ 此值显示黄色，< 此值显示红色',
    preview: '预览：',
    resetBtn: '重置默认',
    savingBtn: '保存中…',
    savedBtn: '已保存',
    saveBtn: '保存',
  },
  'zh-TW': {
    cardTitle: '打卡率閾值設定',
    desc: '設定打卡率的達標/接近/落後閾值，影響打卡管理頁面所有顏色標註。',
    loading: '載入中…',
    goodLabel: '達標閾值',
    goodHint: '≥ 此值顯示綠色',
    warningLabel: '接近閾值',
    warningHint: '≥ 此值顯示黃色，< 此值顯示紅色',
    preview: '預覽：',
    resetBtn: '重置預設',
    savingBtn: '儲存中…',
    savedBtn: '已儲存',
    saveBtn: '儲存',
  },
  en: {
    cardTitle: 'Check-in Rate Thresholds',
    desc: 'Set good/warning thresholds for check-in rate, affecting all color labels on the check-in page.',
    loading: 'Loading…',
    goodLabel: 'Good Threshold',
    goodHint: '≥ this value shows green',
    warningLabel: 'Warning Threshold',
    warningHint: '≥ this value shows yellow, < shows red',
    preview: 'Preview:',
    resetBtn: 'Reset Default',
    savingBtn: 'Saving…',
    savedBtn: 'Saved',
    saveBtn: 'Save',
  },
  th: {
    cardTitle: 'เกณฑ์อัตราเช็คอิน',
    desc: 'ตั้งเกณฑ์ผ่าน/เตือน/ล้มเหลว สำหรับอัตราเช็คอิน',
    loading: 'กำลังโหลด…',
    goodLabel: 'เกณฑ์ผ่าน',
    goodHint: '≥ ค่านี้แสดงสีเขียว',
    warningLabel: 'เกณฑ์เตือน',
    warningHint: '≥ ค่านี้แสดงสีเหลือง, < แสดงสีแดง',
    preview: 'ตัวอย่าง:',
    resetBtn: 'รีเซ็ตค่าเริ่มต้น',
    savingBtn: 'กำลังบันทึก…',
    savedBtn: 'บันทึกแล้ว',
    saveBtn: 'บันทึก',
  },
};

export default function CheckinThresholdsCard() {
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];
  const { thresholds, update, isLoading } = useCheckinThresholds();
  const [cfg, setCfg] = useState<CheckinThresholds>(DEFAULT_THRESHOLDS);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // 当 SWR 数据加载完成后同步到本地编辑状态
  // 依赖用原始值而非对象引用，避免无限循环
  useEffect(() => {
    if (!isLoading) {
      setCfg({ good: thresholds.good, warning: thresholds.warning });
    }
  }, [isLoading, thresholds.good, thresholds.warning]);

  async function handleSave() {
    // 确保 good > warning > 0
    const good = Math.max(0.01, Math.min(1, cfg.good));
    const warning = Math.max(0, Math.min(good - 0.01, cfg.warning));
    const final = { good, warning };
    setCfg(final);
    setSaving(true);
    try {
      await update(final);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setSaving(true);
    try {
      await update(DEFAULT_THRESHOLDS);
      setCfg(DEFAULT_THRESHOLDS);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title={t.cardTitle}>
      <div className="space-y-4">
        <p className="text-xs text-[var(--text-muted)]">{t.desc}</p>

        {isLoading && (
          <div className="py-2 text-center text-xs text-[var(--text-muted)]">{t.loading}</div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {/* good threshold */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[var(--color-success)]" />
              {t.goodLabel}
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                max={100}
                step={1}
                value={Math.round(cfg.good * 100)}
                onChange={(e) => setCfg((p) => ({ ...p, good: Number(e.target.value) / 100 }))}
                className="w-20 px-2 py-1.5 border border-[var(--border-subtle)] rounded text-sm font-mono tabular-nums bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-action"
              />
              <span className="text-xs text-[var(--text-muted)]">%</span>
            </div>
            <p className="text-[10px] text-[var(--text-muted)]">{t.goodHint}</p>
          </div>

          {/* warning threshold */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[var(--color-warning)]" />
              {t.warningLabel}
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={99}
                step={1}
                value={Math.round(cfg.warning * 100)}
                onChange={(e) => setCfg((p) => ({ ...p, warning: Number(e.target.value) / 100 }))}
                className="w-20 px-2 py-1.5 border border-[var(--border-subtle)] rounded text-sm font-mono tabular-nums bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-action"
              />
              <span className="text-xs text-[var(--text-muted)]">%</span>
            </div>
            <p className="text-[10px] text-[var(--text-muted)]">{t.warningHint}</p>
          </div>
        </div>

        {/* preview */}
        <div className="flex items-center gap-3 text-xs py-2 px-3 bg-[var(--bg-subtle)] rounded">
          <span className="text-[var(--text-muted)]">{t.preview}</span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-success)]" />≥
            {Math.round(cfg.good * 100)}%
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-warning)]" />
            {Math.round(cfg.warning * 100)}–{Math.round(cfg.good * 100)}%
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-danger)]" />
            &lt;{Math.round(cfg.warning * 100)}%
          </span>
        </div>

        {/* 按钮 */}
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={handleReset}
            disabled={saving || isLoading}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-40"
          >
            {t.resetBtn}
          </button>
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
