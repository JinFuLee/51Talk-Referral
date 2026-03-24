'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SSLPMatrixRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/enclosure?tab=ss');
  }, [router]);
  return null;
}
