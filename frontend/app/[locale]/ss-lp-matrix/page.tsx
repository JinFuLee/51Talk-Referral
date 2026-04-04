'use client';
import { useRouter } from '@/i18n/navigation';
import { useEffect } from 'react';
import { usePageDimensions } from '@/lib/hooks/use-page-dimensions';

export default function SSLPMatrixRedirect() {
  usePageDimensions({
    country: true,
    dataRole: true,
    enclosure: true,
    team: true,
  });
  const router = useRouter();
  useEffect(() => {
    router.replace('/enclosure?tab=ss');
  }, [router]);
  return null;
}
