'use client';

/**
 * Next.js 15: `ssr: false` dynamic() calls must reside in Client Components.
 * These wrappers are imported by the Server Component layout.tsx.
 */

import dynamic from 'next/dynamic';

const CoPilotTerminalDynamic = dynamic(
  () => import('@/components/ui/CoPilotTerminal').then((m) => ({ default: m.CoPilotTerminal })),
  { ssr: false }
);

const PresentationOverlayDynamic = dynamic(
  () =>
    import('@/components/ui/PresentationOverlay').then((m) => ({ default: m.PresentationOverlay })),
  { ssr: false }
);

export function CoPilotTerminalClient() {
  return <CoPilotTerminalDynamic />;
}

export function PresentationOverlayClient() {
  return <PresentationOverlayDynamic />;
}
