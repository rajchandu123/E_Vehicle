import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { CardSkeleton } from '../Skeleton';
import { useAppStore } from '../../store/useAppStore';

export function ProtectedRoute() {
  const location = useLocation();
  const authChecked = useAppStore((s) => s.authChecked);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[var(--cs-surface)] p-8 flex items-center justify-center">
        <div className="max-w-md w-full">
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/auth?mode=login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return <Outlet />;
}
