import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DemoLabel } from '../../components/DemoBadge';
import { RippleButton } from '../../components/RippleButton';
import { TonalCard } from '../../components/TonalCard';

interface PhaseTwoPlaceholderProps {
  title: string;
  description: string;
  domainReadyNote: string;
}

export function PhaseTwoPlaceholder({
  title,
  description,
  domainReadyNote,
}: PhaseTwoPlaceholderProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-[var(--cs-muted)]">
        <span>Scheduled for Pass 2</span>
        <span aria-hidden="true">·</span>
        <DemoLabel kind="demo" />
      </div>

      <TonalCard className="max-w-2xl space-y-4" padding="lg">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {title}
        </h1>
        <p className="text-sm text-[var(--cs-muted)] leading-relaxed">
          {description}
        </p>
        <div className="p-4 rounded-[16px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)]">
          <p className="text-xs font-medium text-[var(--cs-primary)]">
            Foundation status
          </p>
          <p className="text-xs text-[var(--cs-muted)] mt-1">
            {domainReadyNote}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          <RippleButton variant="primary" onClick={() => navigate('/app')}>
            Back to Home Overview
          </RippleButton>
          <RippleButton variant="tonal" onClick={() => navigate('/about')}>
            View System Scope
          </RippleButton>
        </div>
      </TonalCard>
    </div>
  );
}
