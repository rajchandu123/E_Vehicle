import React from 'react';

interface DemoLabelProps {
  kind?: 'demo' | 'simulated' | 'deterministic';
  className?: string;
}

/**
 * Clean, understated inline indicator honoring honesty rules without pill-badge clutter.
 */
export function DemoLabel({ kind = 'demo', className = '' }: DemoLabelProps) {
  const textMap = {
    demo: 'Demo data',
    simulated: 'Simulated',
    deterministic: 'Deterministic model',
  };

  const colorMap = {
    demo: 'text-[var(--cs-warning)]',
    simulated: 'text-[var(--cs-secondary)]',
    deterministic: 'text-[var(--cs-primary)]',
  };

  return (
    <span
      className={`inline-flex items-center text-[11px] font-medium tracking-wide whitespace-nowrap shrink-0 ${colorMap[kind]} ${className}`}
    >
      {textMap[kind]}
    </span>
  );
}
