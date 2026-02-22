"use client";

import { useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePresentationStore } from '@/lib/stores/presentation-store';
import { getSceneConfig } from '@/lib/presentation/scenes';
import { usePresentation } from '@/lib/hooks/usePresentation';
import { ExecutiveSummarySlide } from '@/components/presentation/ExecutiveSummarySlide';
import { SummarySlide } from '@/components/presentation/SummarySlide';
import { JointActionCard } from '@/components/presentation/JointActionCard';
import { FunnelOwnershipChart } from '@/components/presentation/FunnelOwnershipChart';
import { ActionItemTracker } from '@/components/presentation/ActionItemTracker';
import { SlideShell } from '@/components/presentation/SlideShell';
import { SlideProgressBar } from '@/components/presentation/SlideProgressBar';
import { RevenueSlide } from '@/components/presentation/RevenueSlide';
import { FunnelSlide } from '@/components/presentation/FunnelSlide';
import { RiskRadarSlide } from '@/components/presentation/RiskRadarSlide';
import { TeamSlide } from '@/components/presentation/TeamSlide';
import { TrendSlide } from '@/components/presentation/TrendSlide';
import { CohortSlide } from '@/components/presentation/CohortSlide';
import { StageSlide } from '@/components/presentation/StageSlide';
import { ComparisonSlide } from '@/components/presentation/ComparisonSlide';
import { OutreachSlide } from '@/components/presentation/OutreachSlide';
import { TrialSlide } from '@/components/presentation/TrialSlide';
import { ChannelSlide } from '@/components/presentation/ChannelSlide';
import { FollowupAlertSlide } from '@/components/presentation/FollowupAlertSlide';
import { KPINorthStarSlide } from '@/components/presentation/KPINorthStarSlide';
import { OutreachGapSlide } from '@/components/presentation/OutreachGapSlide';
import { ActionPlanSlide } from '@/components/presentation/ActionPlanSlide';
import { ImpactSlide } from '@/components/presentation/ImpactSlide';
import { SharedMetricsSlide } from '@/components/presentation/SharedMetricsSlide';
import { LeadsHandoffSlide } from '@/components/presentation/LeadsHandoffSlide';
import { ConversionSlide } from '@/components/presentation/ConversionSlide';
import { ImpactAttributionSlide } from '@/components/presentation/ImpactAttributionSlide';
import { WhatIfSlide } from '@/components/presentation/WhatIfSlide';
import { MeetingSummarySlide } from '@/components/presentation/MeetingSummarySlide';
import { StrategicSlide } from '@/components/presentation/StrategicSlide';
import { ResourceSlide } from '@/components/presentation/ResourceSlide';
import type { Audience, Timeframe } from '@/lib/presentation/types';

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
