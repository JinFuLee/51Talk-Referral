import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />;
}

export function SkeletonCard({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-n-200', className ?? 'h-24')} />;
}

export function SkeletonChart({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-n-200', className ?? 'h-48 w-full')} />;
}

export { Skeleton };
