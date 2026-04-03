'use client';

import React, { useState } from 'react';
import { useLocale } from 'next-intl';
import { clsx } from 'clsx';
import { useRouter } from '@/i18n/navigation';
import { Users, TrendingUp, Handshake, Play, Clock } from 'lucide-react';
import { usePresentationStore } from '@/lib/stores/presentation-store';
import type { Audience, Timeframe } from '@/lib/presentation/types';

/* ── I18N ────────────────────────────────────────────────────────── */

const I18N = {
  zh: {
    selectScene: '选择汇报场景',
    selectTimeframe: '选择时间维度',
    startBtn: '开始汇报',
    scenes: {
      gm: { title: 'GM 汇报', description: '面向总经理的战略级汇报，聚焦核心 KPI 与业务趋势' },
      'ops-director': {
        title: '运营总监汇报',
        description: '运营层面深度分析，含漏斗拆解、CC 排名与行动追踪',
      },
      crosscheck: {
        title: '对等会议',
        description: '运营与业务双方对等协商，承诺追踪与联合行动',
      },
    } as Record<string, { title: string; description: string }>,
    timeframes: {
      daily: { label: '日报', sublabel: 'T-1 数据' },
      weekly: { label: '周报', sublabel: 'WoW 对比' },
      monthly: { label: '月报', sublabel: 'MoM 对比' },
      quarterly: { label: '季报', sublabel: 'QoQ 对比' },
      yearly: { label: '年报', sublabel: 'YoY 对比' },
    } as Record<string, { label: string; sublabel: string }>,
  },
  'zh-TW': {
    selectScene: '選擇匯報場景',
    selectTimeframe: '選擇時間維度',
    startBtn: '開始匯報',
    scenes: {
      gm: { title: 'GM 匯報', description: '面向總經理的戰略級匯報，聚焦核心 KPI 與業務趨勢' },
      'ops-director': {
        title: '營運總監匯報',
        description: '營運層面深度分析，含漏斗拆解、CC 排名與行動追蹤',
      },
      crosscheck: {
        title: '對等會議',
        description: '營運與業務雙方對等協商，承諾追蹤與聯合行動',
      },
    } as Record<string, { title: string; description: string }>,
    timeframes: {
      daily: { label: '日報', sublabel: 'T-1 資料' },
      weekly: { label: '週報', sublabel: 'WoW 對比' },
      monthly: { label: '月報', sublabel: 'MoM 對比' },
      quarterly: { label: '季報', sublabel: 'QoQ 對比' },
      yearly: { label: '年報', sublabel: 'YoY 對比' },
    } as Record<string, { label: string; sublabel: string }>,
  },
  en: {
    selectScene: 'Select Presentation Scene',
    selectTimeframe: 'Select Timeframe',
    startBtn: 'Start Presentation',
    scenes: {
      gm: {
        title: 'GM Report',
        description:
          'Strategic-level briefing for the GM, focusing on core KPIs and business trends',
      },
      'ops-director': {
        title: 'Ops Director Report',
        description:
          'Deep operational analysis including funnel breakdown, CC rankings and action tracking',
      },
      crosscheck: {
        title: 'Peer Review Meeting',
        description: 'Joint ops-business discussion with commitment tracking and co-actions',
      },
    } as Record<string, { title: string; description: string }>,
    timeframes: {
      daily: { label: 'Daily', sublabel: 'T-1 data' },
      weekly: { label: 'Weekly', sublabel: 'WoW compare' },
      monthly: { label: 'Monthly', sublabel: 'MoM compare' },
      quarterly: { label: 'Quarterly', sublabel: 'QoQ compare' },
      yearly: { label: 'Yearly', sublabel: 'YoY compare' },
    } as Record<string, { label: string; sublabel: string }>,
  },
  th: {
    selectScene: 'เลือกรูปแบบการนำเสนอ',
    selectTimeframe: 'เลือกช่วงเวลา',
    startBtn: 'เริ่มนำเสนอ',
    scenes: {
      gm: {
        title: 'รายงาน GM',
        description: 'การรายงานระดับกลยุทธ์ต่อ GM มุ่งเน้น KPI หลักและแนวโน้มธุรกิจ',
      },
      'ops-director': {
        title: 'รายงานผู้อำนวยการฝ่ายปฏิบัติการ',
        description:
          'การวิเคราะห์เชิงลึกระดับปฏิบัติการ รวมถึงการแยกวิเคราะห์ funnel และการติดตาม CC',
      },
      crosscheck: {
        title: 'การประชุมเพื่อนร่วมงาน',
        description:
          'การปรึกษาหารือร่วมกันระหว่างฝ่ายปฏิบัติการและธุรกิจ ติดตามคำมั่นสัญญาและการดำเนินการร่วม',
      },
    } as Record<string, { title: string; description: string }>,
    timeframes: {
      daily: { label: 'รายวัน', sublabel: 'ข้อมูล T-1' },
      weekly: { label: 'รายสัปดาห์', sublabel: 'เปรียบ WoW' },
      monthly: { label: 'รายเดือน', sublabel: 'เปรียบ MoM' },
      quarterly: { label: 'รายไตรมาส', sublabel: 'เปรียบ QoQ' },
      yearly: { label: 'รายปี', sublabel: 'เปรียบ YoY' },
    } as Record<string, { label: string; sublabel: string }>,
  },
} as const;

type Locale = keyof typeof I18N;

interface SceneConfig {
  id: Audience;
  icon: React.ReactNode;
  allowedTimeframes: Timeframe[];
}

interface TimeframeConfig {
  id: Timeframe;
}

const SCENES: SceneConfig[] = [
  {
    id: 'gm',
    icon: <TrendingUp className="w-8 h-8" />,
    allowedTimeframes: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
  },
  {
    id: 'ops-director',
    icon: <Users className="w-8 h-8" />,
    allowedTimeframes: ['daily', 'weekly', 'monthly'],
  },
  {
    id: 'crosscheck',
    icon: <Handshake className="w-8 h-8" />,
    allowedTimeframes: ['weekly', 'monthly', 'quarterly'],
  },
];

const TIMEFRAMES: TimeframeConfig[] = [
  { id: 'daily' },
  { id: 'weekly' },
  { id: 'monthly' },
  { id: 'quarterly' },
  { id: 'yearly' },
];

export function PresentationLauncher() {
  const locale = useLocale() as Locale;
  const t = I18N[locale] ?? I18N.zh;

  const router = useRouter();
  const { togglePresentationMode } = usePresentationStore();

  const [selectedScene, setSelectedScene] = useState<Audience | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe | null>(null);

  const activeScene = SCENES.find((s) => s.id === selectedScene);
  const allowedTimeframes = activeScene?.allowedTimeframes ?? [];

  function handleStart() {
    if (!selectedScene || !selectedTimeframe) return;
    togglePresentationMode();
    router.push(`/present/${selectedScene}/${selectedTimeframe}`);
  }

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto py-8">
      {/* Scene selection */}
      <div>
        <p className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-widest mb-4">
          {t.selectScene}
        </p>
        <div className="grid grid-cols-3 gap-4">
          {SCENES.map((scene) => {
            const isSelected = selectedScene === scene.id;
            const sceneLabel = t.scenes[scene.id] ?? { title: scene.id, description: '' };
            return (
              <button
                key={scene.id}
                onClick={() => {
                  setSelectedScene(scene.id);
                  setSelectedTimeframe(null);
                }}
                className={clsx(
                  'flex flex-col items-start gap-3 rounded-[var(--radius-xl)] border-2 p-6 text-left transition-all duration-200',
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-hover)] hover:shadow-sm'
                )}
              >
                <div
                  className={clsx(
                    'rounded-xl p-3',
                    isSelected
                      ? 'bg-primary text-white'
                      : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                  )}
                >
                  {scene.icon}
                </div>
                <div>
                  <p
                    className={clsx(
                      'text-lg font-bold',
                      isSelected ? 'text-primary' : 'text-[var(--text-primary)]'
                    )}
                  >
                    {sceneLabel.title}
                  </p>
                  <p className="text-sm text-[var(--text-secondary)] mt-1 leading-snug">
                    {sceneLabel.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Timeframe selection (only shown after scene selected) */}
      {selectedScene && (
        <div style={{ animation: 'fadeInUp 0.3s ease forwards' }}>
          <style>{`
            @keyframes fadeInUp {
              from { opacity: 0; transform: translateY(8px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          <p className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-widest mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {t.selectTimeframe}
          </p>
          <div className="flex gap-3">
            {TIMEFRAMES.map((tf) => {
              const allowed = allowedTimeframes.includes(tf.id);
              const isSelected = selectedTimeframe === tf.id;
              const tfLabel = t.timeframes[tf.id] ?? { label: tf.id, sublabel: '' };
              return (
                <button
                  key={tf.id}
                  onClick={() => allowed && setSelectedTimeframe(tf.id)}
                  disabled={!allowed}
                  className={clsx(
                    'flex flex-col items-center gap-1 px-5 py-3 rounded-xl border-2 transition-all duration-200',
                    !allowed && 'opacity-30 cursor-not-allowed',
                    isSelected
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-hover)] text-[var(--text-primary)]'
                  )}
                >
                  <span className="text-base font-bold">{tfLabel.label}</span>
                  <span className="text-xs text-[var(--text-muted)]">{tfLabel.sublabel}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Start button */}
      <div className="flex justify-end">
        <button
          onClick={handleStart}
          disabled={!selectedScene || !selectedTimeframe}
          className={clsx(
            'flex items-center gap-3 px-8 py-4 rounded-[var(--radius-xl)] text-lg font-bold transition-all duration-200',
            selectedScene && selectedTimeframe
              ? 'bg-primary text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5'
              : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] cursor-not-allowed'
          )}
        >
          <Play className="w-5 h-5" />
          {t.startBtn}
        </button>
      </div>
    </div>
  );
}
