'use client';

import { useState, useMemo, useEffect } from 'react';
import { LayoutGrid, Download } from 'lucide-react';
import { usePageDimensions } from '@/lib/hooks/use-page-dimensions';
import { PageHeader } from '@/components/ui/PageHeader';
import { BIZ_PAGE } from '@/lib/layout';
import { useIndicatorMatrix } from '@/lib/hooks/useIndicatorMatrix';
import { indicatorMatrixAPI } from '@/lib/api';
import { useLocale, useTranslations } from 'next-intl';
import type { IndicatorCategory, IndicatorAvailability } from '@/lib/types/indicator-matrix';
import {
  INDICATOR_CATEGORIES,
  CATEGORY_LABELS_ZH,
  CATEGORY_LABELS_TH,
} from '@/lib/types/indicator-matrix';
import { translateFormula } from '@/lib/utils';

export default function IndicatorMatrixPage() {
  usePageDimensions({});
  const { registry, matrix, mutate, isLoading, error } = useIndicatorMatrix();
  const locale = useLocale();
  const t = useTranslations('indicatorMatrix');
  const language = (locale === 'th' ? 'th' : 'zh') as 'zh' | 'th';

  const [filterCategory, setFilterCategory] = useState<IndicatorCategory | 'all'>('all');
  const [filterRole, setFilterRole] = useState<'all' | 'CC' | 'SS' | 'LP'>('all');
  const [filterAvailability, setFilterAvailability] = useState<IndicatorAvailability | 'all'>(
    'all'
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // 本地编辑态（SS/LP 可编辑）
  const [ssActive, setSsActive] = useState<Set<string>>(() => new Set());
  const [lpActive, setLpActive] = useState<Set<string>>(() => new Set());

  // 从 SWR 数据初始化本地状态
  useEffect(() => {
    if (matrix) {
      setSsActive(new Set(matrix.SS.active));
      setLpActive(new Set(matrix.LP.active));
    }
  }, [matrix]);

  // CC active set — CC 是 readonly，全量视为 active
  const ccActive = useMemo(() => new Set(registry.map((i) => i.id)), [registry]);

  // 过滤逻辑
  const filtered = useMemo(() => {
    return registry.filter((ind) => {
      if (filterCategory !== 'all' && ind.category !== filterCategory) return false;
      if (filterAvailability !== 'all' && ind.availability !== filterAvailability) return false;
      if (filterRole !== 'all') {
        if (filterRole === 'CC' && !ccActive.has(ind.id)) return false;
        if (filterRole === 'SS' && !ssActive.has(ind.id)) return false;
        if (filterRole === 'LP' && !lpActive.has(ind.id)) return false;
      }
      return true;
    });
  }, [registry, filterCategory, filterRole, filterAvailability, ccActive, ssActive, lpActive]);

  // 差异高亮：CC 有但 SS/LP 没有
  const ccOnlyIds = useMemo(() => {
    return new Set(Array.from(ccActive).filter((id) => !ssActive.has(id) && !lpActive.has(id)));
  }, [ccActive, ssActive, lpActive]);

  function toggleSS(id: string) {
    setSsActive((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setMsg(null);
  }

  function toggleLP(id: string) {
    setLpActive((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setMsg(null);
  }

  async function handleSave() {
    setSaving(true);
    setMsg(null);
    try {
      await Promise.all([
        indicatorMatrixAPI.putMatrix('SS', Array.from(ssActive)),
        indicatorMatrixAPI.putMatrix('LP', Array.from(lpActive)),
      ]);
      await mutate();
      setMsg(t('saveSuccess'));
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : t('saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  function handleExportCSV() {
    const rawH = t.raw('csvHeaders');
    const headers: string[] = Array.isArray(rawH) ? rawH : [];
    const rows = registry.map((ind) => [
      ind.id,
      ind.name_zh,
      ind.name_th,
      language === 'th' ? CATEGORY_LABELS_TH[ind.category] : CATEGORY_LABELS_ZH[ind.category],
      ind.unit,
      ccActive.has(ind.id) ? t('csvYes') : t('csvNo'),
      ssActive.has(ind.id) ? t('csvYes') : t('csvNo'),
      lpActive.has(ind.id) ? t('csvYes') : t('csvNo'),
      availabilityLabel(ind.availability),
      ind.data_source,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'indicator-matrix.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // 统计摘要
  const stats = useMemo(
    () => ({
      cc: ccActive.size,
      ss: ssActive.size,
      lp: lpActive.size,
      pending: registry.filter((i) => i.availability === 'pending').length,
      total: registry.length,
    }),
    [registry, ccActive, ssActive, lpActive]
  );

  // 按 category 分组（过滤后）
  const byCatFiltered = useMemo(() => {
    const map: Partial<Record<IndicatorCategory, typeof filtered>> = {};
    for (const cat of INDICATOR_CATEGORIES) {
      const items = filtered.filter((i) => i.category === cat);
      if (items.length > 0) map[cat] = items;
    }
    return map;
  }, [filtered]);

  function availabilityLabel(a: IndicatorAvailability) {
    if (a === 'available') return t('availableLabel');
    if (a === 'partial') return t('partialLabel');
    return t('pendingLabel');
  }

  if (error) {
    return (
      <div className={BIZ_PAGE}>
        <PageHeader title={t('pageTitle')} subtitle={t('pageSubtitle')} icon={LayoutGrid} />
        <div className="py-12 flex flex-col items-center gap-3 text-muted-token">
          <p className="text-sm">
            {t('loadFailed')}
            {error.message || t('noBackend')}
          </p>
          <button
            onClick={() => mutate()}
            className="px-4 py-1.5 rounded-lg text-xs font-medium bg-subtle border border-default-token text-secondary-token hover:bg-n-200 transition-colors"
          >
            {t('retry')}
          </button>
        </div>
      </div>
    );
  }

  if (!isLoading && registry.length === 0) {
    return (
      <div className={BIZ_PAGE}>
        <PageHeader title={t('pageTitle')} subtitle={t('pageSubtitle')} icon={LayoutGrid} />
        <div className="py-12 text-center text-muted-token">{t('emptyRegistry')}</div>
      </div>
    );
  }

  return (
    <div className={BIZ_PAGE}>
      <PageHeader title={t('pageTitle')} subtitle={t('pageSubtitle')} icon={LayoutGrid}>
        <button
          onClick={handleExportCSV}
          disabled={registry.length === 0}
          className="flex items-center gap-1.5 px-3 py-2 border border-default-token rounded-lg text-sm text-secondary-token hover:bg-subtle disabled:opacity-40 transition-colors"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          {t('exportCsv')}
        </button>
        <button
          onClick={handleSave}
          disabled={saving || isLoading}
          className="px-4 py-2 bg-action text-white rounded-lg text-sm font-medium hover:bg-action-active disabled:opacity-50 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-action"
        >
          {saving ? t('saving') : t('saveConfig')}
        </button>
      </PageHeader>

      {msg && (
        <p className={`text-sm ${msg === t('saveSuccess') ? 'text-n-600' : 'text-n-500'}`}>{msg}</p>
      )}

      {/* 筛选栏 */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-surface border border-default-token rounded-lg">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as IndicatorCategory | 'all')}
          className="px-3 py-1.5 border border-default-token rounded-md text-sm bg-surface text-primary-token focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
        >
          <option value="all">{t('filterAllCategory')}</option>
          {INDICATOR_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {language === 'th' ? CATEGORY_LABELS_TH[cat] : CATEGORY_LABELS_ZH[cat]}
            </option>
          ))}
        </select>

        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value as typeof filterRole)}
          className="px-3 py-1.5 border border-default-token rounded-md text-sm bg-surface text-primary-token focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
        >
          <option value="all">{t('filterAllRole')}</option>
          <option value="CC">CC</option>
          <option value="SS">SS</option>
          <option value="LP">LP</option>
        </select>

        <select
          value={filterAvailability}
          onChange={(e) => setFilterAvailability(e.target.value as IndicatorAvailability | 'all')}
          className="px-3 py-1.5 border border-default-token rounded-md text-sm bg-surface text-primary-token focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
        >
          <option value="all">{t('filterAllStatus')}</option>
          <option value="available">{t('availableLabel')}</option>
          <option value="partial">{t('partialLabel')}</option>
          <option value="pending">{t('pendingLabel')}</option>
        </select>

        <span className="ml-auto text-xs text-muted-token">
          {t('showing')} {filtered.length} {t('of')} {registry.length} {t('items')}
        </span>
      </div>

      {isLoading && (
        <div className="py-12 text-center text-sm text-muted-token">{t('loading')}</div>
      )}

      {!isLoading && (
        <>
          {/* 矩阵表格 */}
          <div className="bg-surface border border-default-token rounded-lg overflow-hidden">
            {/* 表头 */}
            <div className="flex items-center gap-3 px-4 py-2.5 bg-n-800">
              <div className="flex-1 text-xs font-semibold text-white">{t('colName')}</div>
              <div className="w-14 text-center text-xs font-semibold text-white">CC</div>
              <div className="w-14 text-center text-xs font-semibold text-white">SS</div>
              <div className="w-14 text-center text-xs font-semibold text-white">LP</div>
              <div className="w-20 text-center text-xs font-semibold text-white">
                {t('colStatus')}
              </div>
            </div>

            {/* 分类分组 */}
            {Object.keys(byCatFiltered).length === 0 && (
              <div className="py-8 text-center text-sm text-muted-token">{t('noMatch')}</div>
            )}

            {INDICATOR_CATEGORIES.map((cat) => {
              const items = byCatFiltered[cat];
              if (!items || items.length === 0) return null;
              const catLabel =
                language === 'th' ? CATEGORY_LABELS_TH[cat] : CATEGORY_LABELS_ZH[cat];
              return (
                <div key={cat}>
                  {/* Category header */}
                  <div className="px-4 py-1.5 bg-n-100 border-b border-subtle-token">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-token">
                      {catLabel}
                    </span>
                    <span className="ml-2 text-[11px] text-muted-token">({items.length})</span>
                  </div>
                  {/* Rows */}
                  {items.map((ind) => {
                    const name = language === 'th' ? ind.name_th : ind.name_zh;
                    const isCCOnly = ccOnlyIds.has(ind.id);
                    const disabled = ind.availability !== 'available';
                    return (
                      <div
                        key={ind.id}
                        className={`flex items-center gap-3 px-4 py-2.5 border-b border-subtle-token last:border-0 hover:bg-subtle transition-colors ${
                          isCCOnly ? 'bg-n-100' : ''
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-primary-token">{name}</span>
                          {isCCOnly && (
                            <span className="ml-1.5 text-[10px] text-n-500 font-medium">
                              {t('ccOnly')}
                            </span>
                          )}
                          {ind.formula && (
                            <p className="text-[11px] text-muted-token mt-0.5 font-mono truncate">
                              {translateFormula(ind.formula, locale)}
                            </p>
                          )}
                        </div>

                        {/* CC — 系统锁定全量 */}
                        <div className="w-14 flex justify-center">
                          <div className="w-4 h-4 rounded border-2 border-action bg-action-surface flex items-center justify-center">
                            <div className="w-2 h-2 rounded-sm bg-action" />
                          </div>
                        </div>

                        {/* SS */}
                        <div className="w-14 flex justify-center">
                          <input
                            type="checkbox"
                            checked={ssActive.has(ind.id)}
                            disabled={disabled}
                            onChange={() => !disabled && toggleSS(ind.id)}
                            className="w-4 h-4 rounded border-default-token accent-action cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-action"
                            aria-label={`SS ${name}`}
                          />
                        </div>

                        {/* LP */}
                        <div className="w-14 flex justify-center">
                          <input
                            type="checkbox"
                            checked={lpActive.has(ind.id)}
                            disabled={disabled}
                            onChange={() => !disabled && toggleLP(ind.id)}
                            className="w-4 h-4 rounded border-default-token accent-action cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-action"
                            aria-label={`LP ${name}`}
                          />
                        </div>

                        {/* 状态 */}
                        <div className="w-20 flex justify-center">
                          <span
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                              ind.availability === 'available'
                                ? 'bg-n-100 text-n-600'
                                : ind.availability === 'partial'
                                  ? 'bg-n-200 text-n-700'
                                  : 'bg-n-100 text-muted-token'
                            }`}
                          >
                            {availabilityLabel(ind.availability)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* 统计摘要栏 */}
          <div className="flex flex-wrap items-center gap-4 p-3 bg-surface border border-default-token rounded-lg text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-token">CC</span>
              <span className="font-semibold text-primary-token">
                {stats.cc} {t('items')}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-token">SS</span>
              <span className="font-semibold text-primary-token">
                {stats.ss} {t('items')}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-token">LP</span>
              <span className="font-semibold text-primary-token">
                {stats.lp} {t('items')}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-token">{t('statsPending')}</span>
              <span className="font-semibold text-orange-600">
                {stats.pending} {t('items')}
              </span>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="text-muted-token">{t('statsTotal')}</span>
              <span className="font-semibold text-primary-token">
                {stats.total} {t('items')}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
