import { ArrowRight, BatteryCharging, Compass, ShieldCheck, Zap } from 'lucide-react';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DemoLabel } from '../../components/DemoBadge';
import { RippleButton } from '../../components/RippleButton';
import { TonalCard } from '../../components/TonalCard';
import { useAppStore } from '../../store/useAppStore';

export function LandingPage() {
  const navigate = useNavigate();
  const trigger55PercentDemo = useAppStore((s) => s.trigger55PercentDemo);
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  const handleLaunchDemo = () => {
    trigger55PercentDemo();
    navigate('/app');
  };

  return (
    <div className="min-h-screen bg-[var(--cs-surface)] text-[var(--cs-text)] flex flex-col">
      {/* 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-[var(--cs-surface)]/90 backdrop-blur-md border-b border-[var(--cs-outline)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
          <Link
            to="/"
            className="font-display text-lg font-bold tracking-tight text-[var(--cs-text)] whitespace-nowrap shrink-0"
          >
            ChargeSense
          </Link>

          <nav
            aria-label="Landing navigation"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-[var(--cs-muted)]"
          >
            <a
              href="#capabilities"
              className="hover:text-[var(--cs-text)] transition-colors whitespace-nowrap shrink-0"
            >
              Capabilities
            </a>
            <a
              href="#how-it-works"
              className="hover:text-[var(--cs-text)] transition-colors whitespace-nowrap shrink-0"
            >
              How It Works
            </a>
            <a
              href="#corridor"
              className="hover:text-[var(--cs-text)] transition-colors whitespace-nowrap shrink-0"
            >
              Corridor Pilot
            </a>
            <Link
              to="/about"
              className="hover:text-[var(--cs-text)] transition-colors whitespace-nowrap shrink-0"
            >
              Limitations
            </Link>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <RippleButton
              variant="primary"
              size="sm"
              onClick={() => navigate('/app')}
            >
              Open Dashboard
            </RippleButton>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Split */}
        <section className="max-w-7xl mx-auto px-6 pt-12 pb-14 lg:pt-16 lg:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
              <div className="flex items-center gap-2 text-xs text-[var(--cs-muted)]">
                <span>Bengaluru – Mysuru Corridor Pilot</span>
                <span aria-hidden="true">·</span>
                <DemoLabel kind="demo" />
              </div>

              <h1
                className="font-display font-bold tracking-tight text-[var(--cs-text)] leading-[1.08]"
                style={{
                  fontSize: 'clamp(2.25rem, 4vw, 3.5rem)',
                  textWrap: 'balance',
                }}
              >
                One explainable OS for every electric kilometre.
              </h1>

              <p className="text-base sm:text-lg text-[var(--cs-muted)] max-w-xl leading-relaxed">
                ChargeSense replaces separate charger, map, vehicle, service, and
                insurance apps with a deterministic decision layer built for
                Indian EV drivers. See real reachable range bands, filter out
                incompatible or flaky stations, and verify every record.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <RippleButton
                  variant="primary"
                  size="lg"
                  onClick={handleLaunchDemo}
                >
                  <span>Try 55% Battery Demo</span>
                  <ArrowRight className="w-4 h-4" />
                </RippleButton>

                <RippleButton
                  variant="tonal"
                  size="lg"
                  onClick={() => navigate('/onboarding')}
                >
                  <span>Add Your EV</span>
                </RippleButton>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="relative h-full min-h-[280px] lg:min-h-[380px] rounded-[24px] overflow-hidden border border-[var(--cs-outline)] bg-[var(--cs-surface-2)]">
                {!heroImgFailed ? (
                  <img
                    src="/src/assets/images/hero_ev_corridor_1795544358440.jpg"
                    alt="Electric SUV charging beneath a solar canopy along the Karnataka expressway"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-[var(--cs-surface-2)] to-[var(--cs-surface-3)]">
                    <Zap className="w-10 h-10 text-[var(--cs-primary)] mb-3" />
                    <p className="font-display text-lg font-semibold">
                      Bengaluru–Mysuru EV Corridor
                    </p>
                    <p className="text-sm text-[var(--cs-muted)] mt-1">
                      143 km expressway pilot with 66 seeded stations
                    </p>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white">
                  <p className="text-xs text-white/80">
                    NH-275 Pilot Simulation · 66 Fictional Stations
                  </p>
                  <p className="font-display text-base font-semibold mt-0.5">
                    Connector-safe, reliability-scored corridor intelligence
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 4-Column Quantitative Proof Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
            {[
              { label: 'Pilot Corridor', value: '143 km', sub: 'Bengaluru → Mysuru' },
              { label: 'Seeded Stations', value: '66 hubs', sub: 'Fictional demo operators' },
              { label: 'Ranking Latency', value: '< 10 ms', sub: 'Deterministic client engine' },
              { label: 'Safety Reserve', value: '20%', sub: 'Configurable SoC buffer' },
            ].map((stat) => (
              <TonalCard key={stat.label} padding="sm" tone="surface-1">
                <p className="text-xs text-[var(--cs-muted)]">{stat.label}</p>
                <p className="font-display text-2xl font-bold tabular-nums mt-1 text-[var(--cs-text)]">
                  {stat.value}
                </p>
                <p className="text-xs text-[var(--cs-muted)] mt-0.5">{stat.sub}</p>
              </TonalCard>
            ))}
          </div>
        </section>

        {/* Core Capabilities */}
        <section
          id="capabilities"
          className="max-w-7xl mx-auto px-6 py-12 border-t border-[var(--cs-outline)]"
        >
          <div className="max-w-2xl mb-8">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              Built to explain every recommendation
            </h2>
            <p className="text-sm sm:text-base text-[var(--cs-muted)] mt-2">
              Every distance band, charger exclusion, and reliability score runs
              through audited TypeScript logic before any UI or AI summary
              renders.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <TonalCard className="md:col-span-2 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <BatteryCharging className="w-5 h-5 text-[var(--cs-primary)]" />
                <DemoLabel kind="deterministic" />
              </div>
              <h3 className="font-display text-lg font-semibold">
                Honest Min / Likely / Max Range Bands
              </h3>
              <p className="text-sm text-[var(--cs-muted)] leading-relaxed">
                Instead of a single optimistic dashboard number, ChargeSense
                models usable kWh, speed drag, AC load, ambient temperature,
                payload, and a configurable 20% reserve to show a realistic
                reachable band.
              </p>
            </TonalCard>

            <TonalCard className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Zap className="w-5 h-5 text-[var(--cs-secondary)]" />
                <DemoLabel kind="deterministic" />
              </div>
              <h3 className="font-display text-lg font-semibold">
                Bayesian Charger Reliability
              </h3>
              <p className="text-sm text-[var(--cs-muted)] leading-relaxed">
                New hubs start with a conservative prior so 2 lucky sessions never
                mask risk. Driver check-ins decay over a 14-day half-life and
                visibly adjust scores.
              </p>
            </TonalCard>

            <TonalCard className="space-y-3">
              <Compass className="w-5 h-5 text-[var(--cs-warning)]" />
              <h3 className="font-display text-lg font-semibold">
                Three Ergonomic Shells
              </h3>
              <p className="text-sm text-[var(--cs-muted)] leading-relaxed">
                Switch between Desktop Material 3 rail, Mobile bottom tabs, and
                a high-contrast landscape Car Mode with oversized touch targets.
              </p>
            </TonalCard>

            <TonalCard className="md:col-span-2 space-y-3">
              <ShieldCheck className="w-5 h-5 text-[var(--cs-primary)]" />
              <h3 className="font-display text-lg font-semibold">
                SHA-256 Tamper-Evident EV Digital Passport
              </h3>
              <p className="text-sm text-[var(--cs-muted)] leading-relaxed">
                Charging logs, battery SoH snapshots, service visits, and
                insurance claims link together via SHA-256 hash chains for
                verifiable resale and warranty records.
              </p>
            </TonalCard>
          </div>
        </section>

        {/* How It Works */}
        <section
          id="how-it-works"
          className="max-w-7xl mx-auto px-6 py-12 border-t border-[var(--cs-outline)]"
        >
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mb-8">
            How the decision pipeline works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {[
              {
                step: '01. Profile Your EV',
                body: 'Pick one of 5 Indian EV presets or enter usable kWh, Wh/km efficiency, and CCS2 / Type 2 / CHAdeMO / GB/T ports.',
              },
              {
                step: '02. Compute Safe Band',
                body: 'Test 55% SoC or your current charge with speed, AC, and safety reserve to get Min, Likely, and Max km.',
              },
              {
                step: '03. Hard-Filter & Rank',
                body: 'Incompatible ports, offline stations, and out-of-range hubs are excluded before scoring detour, tariff, speed, and uptime.',
              },
              {
                step: '04. Verify & Record',
                body: 'Check in at stations to update Bayesian trust and append verified ownership events to your Digital Passport.',
              },
            ].map((item) => (
              <TonalCard key={item.step} tone="surface-2" padding="md">
                <h3 className="font-display text-base font-semibold text-[var(--cs-text)]">
                  {item.step}
                </h3>
                <p className="text-sm text-[var(--cs-muted)] mt-2 leading-relaxed">
                  {item.body}
                </p>
              </TonalCard>
            ))}
          </div>
        </section>

        {/* Corridor Pilot CTA */}
        <section
          id="corridor"
          className="max-w-7xl mx-auto px-6 py-12 border-t border-[var(--cs-outline)]"
        >
          <TonalCard tone="surface-1" padding="lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2 text-xs text-[var(--cs-muted)]">
                  <span>Bengaluru → Bidadi → Ramanagara → Channapatna → Maddur → Mandya → Srirangapatna → Mysuru</span>
                </div>
                <h2 className="font-display text-2xl font-bold tracking-tight">
                  Ready to inspect the 55% battery scenario?
                </h2>
                <p className="text-sm text-[var(--cs-muted)]">
                  No account sign-up required. All station inventories and live
                  vehicle controls are clearly labelled demo simulations running
                  locally in your browser.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <RippleButton variant="primary" size="lg" onClick={handleLaunchDemo}>
                  Launch 55% Demo
                </RippleButton>
                <RippleButton
                  variant="tonal"
                  size="lg"
                  onClick={() => navigate('/about')}
                >
                  What Is Real vs Simulated
                </RippleButton>
              </div>
            </div>
          </TonalCard>
        </section>
      </main>

      <footer className="border-t border-[var(--cs-outline)] py-6 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--cs-muted)]">
          <span>ChargeSense · EV Intelligence &amp; Ownership OS (Pilot Demo)</span>
          <div className="flex items-center gap-5">
            <Link to="/app" className="hover:text-[var(--cs-text)]">
              Dashboard
            </Link>
            <Link to="/onboarding" className="hover:text-[var(--cs-text)]">
              Onboarding
            </Link>
            <Link to="/about" className="hover:text-[var(--cs-text)]">
              About &amp; Limitations
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
