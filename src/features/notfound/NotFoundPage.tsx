import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RippleButton } from '../../components/RippleButton';
import { TonalCard } from '../../components/TonalCard';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <TonalCard className="max-w-md w-full text-center space-y-4">
        <p className="font-display text-5xl font-bold tabular-nums text-[var(--cs-primary)]">
          404
        </p>
        <h1 className="font-display text-xl font-semibold">
          Route not found in ChargeSense
        </h1>
        <p className="text-sm text-[var(--cs-muted)]">
          The requested screen does not exist. Return to the Home overview or
          the landing page.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <RippleButton variant="primary" onClick={() => navigate('/app')}>
            Go to Dashboard
          </RippleButton>
          <RippleButton variant="tonal" onClick={() => navigate('/')}>
            Landing Page
          </RippleButton>
        </div>
      </TonalCard>
    </div>
  );
}
