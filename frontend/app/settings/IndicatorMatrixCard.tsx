'use client';

import { useState, useCallback, useEffect } from 'react';
import { ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useIndicatorMatrix } from '@/lib/hooks/useIndicatorMatrix';
import { indicatorMatrixAPI } from '@/lib/api';
import { useConfigStore } from '@/lib/stores/config-store';
import type { IndicatorCategory } from '@/lib/types/indicator-matrix';
import {
  INDICATOR_CATEGORIES,
  CATEGORY_LABELS_ZH,
  CATEGORY_LABELS_TH,
} from '@/lib/types/indicator-matrix';

function AvailabilityBadge({ availability }: { availability: string }) {
  if (availability === 'available') return null;
  const label = availability === 'pending' ? '数据待接入' : '部分可用';
  return (
    <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--n-100)] text-[var(--text-muted)]">
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
}

function CategorySection({
  category,
  language,
  indicators,
  ssActive,
  lpActive,
  onToggle,
}: CategorySectionProps) {
  const [open, setOpen] = useState(true);
  const catLabel = language === 'th' ? CATEGORY_LABELS_TH[category] : CATEGORY_LABELS_ZH[category];

  if (indicators.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-[var(--n-100)] rounded-md text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--n-200)] transition-colors"
        aria-expanded={open}
      >
        <span>{catLabel}</span>
        <span className="flex items-center gap-1.5">
          <span className="text-[var(--text-muted)]">{indicators.length} 项</span>
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
                className="flex items-center gap-3 px-3 py-2 border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-subtle)] transition-colors"
              >
                {/* 指标名称 */}
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-[var(--text-primary)]">{name}</span>
                  <AvailabilityBadge availability={ind.availability} />
                  {ind.formula && (
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5 font-mono truncate">
                      {ind.formula}
                    </p>
                  )}
                </div>

                {/* CC 列：只读锁定 */}
                <div className="w-12 flex justify-center">
                  <div
                    className="w-4 h-4 flex items-center justify-center rounded bg-[var(--n-100)]"
                    title="CC 列由系统锁定，不可编辑"
                  >
                    <Lock className="w-2.5 h-2.5 text-[var(--text-muted)]" aria-hidden="true" />
                  </div>
                </div>

                {/* SS 列 */}
                <div className="w-12 flex justify-center">
                  <input
                    type="checkbox"
                    checked={ssActive.has(ind.id)}
                    disabled={disabled}
                    onChange={() => !disabled && onToggle('SS', ind.id)}
                    className="w-4 h-4 rounded border-[var(--border-default)] accent-brand-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-brand-500"
                    aria-label={`SS 启用 ${name}`}
                  />
                </div>

                {/* LP 列 */}
                <div className="w-12 flex justify-center">
                  <input
                    type="checkbox"
                    checked={lpActive.has(ind.id)}
                    disabled={disabled}
                    onChange={() => !disabled && onToggle('LP', ind.id)}
                    className="w-4 h-4 rounded border-[var(--border-default)] accent-brand-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-brand-500"
                    aria-label={`LP 启用 ${name}`}
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
  const language = useConfigStore((s) => s.language) as 'zh' | 'th';

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
      setMsg('保存成功');
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : '保存失败');
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
      <Card title="指标矩阵配置">
        <div className="p-6 text-center text-[var(--text-muted)]">
          加载失败：{error.message || '无法连接后端'}
        </div>
      </Card>
    );
  }

  if (!isLoading && registry.length === 0) {
    return (
      <Card title="指标矩阵配置">
        <div className="p-6 text-center text-[var(--text-muted)]">
          指标注册表为空，请检查 config.json 中的 indicator_registry 配置
        </div>
      </Card>
    );
  }

  return (
    <Card title="指标矩阵配置">
      <p className="text-xs text-[var(--text-muted)] mb-3">
        CC 列为系统锁定（全量启用）；SS 和 LP 列可自定义启用的指标范围。
        <span className="ml-2 text-[var(--text-muted)]">availability=pending 的指标灰色禁用。</span>
      </p>

      {isLoading && (
        <div className="py-8 text-center text-sm text-[var(--text-muted)]">加载中…</div>
      )}

      {!isLoading && (
        <>
          {/* 表头 */}
          <div className="flex items-center gap-3 px-3 py-2 bg-[var(--n-800)] rounded-t-md">
            <div className="flex-1 text-xs font-semibold text-white">指标名称</div>
            <div className="w-12 text-center text-xs font-semibold text-white">CC</div>
            <div className="w-12 text-center text-xs font-semibold text-white">SS</div>
            <div className="w-12 text-center text-xs font-semibold text-white">LP</div>
          </div>

          {/* 按 category 渲染分组 */}
          <div className="border border-[var(--border-default)] rounded-b-md divide-y divide-[var(--border-subtle)] overflow-hidden">
            {INDICATOR_CATEGORIES.map((cat) => (
              <CategorySection
                key={cat}
                category={cat}
                language={language}
                indicators={byCategory[cat]}
                ssActive={ssActive}
                lpActive={lpActive}
                onToggle={handleToggle}
              />
            ))}
          </div>

          {/* 操作栏 */}
          <div className="flex items-center justify-between mt-3">
            {msg && (
              <p
                className={`text-xs ${msg.includes('成功') ? 'text-[var(--n-600)]' : 'text-[var(--n-500)]'}`}
              >
                {msg}
              </p>
            )}
            {!msg && <span />}
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                disabled={saving || !matrix}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-40"
              >
                重置
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-1.5 bg-brand-600 text-white rounded-md text-xs font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-brand-500"
              >
                {saving ? '保存中…' : '保存配置'}
              </button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
