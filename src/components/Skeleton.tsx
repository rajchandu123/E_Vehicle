import React from 'react';

export function Skeleton({ className = 'h-5 w-full' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-[12px] bg-[var(--cs-surface-3)] ${className}`}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-[22px] border border-[var(--cs-outline)] bg-[var(--cs-surface-1)] p-6 space-y-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  );
}
