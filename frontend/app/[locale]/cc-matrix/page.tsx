'use client';
import { useRouter } from '@/i18n/navigation';
import { useEffect } from 'react';
import { usePageDimensions } from '@/lib/hooks/use-page-dimensions';

export default function CCMatrixRedirect() {
  const router = useRouter();
  usePageDimensions({
    country: true,
    dataRole: true,
    enclosure: true,
    team: true,
  });
  useEffect(() => {
    router.replace('/personnel-matrix?tab=cc');
  }, [router]);
  return null;
}
