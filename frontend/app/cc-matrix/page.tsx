'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function CCMatrixRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/personnel-matrix?tab=cc');
  }, [router]);
  return null;
}
