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

const COMPONENT_REGISTRY: Record<string, React.ComponentType<{ revealStep: number }>> = {
  // Original 5
  'executive-summary': ExecutiveSummarySlide,
  'summary': SummarySlide as unknown as React.ComponentType<{ revealStep: number }>,
  'joint-action': JointActionCard as unknown as React.ComponentType<{ revealStep: number }>,
  'funnel-ownership': FunnelOwnershipChart as unknown as React.ComponentType<{ revealStep: number }>,
  'action-items': ActionItemTracker as unknown as React.ComponentType<{ revealStep: number }>,
  // GM scene
  'revenue-analysis': RevenueSlide as unknown as React.ComponentType<{ revealStep: number }>,
  'revenue-deep-dive': RevenueSlide as unknown as React.ComponentType<{ revealStep: number }>,
  'funnel-overview': FunnelSlide as unknown as React.ComponentType<{ revealStep: number }>,
  'funnel-detail': FunnelSlide as unknown as React.ComponentType<{ revealStep: number }>,
  'risk-radar': RiskRadarSlide as unknown as React.ComponentType<{ revealStep: number }>,
  'team-performance': TeamSlide as unknown as React.ComponentType<{ revealStep: number }>,
  'team-ranking': TeamSlide as unknown as React.ComponentType<{ revealStep: number }>,
  'team-evolution': TeamSlide as unknown as React.ComponentType<{ revealStep: number }>,
  'trend-analysis': TrendSlide as unknown as React.ComponentType<{ revealStep: number }>,
  'cohort-analysis': CohortSlide as unknown as React.ComponentType<{ revealStep: number }>,
  'stage-evaluation': StageSlide as unknown as React.ComponentType<{ revealStep: number }>,
  'wow-comparison': ComparisonSlide as unknown as React.ComponentType<{ revealStep: number }>,
  'yoy-comparison': ComparisonSlide as unknown as React.ComponentType<{ revealStep: number }>,
  'key-changes': ComparisonSlide as unknown as React.ComponentType<{ revealStep: number }>,
  // Ops-Director scene
  'outreach-execution': OutreachSlide as unknown as React.ComponentType<{ revealStep: number }>,
  'trial-followup': TrialSlide as unknown as React.ComponentType<{ revealStep: number }>,
  'channel-breakdown': ChannelSlide as unknown as React.ComponentType<{ revealStep: number }>,
  'followup-alert': FollowupAlertSlide as unknown as React.ComponentType<{ revealStep: number }>,
  'kpi-north-star': KPINorthStarSlide as unknown as React.ComponentType<{ revealStep: number }>,
  'outreach-gap': OutreachGapSlide as unknown as React.ComponentType<{ revealStep: number }>,
  'action-plan': ActionPlanSlide as unknown as React.ComponentType<{ revealStep: number }>,
  'impact-simulation': ImpactSlide as unknown as React.ComponentType<{ revealStep: number }>,
  // Crosscheck + generic
  'shared-metrics': SharedMetricsSlide as unknown as React.ComponentType<{ revealStep: number }>,
  'leads-handoff': LeadsHandoffSlide as unknown as React.ComponentType<{ revealStep: number }>,
  'conversion-accountability': ConversionSlide as unknown as React.ComponentType<{ revealStep: number }>,
  'impact-attribution': ImpactAttributionSlide as unknown as React.ComponentType<{ revealStep: number }>,
  'what-if-simulation': WhatIfSlide as unknown as React.ComponentType<{ revealStep: number }>,
  'meeting-summary': MeetingSummarySlide as unknown as React.ComponentType<{ revealStep: number }>,
  'strategic-recommendation': StrategicSlide as unknown as React.ComponentType<{ revealStep: number }>,
  'resource-request': ResourceSlide as unknown as React.ComponentType<{ revealStep: number }>,
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
