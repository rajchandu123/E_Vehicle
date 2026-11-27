import React from 'react';
import { RippleButton } from './RippleButton';
import { TonalCard } from './TonalCard';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Unexpected interface error occurred.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6">
          <TonalCard className="max-w-md w-full space-y-4">
            <h2 className="font-display text-xl font-semibold text-[var(--cs-error)]">
              View could not be rendered
            </h2>
            <p className="text-sm text-[var(--cs-muted)]">
              {this.state.message}
            </p>
            <RippleButton
              variant="tonal"
              onClick={() => this.setState({ hasError: false, message: '' })}
            >
              Retry view
            </RippleButton>
          </TonalCard>
        </div>
      );
    }
    return this.props.children;
  }
}
