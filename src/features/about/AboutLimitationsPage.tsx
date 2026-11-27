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
            About &amp; System Limitations
          </h1>
          <p className="text-sm text-[var(--cs-muted)] mt-1 max-w-2xl">
            ChargeSense is transparent about what runs deterministically in
            code, what is simulated in the browser, and what requires external
            OEM/network integrations in production.
          </p>
        </div>
        <RippleButton variant="tonal" onClick={() => navigate('/app')}>
          Back to Dashboard
        </RippleButton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <TonalCard className="space-y-3">
          <DemoLabel kind="deterministic" />
          <h2 className="font-display text-lg font-semibold">
            What Is Real (Auditable Logic)
          </h2>
          <ul className="space-y-2 text-sm text-[var(--cs-muted)] list-disc pl-4">
            <li>
              Deterministic EV range band estimator (usable kWh, speed drag, AC
              load, ambient temp, payload, and safety reserve).
            </li>
            <li>
              Hard connector compatibility (CCS2, Type 2, CHAdeMO, GB/T) and
              reachable-range exclusion logic.
            </li>
            <li>
              Bayesian Beta-smoothed reliability scoring with 14-day recency
              decay on user check-ins.
            </li>
            <li>
              SHA-256 hash-chain builder and tamper verification for the EV
              Digital Passport.
            </li>
            <li>
              Zod schema validation and browser localStorage persistence for
              user profiles, custom vehicles, and check-ins.
            </li>
          </ul>
        </TonalCard>

        <TonalCard className="space-y-3">
          <DemoLabel kind="simulated" />
          <h2 className="font-display text-lg font-semibold">
            What Is Simulated (Demo Layer)
          </h2>
          <ul className="space-y-2 text-sm text-[var(--cs-muted)] list-disc pl-4">
            <li>
              All 66 charging stations and operator names (KaveriGrid,
              VoltSahay, DeccanCharge, etc.) are fictional demo records.
            </li>
            <li>
              Live bay availability, tariffs, and 30-day downtime numbers are
              seeded locally rather than fetched via OCPI.
            </li>
            <li>
              Vehicle telemetry (SoC%, SoH%, cycle count, lock/climate/valet/V2G
              toggles) is driven by a client-side state machine, not an OBD-II
              or OEM telematics feed.
            </li>
            <li>
              Service centres, appointment slots, and insurance claim timelines
              are seeded demonstration workflows.
            </li>
          </ul>
        </TonalCard>

        <TonalCard className="space-y-3">
          <DemoLabel kind="demo" />
          <h2 className="font-display text-lg font-semibold">
            Phase 2 Roadmap (Next Pass)
          </h2>
          <ul className="space-y-2 text-sm text-[var(--cs-muted)] list-disc pl-4">
            <li>
              Interactive OpenStreetMap / Leaflet charging map, check-in drawer,
              and custom weight sliders.
            </li>
            <li>
              Full Bengaluru–Mysuru Trip Planner, Vehicle Control cockpit,
              Battery Health &amp; Analytics Recharts views.
            </li>
            <li>
              Services &amp; Emergency dispatch, Insurance Claim builder, and
              JSON/PDF + QR Digital Passport exporter.
            </li>
            <li>
              Server-side Gemini Assistant with structured query extraction and
              grounded in-memory retrieval.
            </li>
          </ul>
        </TonalCard>
      </div>
    </div>
  );
}
