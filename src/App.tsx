import React, { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppShell } from './components/layout/AppShell';
import { ToastViewport } from './components/ToastViewport';
import { AboutLimitationsPage } from './features/about/AboutLimitationsPage';
import { AdminPage } from './features/admin/AdminPage';
import { AnalyticsPage } from './features/analytics/AnalyticsPage';
import { AssistantPage } from './features/assistant/AssistantPage';
import { AuthPage } from './features/auth/AuthPage';
import { ChargingPage } from './features/charging/ChargingPage';
import { VehicleControlPage } from './features/control/VehicleControlPage';
import { BatteryHealthPage } from './features/health/BatteryHealthPage';
import { HomeOverviewPage } from './features/home/HomeOverviewPage';
import { InsurancePage } from './features/insurance/InsurancePage';
import { LandingPage } from './features/landing/LandingPage';
import { NotFoundPage } from './features/notfound/NotFoundPage';
import { OnboardingPage } from './features/onboarding/OnboardingPage';
import { PassportPage } from './features/passport/PassportPage';
import { ServicesPage } from './features/services/ServicesPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { TripPlannerPage } from './features/trips/TripPlannerPage';
import { useAppStore } from './store/useAppStore';

export default function App() {
  const init = useAppStore((s) => s.init);

  useEffect(() => {
    void init();
  }, [init]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/about" element={<AboutLimitationsPage />} />

          {/* Protected Platform Routes: require Firebase registration/verification + sign in */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/app/profile" element={<OnboardingPage />} />
              <Route path="/app" element={<HomeOverviewPage />} />
              <Route path="/app/charging" element={<ChargingPage />} />
              <Route path="/app/trips" element={<TripPlannerPage />} />
              <Route path="/app/control" element={<VehicleControlPage />} />
              <Route path="/app/health" element={<BatteryHealthPage />} />
              <Route path="/app/services" element={<ServicesPage />} />
              <Route path="/app/insurance" element={<InsurancePage />} />
              <Route path="/app/passport" element={<PassportPage />} />
              <Route path="/app/analytics" element={<AnalyticsPage />} />
              <Route path="/app/assistant" element={<AssistantPage />} />
              <Route path="/app/settings" element={<SettingsPage />} />
              <Route path="/app/admin" element={<AdminPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <ToastViewport />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
