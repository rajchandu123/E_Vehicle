import React from 'react';

interface TonalCardProps {
  children: React.ReactNode;
  className?: string;
  tone?: 'surface-1' | 'surface-2' | 'surface-3';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function TonalCard({
  children,
  className = '',
  tone = 'surface-1',
  padding = 'md',
}: TonalCardProps) {
  const bgMap = {
    'surface-1': 'bg-[var(--cs-surface-1)]',
    'surface-2': 'bg-[var(--cs-surface-2)]',
    'surface-3': 'bg-[var(--cs-surface-3)]',
  };

  const padMap = {
    none: '',
    sm: 'p-4',
    md: 'p-5 sm:p-6',
    lg: 'p-6 sm:p-7',
  };

  return (
    <section
      className={`${bgMap[tone]} ${padMap[padding]} rounded-[22px] border border-[var(--cs-outline)] transition-colors duration-150 ${className}`}
    >
      {children}
    </section>
  );
}
