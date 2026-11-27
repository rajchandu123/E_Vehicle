import React, { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppShell } from './components/layout/AppShell';
import { ToastViewport } from './components/ToastViewport';
import { AboutLimitationsPage } from './features/about/AboutLimitationsPage';
import { ChargingPage } from './features/charging/ChargingPage';
import { HomeOverviewPage } from './features/home/HomeOverviewPage';
import { LandingPage } from './features/landing/LandingPage';
import { NotFoundPage } from './features/notfound/NotFoundPage';
import { OnboardingPage } from './features/onboarding/OnboardingPage';
import { PhaseTwoPlaceholder } from './features/shared/PhaseTwoPlaceholder';
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

          <Route element={<AppShell />}>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/about" element={<AboutLimitationsPage />} />
            <Route path="/app" element={<HomeOverviewPage />} />
            <Route path="/app/charging" element={<ChargingPage />} />

            {/* Phase 2 feature routes wired to honest status placeholders */}
            <Route
              path="/app/trips"
              element={
                <PhaseTwoPlaceholder
                  title="Corridor Trip Planner"
                  description="Bengaluru–Mysuru expressway planner with charging stops, energy breakdown, arrival SoC, and charging time."
                  domainReadyNote="RoutingProvider interface and deterministic planTrip() solver are implemented and tested in /src/domain/tripPlanner.ts."
                />
              }
            />
            <Route
              path="/app/control"
              element={
                <PhaseTwoPlaceholder
                  title="Simulated Vehicle Control Cockpit"
                  description="State-machine driven simulated toggles for lock/unlock, cabin pre-conditioning, valet mode, geofence, charge limit, and V2L/V2G."
                  domainReadyNote="TelemetrySimulator state machine is initialized in /src/services/orchestrators.ts and connected to the Zustand store."
                />
              }
            />
            <Route
              path="/app/health"
              element={
                <PhaseTwoPlaceholder
                  title="Battery Health & Degradation"
                  description="State-of-Health trend chart, cycle count tracker, DC fast-charge ratio, and uncertainty notes."
                  domainReadyNote="Seeded battery health snapshots and MockBatteryHealthRepo are ready in /src/data."
                />
              }
            />
            <Route
              path="/app/services"
              element={
                <PhaseTwoPlaceholder
                  title="Services & Emergency Dispatch"
                  description="EV-certified service centre finder along the Bengaluru–Mysuru corridor, slot booking, and simulated roadside assistance."
                  domainReadyNote="4 corridor service centres are seeded in MockServiceCentreRepo."
                />
              }
            />
            <Route
              path="/app/insurance"
              element={
                <PhaseTwoPlaceholder
                  title="Insurance & Claims Tracker"
                  description="Policy viewer, FNOL claim submission with Zod validation, document upload preview, and status timeline."
                  domainReadyNote="ClaimInputSchema and MockClaimRepo are wired in /src/domain/schemas.ts and /src/data."
                />
              }
            />
            <Route
              path="/app/passport"
              element={
                <PhaseTwoPlaceholder
                  title="EV Digital Passport"
                  description="Tamper-evident ledger viewer, live chain verification, and JSON/PDF + QR export."
                  domainReadyNote="SHA-256 hash chain builder and verifyPassportChain() are implemented and tested in /src/domain/passport.ts."
                />
              }
            />
            <Route
              path="/app/analytics"
              element={
                <PhaseTwoPlaceholder
                  title="Trips & Efficiency Analytics"
                  description="Energy cost per km, eco score trends, and trip history charts powered by Recharts."
                  domainReadyNote="Sample trips and MockTripRepo are seeded in /src/data."
                />
              }
            />
            <Route
              path="/app/assistant"
              element={
                <PhaseTwoPlaceholder
                  title="Grounded AI Assistant (Gemini)"
                  description="Natural-language query parser using Gemini JSON-schema/function calling backed by the deterministic engine and in-memory retrieval."
                  domainReadyNote="RetrievalService in-memory search over stations, service centres, and FAQs is ready in /src/services/orchestrators.ts."
                />
              }
            />
            <Route
              path="/app/settings"
              element={
                <PhaseTwoPlaceholder
                  title="Preferences & Privacy Settings"
                  description="Theme selection, unit preferences, safety reserve defaults, and demo storage reset."
                  domainReadyNote="Theme and active user/vehicle preferences already persist via localStorage."
                />
              }
            />
            <Route
              path="/app/admin"
              element={
                <PhaseTwoPlaceholder
                  title="Corridor Operations & Admin Console"
                  description="Station status overrides, reliability analytics, and user check-in moderation."
                  domainReadyNote="MockStationRepo.updateStationStatus() is ready for the admin workflow."
                />
              }
            />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <ToastViewport />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
