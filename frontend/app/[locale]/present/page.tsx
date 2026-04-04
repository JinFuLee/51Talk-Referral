'use client';

import { usePageDimensions } from '@/lib/hooks/use-page-dimensions';
import { PresentationLauncher } from '@/components/presentation/PresentationLauncher';

export default function PresentPage() {
  usePageDimensions({
    country: true,
    dataRole: true,
    enclosure: true,
    team: true,
    granularity: true,
    funnelStage: true,
    channel: true,
  });

  // PresentationLauncher 自带暗色全屏背景 + 品牌标题，无需外层 PageHeader
  return <PresentationLauncher />;
}
