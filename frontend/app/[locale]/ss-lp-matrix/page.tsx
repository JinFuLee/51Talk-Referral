'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { usePageDimensions } from '@/lib/hooks/use-page-dimensions';

export default function SSLPMatrixRedirect() {
  usePageDimensions({
    country: true,
    dataRole: true,
    enclosure: true,
    team: true,
    granularity: true,
  });
  const router = useRouter();
  useEffect(() => {
    router.replace('/enclosure?tab=ss');
  }, [router]);
  return null;
}
