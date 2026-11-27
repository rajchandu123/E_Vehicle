import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DemoLabel } from '../../components/DemoBadge';
import { RippleButton } from '../../components/RippleButton';
import { TonalCard } from '../../components/TonalCard';

export function AboutLimitationsPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            About &amp; System Architecture
          </h1>
          <p className="text-sm text-[var(--cs-muted)] mt-1 max-w-2xl">
            ChargeSense clearly separates live external APIs, persistent cloud
            databases, deterministic engineering models, and hardware-dependent
            simulations.
          </p>
        </div>
        <RippleButton variant="tonal" onClick={() => navigate('/app')}>
          Back to Dashboard
        </RippleButton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <TonalCard className="space-y-3">
          <DemoLabel kind="live" />
          <h2 className="font-display text-lg font-semibold">
            Real &amp; Live Integrations
          </h2>
          <ul className="space-y-2 text-sm text-[var(--cs-muted)] list-disc pl-4">
            <li>
              <strong>Firebase Auth &amp; Cloud Firestore:</strong> Per-user
              registration, Google/email sign-in, vehicles, trips, service
              bookings, insurance claims, battery snapshots, community station
              check-ins, and SHA-256 Digital Passport events persist in Cloud
              Firestore with strict ownership rules.
            </li>
            <li>
              <strong>OpenStreetMap Overpass API:</strong> Live EV charging
              stations and automotive workshops queried across the
              Bengaluru–Mysuru corridor.
            </li>
            <li>
              <strong>Nominatim &amp; OSRM Routing:</strong> Real highway road
              distances, driving ETAs, and polyline geometry.
            </li>
            <li>
              <strong>Open-Meteo Weather:</strong> Live ambient temperature and
              wind speed feeding the EV range estimator.
            </li>
            <li>
              <strong>Server-Side Gemini AI:</strong> Structured JSON query
              extraction paired with deterministic engine citations.
            </li>
          </ul>
        </TonalCard>

        <TonalCard className="space-y-3">
          <DemoLabel kind="deterministic" />
          <h2 className="font-display text-lg font-semibold">
            Deterministic Models
          </h2>
          <ul className="space-y-2 text-sm text-[var(--cs-muted)] list-disc pl-4">
            <li>
              EV range band estimator (usable kWh, speed drag, AC load,
              Open-Meteo ambient temp, payload, and configurable safety buffer).
            </li>
            <li>
              Hard connector compatibility (CCS2, Type 2, CHAdeMO, GB/T) and
              reachable-range exclusion logic.
            </li>
            <li>
              Bayesian Beta-smoothed reliability scoring with 14-day recency
              decay on real Firestore community check-ins.
            </li>
            <li>
              SHA-256 hash-chain builder and live tamper verification for the EV
              Digital Passport.
            </li>
          </ul>
        </TonalCard>

        <TonalCard className="space-y-3">
          <DemoLabel kind="simulated" />
          <h2 className="font-display text-lg font-semibold">
            Hardware-Simulated &amp; Boundaries
          </h2>
          <ul className="space-y-2 text-sm text-[var(--cs-muted)] list-disc pl-4">
            <li>
              <strong>Vehicle Telemetry &amp; Control Cockpit:</strong> Browser
              apps cannot connect directly to an OEM CAN-bus or OBD-II port, so
              live SoC% sliders and lock/climate/valet/geofence/sentry/V2G/V2L
              toggles remain clearly labelled as simulated state-machine
              controls.
            </li>
            <li>
              <strong>OSM Metadata Gaps:</strong> Where OpenStreetMap lacks a
              live OCPI bay occupancy feed or explicit tariff tag, ChargeSense
              displays OSM bay capacity and Karnataka reference DC/AC tariffs
              until verified by community check-ins or admin updates.
            </li>
          </ul>
        </TonalCard>
      </div>
    </div>
  );
}
