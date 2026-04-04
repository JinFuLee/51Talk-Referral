'use client';

import React, { useState } from 'react';
import { useLocale } from 'next-intl';
import { clsx } from 'clsx';
import { useRouter } from '@/i18n/navigation';
import { Users, TrendingUp, Handshake, Play, Clock, ArrowLeft } from 'lucide-react';
import { usePresentationStore } from '@/lib/stores/presentation-store';
import { BrandMark } from '@/components/ui/BrandMark';
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
    icon: <TrendingUp className="w-7 h-7" />,
    allowedTimeframes: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
  },
  {
    id: 'ops-director',
    icon: <Users className="w-7 h-7" />,
    allowedTimeframes: ['daily', 'weekly', 'monthly'],
  },
  {
    id: 'crosscheck',
    icon: <Handshake className="w-7 h-7" />,
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
    <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-[#050505] via-[#0a0a0a] to-[#0f0f0f]">
      {/* ── 暗色品牌氛围背景 ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-20 right-1/4 w-[500px] h-[500px] rounded-full animate-auth-float"
          style={{
            background: 'radial-gradient(circle, rgba(255,209,0,0.06) 0%, transparent 60%)',
          }}
        />
        <div
          className="absolute bottom-0 -left-20 w-[400px] h-[400px] rounded-full animate-auth-float-reverse"
          style={{
            background: 'radial-gradient(circle, rgba(27,54,93,0.05) 0%, transparent 60%)',
          }}
        />
        {/* grain 纹理 */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundSize: '200px',
          }}
        />
      </div>

      {/* ── 返回按钮 — 左上角 ── */}
      <button
        type="button"
        onClick={() => router.push('/')}
        className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 rounded-xl backdrop-blur-xl bg-white/8 border border-white/10 text-white/50 text-sm font-medium transition-all duration-200 hover:bg-white/15 hover:text-white/80"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{locale === 'en' ? 'Back' : locale === 'th' ? 'กลับ' : '返回'}</span>
      </button>

      <div
        className="relative z-10 flex flex-col gap-10 max-w-4xl w-full mx-auto py-8 animate-slide-up"
        style={{ animationFillMode: 'both' }}
      >
        {/* ── 品牌标题 ── */}
        <div className="text-center animate-fade-in">
          <BrandMark size={40} className="text-[var(--brand-p1)] mx-auto mb-4 animate-pulse-soft" />
          <h1 className="font-display text-3xl font-bold text-[#f5f5f5] tracking-tight">
            {t.selectScene}
          </h1>
        </div>

        {/* ── 场景选择 ── */}
        <div className="grid grid-cols-3 gap-5">
          {SCENES.map((scene, i) => {
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
                  'group flex flex-col items-start gap-4 rounded-2xl border-2 p-7 text-left transition-all duration-300 animate-slide-up',
                  isSelected
                    ? 'border-[var(--brand-p1)] bg-[var(--brand-p1)]/5 shadow-lg shadow-[var(--brand-p1)]/10'
                    : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
                )}
                style={{ animationDelay: `${0.1 + i * 0.08}s`, animationFillMode: 'both' }}
              >
                <div
                  className={clsx(
                    'rounded-xl p-3.5 transition-all duration-300',
                    isSelected
                      ? 'bg-[var(--brand-p1)] text-[var(--brand-p2)]'
                      : 'bg-white/5 text-white/40 group-hover:bg-white/10'
                  )}
                >
                  {scene.icon}
                </div>
                <div>
                  <p
                    className={clsx(
                      'text-lg font-bold font-display transition-colors',
                      isSelected ? 'text-[var(--brand-p1)]' : 'text-[#f5f5f5]'
                    )}
                  >
                    {sceneLabel.title}
                  </p>
                  <p className="text-sm text-white/40 mt-1.5 leading-relaxed">
                    {sceneLabel.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── 时间维度选择（场景选定后滑入） ── */}
        {selectedScene && (
          <div className="animate-slide-up" style={{ animationFillMode: 'both' }}>
            <p className="text-xs font-bold text-white/30 uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {t.selectTimeframe}
            </p>
            <div className="flex gap-3">
              {TIMEFRAMES.map((tf, i) => {
                const allowed = allowedTimeframes.includes(tf.id);
                const isSelected = selectedTimeframe === tf.id;
                const tfLabel = t.timeframes[tf.id] ?? { label: tf.id, sublabel: '' };
                return (
                  <button
                    key={tf.id}
                    onClick={() => allowed && setSelectedTimeframe(tf.id)}
                    disabled={!allowed}
                    className={clsx(
                      'flex flex-col items-center gap-1.5 px-6 py-3.5 rounded-xl border-2 transition-all duration-200 animate-slide-up',
                      !allowed && 'opacity-25 cursor-not-allowed',
                      isSelected
                        ? 'border-[var(--brand-p1)] bg-[var(--brand-p1)]/5 shadow-sm'
                        : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                    )}
                    style={{ animationDelay: `${i * 0.05}s`, animationFillMode: 'both' }}
                  >
                    <span
                      className={clsx(
                        'text-base font-bold font-display',
                        isSelected ? 'text-[var(--brand-p1)]' : 'text-[#f5f5f5]'
                      )}
                    >
                      {tfLabel.label}
                    </span>
                    <span className="text-xs text-white/30">{tfLabel.sublabel}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 开始按钮 ── */}
        <div className="flex justify-center pt-2">
          <button
            onClick={handleStart}
            disabled={!selectedScene || !selectedTimeframe}
            className={clsx(
              'auth-btn max-w-xs shadow-[0_0_30px_rgba(255,209,0,0.15)]',
              !(selectedScene && selectedTimeframe) &&
                'opacity-30 cursor-not-allowed hover:transform-none hover:shadow-none'
            )}
          >
            <Play className="w-5 h-5" />
            {t.startBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
