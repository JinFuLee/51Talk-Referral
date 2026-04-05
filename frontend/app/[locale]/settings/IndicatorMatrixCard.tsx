'use client';

import { useState, useCallback, useEffect } from 'react';
import { ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useIndicatorMatrix } from '@/lib/hooks/useIndicatorMatrix';
import { indicatorMatrixAPI } from '@/lib/api';
import { useLocale } from 'next-intl';
import type { IndicatorCategory } from '@/lib/types/indicator-matrix';
import {
  INDICATOR_CATEGORIES,
  CATEGORY_LABELS_ZH,
  CATEGORY_LABELS_TH,
} from '@/lib/types/indicator-matrix';

const I18N = {
  zh: {
    cardTitle: '指标矩阵配置',
    cardDesc: 'CC 列为系统锁定（全量启用）；SS 和 LP 列可自定义启用的指标范围。',
    pendingHint: 'availability=pending 的指标灰色禁用。',
    loading: '加载中…',
    loadError: '加载失败：',
    backendError: '无法连接后端',
    emptyRegistry: '指标注册表为空，请检查 config.json 中的 indicator_registry 配置',
    indicatorName: '指标名称',
    itemCount: '项',
    ccLockTitle: 'CC 列由系统锁定，不可编辑',
    saveSuccess: '保存成功',
    saveFailed: '保存失败',
    reset: '重置',
    saving: '保存中…',
    save: '保存配置',
    availPending: '数据待接入',
    availPartial: '部分可用',
  },
  'zh-TW': {
    cardTitle: '指標矩陣設定',
    cardDesc: 'CC 欄為系統鎖定（全量啟用）；SS 和 LP 欄可自訂啟用的指標範圍。',
    pendingHint: 'availability=pending 的指標灰色禁用。',
    loading: '載入中…',
    loadError: '載入失敗：',
    backendError: '無法連線後端',
    emptyRegistry: '指標登錄檔為空，請檢查 config.json 中的 indicator_registry 設定',
    indicatorName: '指標名稱',
    itemCount: '項',
    ccLockTitle: 'CC 欄由系統鎖定，不可編輯',
    saveSuccess: '儲存成功',
    saveFailed: '儲存失敗',
    reset: '重置',
    saving: '儲存中…',
    save: '儲存設定',
    availPending: '資料待接入',
    availPartial: '部分可用',
  },
  en: {
    cardTitle: 'Indicator Matrix',
    cardDesc: 'CC column is system-locked (all enabled); SS and LP columns are customizable.',
    pendingHint: 'Indicators with availability=pending are disabled.',
    loading: 'Loading…',
    loadError: 'Load failed: ',
    backendError: 'Cannot connect to backend',
    emptyRegistry: 'Indicator registry is empty. Check indicator_registry in config.json',
    indicatorName: 'Indicator',
    itemCount: '',
    ccLockTitle: 'CC column is system-locked and cannot be edited',
    saveSuccess: 'Saved successfully',
    saveFailed: 'Save failed',
    reset: 'Reset',
    saving: 'Saving…',
    save: 'Save Config',
    availPending: 'Pending',
    availPartial: 'Partial',
  },
  th: {
    cardTitle: 'เมทริกซ์ตัวชี้วัด',
    cardDesc: 'คอลัมน์ CC ถูกล็อกโดยระบบ (เปิดใช้ทั้งหมด); คอลัมน์ SS และ LP ปรับแต่งได้',
    pendingHint: 'ตัวชี้วัดที่ availability=pending จะถูกปิดใช้งาน',
    loading: 'กำลังโหลด…',
    loadError: 'โหลดล้มเหลว: ',
    backendError: 'ไม่สามารถเชื่อมต่อแบ็กเอนด์',
    emptyRegistry: 'รีจิสทรีตัวชี้วัดว่างเปล่า กรุณาตรวจสอบ indicator_registry ใน config.json',
    indicatorName: 'ตัวชี้วัด',
    itemCount: '',
    ccLockTitle: 'คอลัมน์ CC ถูกล็อกโดยระบบ ไม่สามารถแก้ไขได้',
    saveSuccess: 'บันทึกสำเร็จ',
    saveFailed: 'บันทึกไม่สำเร็จ',
    reset: 'รีเซ็ต',
    saving: 'กำลังบันทึก…',
    save: 'บันทึกการตั้งค่า',
    availPending: 'รอข้อมูล',
    availPartial: 'บางส่วน',
  },
};

function AvailabilityBadge({ availability, t }: { availability: string; t: (typeof I18N)['zh'] }) {
  if (availability === 'available') return null;
  const label = availability === 'pending' ? t.availPending : t.availPartial;
  return (
    <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-n-100 text-muted-token">
      {label}
    </span>
  );
}

interface CategorySectionProps {
  category: IndicatorCategory;
  language: 'zh' | 'th';
  indicators: import('@/lib/types/indicator-matrix').IndicatorDef[];
  ssActive: Set<string>;
  lpActive: Set<string>;
  onToggle: (role: 'SS' | 'LP', id: string) => void;
  t: (typeof I18N)['zh'];
}

function CategorySection({
  category,
  language,
  indicators,
  ssActive,
  lpActive,
  onToggle,
  t,
}: CategorySectionProps) {
  const [open, setOpen] = useState(true);
  const catLabel = language === 'th' ? CATEGORY_LABELS_TH[category] : CATEGORY_LABELS_ZH[category];

  if (indicators.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-n-100 rounded-md text-xs font-semibold text-secondary-token hover:bg-n-200 transition-colors"
        aria-expanded={open}
      >
        <span>{catLabel}</span>
        <span className="flex items-center gap-1.5">
          <span className="text-muted-token">
            {indicators.length}
            {t.itemCount ? ` ${t.itemCount}` : ''}
          </span>
          {open ? (
            <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
          )}
        </span>
      </button>

      {open && (
        <div className="mt-1">
          {indicators.map((ind) => {
            const disabled = ind.availability !== 'available';
            const name = language === 'th' ? ind.name_th : ind.name_zh;
            return (
              <div
                key={ind.id}
                className="flex items-center gap-3 px-3 py-2 border-b border-subtle-token last:border-0 hover:bg-subtle transition-colors"
              >
                {/* 指标名称 */}
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-primary-token">{name}</span>
                  <AvailabilityBadge availability={ind.availability} t={t} />
                  {ind.formula && (
                    <p className="text-[11px] text-muted-token mt-0.5 font-mono truncate">
                      {ind.formula}
                    </p>
                  )}
                </div>

                {/* CC 列：只读锁定 */}
                <div className="w-12 flex justify-center">
                  <div
                    className="w-4 h-4 flex items-center justify-center rounded bg-n-100"
                    title={t.ccLockTitle}
                  >
                    <Lock className="w-2.5 h-2.5 text-muted-token" aria-hidden="true" />
                  </div>
                </div>

                {/* SS 列 */}
                <div className="w-12 flex justify-center">
                  <input
                    type="checkbox"
                    checked={ssActive.has(ind.id)}
                    disabled={disabled}
                    onChange={() => !disabled && onToggle('SS', ind.id)}
                    className="w-4 h-4 rounded border-default-token accent-action cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-action"
                    aria-label={`SS ${name}`}
                  />
                </div>

                {/* LP 列 */}
                <div className="w-12 flex justify-center">
                  <input
                    type="checkbox"
                    checked={lpActive.has(ind.id)}
                    disabled={disabled}
                    onChange={() => !disabled && onToggle('LP', ind.id)}
                    className="w-4 h-4 rounded border-default-token accent-action cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-action"
                    aria-label={`LP ${name}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function IndicatorMatrixCard() {
  const { registry, matrix, mutate, isLoading, error } = useIndicatorMatrix();
  const locale = useLocale();
  const t = (I18N as unknown as Record<string, (typeof I18N)['zh']>)[locale] ?? I18N['zh'];
  const language = (locale === 'th' ? 'th' : 'zh') as 'zh' | 'th';

  // 本地编辑态
  const [ssActive, setSsActive] = useState<Set<string>>(() => new Set());
  const [lpActive, setLpActive] = useState<Set<string>>(() => new Set());
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // 从 SWR 数据初始化本地状态
  useEffect(() => {
    if (matrix) {
      setSsActive(new Set(matrix.SS.active));
      setLpActive(new Set(matrix.LP.active));
    }
  }, [matrix]);

  const handleToggle = useCallback((role: 'SS' | 'LP', id: string) => {
    if (role === 'SS') {
      setSsActive((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    } else {
      setLpActive((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }
    setMsg(null);
  }, []);

  async function handleSave() {
    setSaving(true);
    setMsg(null);
    try {
      await Promise.all([
        indicatorMatrixAPI.putMatrix('SS', Array.from(ssActive)),
        indicatorMatrixAPI.putMatrix('LP', Array.from(lpActive)),
      ]);
      await mutate();
      setMsg(t.saveSuccess);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : t.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    if (!matrix) return;
    setSsActive(new Set(matrix.SS.active));
    setLpActive(new Set(matrix.LP.active));
    setMsg(null);
  }

  // 按 category 分组
  const byCategory = INDICATOR_CATEGORIES.reduce<Record<IndicatorCategory, typeof registry>>(
    (acc, cat) => {
      acc[cat] = registry.filter((ind) => ind.category === cat);
      return acc;
    },
    {} as Record<IndicatorCategory, typeof registry>
  );

  if (error) {
    return (
      <Card title={t.cardTitle}>
        <div className="p-6 text-center text-muted-token">
          {t.loadError}
          {error.message || t.backendError}
        </div>
      </Card>
    );
  }

  if (!isLoading && registry.length === 0) {
    return (
      <Card title={t.cardTitle}>
        <div className="p-6 text-center text-muted-token">{t.emptyRegistry}</div>
      </Card>
    );
  }

  return (
    <Card title={t.cardTitle}>
      <p className="text-xs text-muted-token mb-3">
        {t.cardDesc}
        <span className="ml-2 text-muted-token">{t.pendingHint}</span>
      </p>

      {isLoading && <div className="py-8 text-center text-sm text-muted-token">{t.loading}</div>}

      {!isLoading && (
        <>
          {/* 表头 */}
          <div className="flex items-center gap-3 px-3 py-2 bg-n-800 rounded-t-md">
            <div className="flex-1 text-xs font-semibold text-white">{t.indicatorName}</div>
            <div className="w-12 text-center text-xs font-semibold text-white">CC</div>
            <div className="w-12 text-center text-xs font-semibold text-white">SS</div>
            <div className="w-12 text-center text-xs font-semibold text-white">LP</div>
          </div>

          {/* 按 category 渲染分组 */}
          <div className="border border-default-token rounded-b-md divide-y divide-[var(--border-subtle)] overflow-hidden">
            {INDICATOR_CATEGORIES.map((cat) => (
              <CategorySection
                key={cat}
                category={cat}
                language={language}
                indicators={byCategory[cat]}
                ssActive={ssActive}
                lpActive={lpActive}
                onToggle={handleToggle}
                t={t}
              />
            ))}
          </div>

          {/* 操作栏 */}
          <div className="flex items-center justify-between mt-3">
            {msg && (
              <p className={`text-xs ${msg === t.saveSuccess ? 'text-n-600' : 'text-n-500'}`}>
                {msg}
              </p>
            )}
            {!msg && <span />}
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                disabled={saving || !matrix}
                className="text-xs text-secondary-token hover:text-primary-token transition-colors disabled:opacity-40"
              >
                {t.reset}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-1.5 bg-action text-white rounded-md text-xs font-medium hover:bg-action-active disabled:opacity-50 transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-action"
              >
                {saving ? t.saving : t.save}
              </button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
