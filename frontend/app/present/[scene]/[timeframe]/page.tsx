"use client";

import { useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { usePresentationStore } from '@/lib/stores/presentation-store';
import { getSceneConfig } from '@/lib/presentation/scenes';
import { usePresentation } from '@/lib/hooks/usePresentation';
import { SlideShell } from '@/components/presentation/SlideShell';
import { SlideProgressBar } from '@/components/presentation/SlideProgressBar';
import type { Audience, Timeframe } from '@/lib/presentation/types';

const ExecutiveSummarySlide = dynamic(() => import('@/components/presentation/ExecutiveSummarySlide').then(m => ({ default: m.ExecutiveSummarySlide })), { ssr: false });
const SummarySlide = dynamic(() => import('@/components/presentation/SummarySlide').then(m => ({ default: m.SummarySlide })), { ssr: false });
const JointActionCard = dynamic(() => import('@/components/presentation/JointActionCard').then(m => ({ default: m.JointActionCard })), { ssr: false });
const FunnelOwnershipChart = dynamic(() => import('@/components/presentation/FunnelOwnershipChart').then(m => ({ default: m.FunnelOwnershipChart })), { ssr: false });
const ActionItemTracker = dynamic(() => import('@/components/presentation/ActionItemTracker').then(m => ({ default: m.ActionItemTracker })), { ssr: false });
const RevenueSlide = dynamic(() => import('@/components/presentation/RevenueSlide').then(m => ({ default: m.RevenueSlide })), { ssr: false });
const FunnelSlide = dynamic(() => import('@/components/presentation/FunnelSlide').then(m => ({ default: m.FunnelSlide })), { ssr: false });
const RiskRadarSlide = dynamic(() => import('@/components/presentation/RiskRadarSlide').then(m => ({ default: m.RiskRadarSlide })), { ssr: false });
const TeamSlide = dynamic(() => import('@/components/presentation/TeamSlide').then(m => ({ default: m.TeamSlide })), { ssr: false });
const TrendSlide = dynamic(() => import('@/components/presentation/TrendSlide').then(m => ({ default: m.TrendSlide })), { ssr: false });
const CohortSlide = dynamic(() => import('@/components/presentation/CohortSlide').then(m => ({ default: m.CohortSlide })), { ssr: false });
const StageSlide = dynamic(() => import('@/components/presentation/StageSlide').then(m => ({ default: m.StageSlide })), { ssr: false });
const ComparisonSlide = dynamic(() => import('@/components/presentation/ComparisonSlide').then(m => ({ default: m.ComparisonSlide })), { ssr: false });
const OutreachSlide = dynamic(() => import('@/components/presentation/OutreachSlide').then(m => ({ default: m.OutreachSlide })), { ssr: false });
const TrialSlide = dynamic(() => import('@/components/presentation/TrialSlide').then(m => ({ default: m.TrialSlide })), { ssr: false });
const ChannelSlide = dynamic(() => import('@/components/presentation/ChannelSlide').then(m => ({ default: m.ChannelSlide })), { ssr: false });
const FollowupAlertSlide = dynamic(() => import('@/components/presentation/FollowupAlertSlide').then(m => ({ default: m.FollowupAlertSlide })), { ssr: false });
const KPINorthStarSlide = dynamic(() => import('@/components/presentation/KPINorthStarSlide').then(m => ({ default: m.KPINorthStarSlide })), { ssr: false });
const OutreachGapSlide = dynamic(() => import('@/components/presentation/OutreachGapSlide').then(m => ({ default: m.OutreachGapSlide })), { ssr: false });
const ActionPlanSlide = dynamic(() => import('@/components/presentation/ActionPlanSlide').then(m => ({ default: m.ActionPlanSlide })), { ssr: false });
const ImpactSlide = dynamic(() => import('@/components/presentation/ImpactSlide').then(m => ({ default: m.ImpactSlide })), { ssr: false });
const SharedMetricsSlide = dynamic(() => import('@/components/presentation/SharedMetricsSlide').then(m => ({ default: m.SharedMetricsSlide })), { ssr: false });
const LeadsHandoffSlide = dynamic(() => import('@/components/presentation/LeadsHandoffSlide').then(m => ({ default: m.LeadsHandoffSlide })), { ssr: false });
const ConversionSlide = dynamic(() => import('@/components/presentation/ConversionSlide').then(m => ({ default: m.ConversionSlide })), { ssr: false });
const ImpactAttributionSlide = dynamic(() => import('@/components/presentation/ImpactAttributionSlide').then(m => ({ default: m.ImpactAttributionSlide })), { ssr: false });
const WhatIfSlide = dynamic(() => import('@/components/presentation/WhatIfSlide').then(m => ({ default: m.WhatIfSlide })), { ssr: false });
const MeetingSummarySlide = dynamic(() => import('@/components/presentation/MeetingSummarySlide').then(m => ({ default: m.MeetingSummarySlide })), { ssr: false });
const StrategicSlide = dynamic(() => import('@/components/presentation/StrategicSlide').then(m => ({ default: m.StrategicSlide })), { ssr: false });
const ResourceSlide = dynamic(() => import('@/components/presentation/ResourceSlide').then(m => ({ default: m.ResourceSlide })), { ssr: false });

const VALID_AUDIENCES: Audience[] = ['gm', 'ops-director', 'crosscheck'];
const VALID_TIMEFRAMES: Timeframe[] = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];

function PlaceholderSlide({
  title,
  subtitle,
  revealStep,
}: {
  title: string;
  subtitle?: string;
  revealStep: number;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <div className="text-6xl opacity-20">📊</div>
      <h2 className="text-2xl font-semibold text-slate-600">{title}</h2>
      {subtitle && <p className="text-lg text-slate-400">{subtitle}</p>}
      <p className="text-sm text-slate-300 mt-4">组件开发中...</p>
      {/* revealStep used for future reveal animations */}
      {revealStep > 0 && null}
    </div>
  );
}

/**
 * Slide components receive at minimum `{ revealStep: number }` from the shell.
 * Components that declare additional required props (e.g. SummarySlide.situation)
 * source those values internally via SWR or Zustand — they are never passed from
 * this registry call site. TypeScript cannot verify this structural compatibility
 * without a coercion; we use a typed intermediate `SlideComponentType` to make
 * the intent explicit and avoid bare `as unknown as`.
 *
 * `toSlide` narrows via `unknown` with a descriptive name so the escape hatch is
 * obvious in code review.
 */
type SlideComponentType = React.ComponentType<{ revealStep: number }>;

function toSlide<P>(c: React.ComponentType<P>): SlideComponentType {
  // Slide components source extra required props from SWR/store internally.
  // The registry only passes `revealStep`; additional props default to undefined.
  return c as unknown as SlideComponentType;
}

const COMPONENT_REGISTRY: Record<string, SlideComponentType> = {
  // Original 5
  'executive-summary': ExecutiveSummarySlide,
  'summary': toSlide(SummarySlide),
  'joint-action': toSlide(JointActionCard),
  'funnel-ownership': toSlide(FunnelOwnershipChart),
  'action-items': toSlide(ActionItemTracker),
  // GM scene
  'revenue-analysis': toSlide(RevenueSlide),
  'revenue-deep-dive': toSlide(RevenueSlide),
  'funnel-overview': toSlide(FunnelSlide),
  'funnel-detail': toSlide(FunnelSlide),
  'risk-radar': toSlide(RiskRadarSlide),
  'team-performance': toSlide(TeamSlide),
  'team-ranking': toSlide(TeamSlide),
  'team-evolution': toSlide(TeamSlide),
  'trend-analysis': toSlide(TrendSlide),
  'cohort-analysis': toSlide(CohortSlide),
  'stage-evaluation': toSlide(StageSlide),
  'wow-comparison': toSlide(ComparisonSlide),
  'yoy-comparison': toSlide(ComparisonSlide),
  'key-changes': toSlide(ComparisonSlide),
  // Ops-Director scene
  'outreach-execution': toSlide(OutreachSlide),
  'trial-followup': toSlide(TrialSlide),
  'channel-breakdown': toSlide(ChannelSlide),
  'followup-alert': toSlide(FollowupAlertSlide),
  'kpi-north-star': toSlide(KPINorthStarSlide),
  'outreach-gap': toSlide(OutreachGapSlide),
  'action-plan': toSlide(ActionPlanSlide),
  'impact-simulation': toSlide(ImpactSlide),
  // Crosscheck + generic
  'shared-metrics': toSlide(SharedMetricsSlide),
  'leads-handoff': toSlide(LeadsHandoffSlide),
  'conversion-accountability': toSlide(ConversionSlide),
  'impact-attribution': toSlide(ImpactAttributionSlide),
  'what-if-simulation': toSlide(WhatIfSlide),
  'meeting-summary': toSlide(MeetingSummarySlide),
  'strategic-recommendation': toSlide(StrategicSlide),
  'resource-request': toSlide(ResourceSlide),
};

export default function PresentationSlidePage() {
  const params = useParams();
  const router = useRouter();

  const scene = params.scene as string;
  const timeframe = params.timeframe as string;

  const startPresentation = usePresentationStore((s) => s.startPresentation);
  const endPresentation = usePresentationStore((s) => s.endPresentation);
  const currentSlideIndex = usePresentationStore((s) => s.currentSlideIndex);
  const currentRevealStep = usePresentationStore((s) => s.currentRevealStep);
  const totalSlides = usePresentationStore((s) => s.totalSlides);

  // Validate params
  const isValidAudience = VALID_AUDIENCES.includes(scene as Audience);
  const isValidTimeframe = VALID_TIMEFRAMES.includes(timeframe as Timeframe);

  useEffect(() => {
    if (!isValidAudience || !isValidTimeframe) {
      router.replace('/present');
    }
  }, [isValidAudience, isValidTimeframe, router]);

  // Get scene config and slides
  const sceneConfig = isValidAudience ? getSceneConfig(scene as Audience) : null;
  const slides = sceneConfig?.slides[timeframe as Timeframe] ?? [];

  // Start/end presentation lifecycle
  useEffect(() => {
    if (!isValidAudience || !isValidTimeframe) return;
    startPresentation(scene as Audience, timeframe as Timeframe, '/present');
    return () => {
      endPresentation();
    };
    // Only run on mount/unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bind keyboard navigation
  const { currentSlide, progress, isFirstSlide, isLastSlide } = usePresentation();

  if (!isValidAudience || !isValidTimeframe || !sceneConfig) {
    return null;
  }

  if (slides.length === 0) {
    return (
      <div className="fixed inset-0 bg-white z-40 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 text-lg">暂无幻灯片配置</p>
          <button
            onClick={() => router.replace('/present')}
            className="mt-4 px-4 py-2 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            返回选择
          </button>
        </div>
      </div>
    );
  }

  const currentSlideConfig = slides[Math.min(currentSlideIndex, slides.length - 1)];

  if (!currentSlideConfig) {
    return null;
  }

  const ComponentFromRegistry = COMPONENT_REGISTRY[currentSlideConfig.component];

  const CurrentComponent: React.ComponentType<{ revealStep: number }> = ComponentFromRegistry
    ? ComponentFromRegistry
    : ({ revealStep }: { revealStep: number }) => (
        <PlaceholderSlide
          title={currentSlideConfig.title}
          subtitle={currentSlideConfig.subtitle}
          revealStep={revealStep}
        />
      );

  return (
    <div className="fixed inset-0 bg-white z-40 flex flex-col">
      <SlideProgressBar current={currentSlideIndex} total={totalSlides} />
      <div className="flex-1 overflow-hidden">
        <SlideShell
          slideNumber={currentSlideIndex + 1}
          totalSlides={totalSlides}
          title={currentSlideConfig.title}
          subtitle={currentSlideConfig.subtitle}
          section={currentSlideConfig.section}
          revealStep={currentRevealStep}
          maxRevealSteps={currentSlideConfig.revealSteps}
        >
          <CurrentComponent revealStep={currentRevealStep} />
        </SlideShell>
      </div>
    </div>
  );
}
