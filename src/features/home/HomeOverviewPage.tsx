import {
  AlertTriangle,
  BatteryCharging,
  CloudSun,
  Compass,
  Plus,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Zap,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DemoLabel } from '../../components/DemoBadge';
import { M3Switch } from '../../components/M3Switch';
import { RippleButton } from '../../components/RippleButton';
import { CardSkeleton } from '../../components/Skeleton';
import { SocRing } from '../../components/SocRing';
import { TonalCard } from '../../components/TonalCard';
import { SEED_VEHICLES } from '../../data/seed/vehicles';
import { recommendStations } from '../../domain/recommendation';
import { DriveMode } from '../../domain/types';
import { BENGALURU_ORIGIN } from '../../services/orchestrators';
import { useAppStore } from '../../store/useAppStore';

export function HomeOverviewPage() {
  const navigate = useNavigate();
  const {
    loading,
    activeUser,
    activeVehicle,
    stations,
    stationsError,
    refreshLiveStations,
    weather,
    rangeInput,
    rangeBand,
    preset,
    updateRangeInput,
    trigger55PercentDemo,
    addVehicleAndSelect,
  } = useAppStore();

  const [addingTpl, setAddingTpl] = useState(false);

  const report = useMemo(() => {
    if (!activeVehicle || !rangeBand || stations.length === 0) return null;
    return recommendStations(activeVehicle, stations, {
      origin: BENGALURU_ORIGIN,
      rangeBand,
      preset,
      maxResults: 3,
    });
  }, [activeVehicle, rangeBand, stations, preset]);

  const handleQuickAdd = async (idx: number) => {
    const tpl = SEED_VEHICLES[idx];
    if (!tpl) return;
    setAddingTpl(true);
    try {
      const { id: _ignored, ...rest } = tpl;
      await addVehicleAndSelect(rest);
    } finally {
      setAddingTpl(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (!activeVehicle || !rangeBand) {
    return (
      <div className="space-y-6">
        <div>
          <DemoLabel kind="cloud" />
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mt-1">
            Welcome, {activeUser?.name ?? 'Driver'}
          </h1>
          <p className="text-sm text-[var(--cs-muted)] mt-1">
            Add your first electric vehicle to your Cloud Firestore garage to activate range bands, connector filtering, and trip planning.
          </p>
        </div>

        <TonalCard className="space-y-4">
          <h2 className="font-display text-lg font-semibold">
            Quick-Add Indian EV Specification or Register Custom Vehicle
          </h2>
          <div className="flex flex-wrap gap-2.5">
            {SEED_VEHICLES.map((tpl, idx) => (
              <RippleButton
                key={tpl.id}
                variant="tonal"
                size="sm"
                disabled={addingTpl}
                onClick={() => void handleQuickAdd(idx)}
              >
                <Plus className="w-4 h-4" />
                <span>
                  {tpl.make} {tpl.model} ({tpl.usableKwh} kWh)
                </span>
              </RippleButton>
            ))}
          </div>
          <div className="pt-2 border-t border-[var(--cs-outline)]">
            <RippleButton
              variant="primary"
              onClick={() => navigate('/onboarding')}
            >
              Open Full Garage Setup
            </RippleButton>
          </div>
        </TonalCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--cs-muted)]">
            <span>{activeUser?.name ?? 'Driver'}</span>
            <span aria-hidden="true">·</span>
            <span>{activeVehicle.registrationNumber}</span>
            <span aria-hidden="true">·</span>
            <DemoLabel kind="cloud" />
            {weather && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 text-[var(--cs-text)] tabular-nums">
                  <CloudSun className="w-3.5 h-3.5 text-[var(--cs-primary)]" />
                  {weather.temperatureC}°C corridor ambient
                </span>
              </>
            )}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mt-1">
            {activeVehicle.make} {activeVehicle.model}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <RippleButton
            variant="secondary"
            size="sm"
            onClick={trigger55PercentDemo}
          >
            Set 55% Scenario
          </RippleButton>
          <RippleButton
            variant="tonal"
            size="sm"
            onClick={() => navigate('/onboarding')}
          >
            Switch EV
          </RippleButton>
        </div>
      </div>

      {/* Primary Focal Anchor: SoC Ring + Deterministic Range Band Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <TonalCard className="lg:col-span-7 flex flex-col justify-between gap-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold">
              Reachable Range Band
            </h2>
            <DemoLabel kind="deterministic" />
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <SocRing
              socPercent={rangeBand.socPercent}
              likelyKm={rangeBand.likelyKm}
              minKm={rangeBand.minKm}
              maxKm={rangeBand.maxKm}
            />

            <div className="flex-1 w-full space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center sm:text-left">
                <div className="p-3 rounded-[14px] bg-[var(--cs-surface-2)]">
                  <span className="text-[11px] text-[var(--cs-muted)] block">
                    Conservative
                  </span>
                  <span className="font-display text-xl font-bold tabular-nums text-[var(--cs-text)]">
                    {rangeBand.minKm} km
                  </span>
                </div>
                <div className="p-3 rounded-[14px] bg-[var(--cs-primary-container)]">
                  <span className="text-[11px] text-[var(--cs-primary)] block">
                    Likely
                  </span>
                  <span className="font-display text-xl font-bold tabular-nums text-[var(--cs-primary)]">
                    {rangeBand.likelyKm} km
                  </span>
                </div>
                <div className="p-3 rounded-[14px] bg-[var(--cs-surface-2)]">
                  <span className="text-[11px] text-[var(--cs-muted)] block">
                    Optimistic
                  </span>
                  <span className="font-display text-xl font-bold tabular-nums text-[var(--cs-text)]">
                    {rangeBand.maxKm} km
                  </span>
                </div>
              </div>

              <p className="text-sm text-[var(--cs-muted)] leading-relaxed">
                {rangeBand.explanation}
              </p>

              {/* Factor impacts */}
              {rangeBand.factors.length > 0 && (
                <div className="pt-2 border-t border-[var(--cs-outline)] flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-[var(--cs-muted)] tabular-nums">
                  {rangeBand.factors.map((f) => (
                    <span key={f.label}>
                      {f.label}:{' '}
                      <strong className="text-[var(--cs-text)] font-medium">
                        {f.impactPercent > 0
                          ? `+${f.impactPercent}%`
                          : `${f.impactPercent}%`}
                      </strong>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TonalCard>

        {/* Interactive Telemetry Simulator Controls */}
        <TonalCard className="lg:col-span-5 flex flex-col justify-between gap-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[var(--cs-primary)]" />
              <h2 className="font-display text-lg font-semibold">
                Scenario Controls
              </h2>
            </div>
            <DemoLabel kind="simulated" />
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1.5 tabular-nums">
                <label htmlFor="soc-slider" className="text-[var(--cs-muted)]">
                  Battery SoC Input
                </label>
                <span className="font-semibold text-[var(--cs-text)]">
                  {rangeInput.socPercent}% ({rangeBand.usableEnergyKwh} kWh)
                </span>
              </div>
              <input
                id="soc-slider"
                type="range"
                min={0}
                max={100}
                value={rangeInput.socPercent}
                onChange={(e) =>
                  updateRangeInput({ socPercent: Number(e.target.value) })
                }
                className="w-full accent-[var(--cs-primary)] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5 tabular-nums">
                <label htmlFor="speed-slider" className="text-[var(--cs-muted)]">
                  Average Cruise Speed
                </label>
                <span className="font-semibold text-[var(--cs-text)]">
                  {rangeInput.avgSpeedKmh} km/h
                </span>
              </div>
              <input
                id="speed-slider"
                type="range"
                min={30}
                max={120}
                value={rangeInput.avgSpeedKmh}
                onChange={(e) =>
                  updateRangeInput({ avgSpeedKmh: Number(e.target.value) })
                }
                className="w-full accent-[var(--cs-primary)] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5 tabular-nums">
                <label htmlFor="buffer-slider" className="text-[var(--cs-muted)]">
                  Safety Reserve Buffer
                </label>
                <span className="font-semibold text-[var(--cs-text)]">
                  {rangeInput.safetyBufferPercent ?? 20}%
                </span>
              </div>
              <input
                id="buffer-slider"
                type="range"
                min={5}
                max={35}
                value={rangeInput.safetyBufferPercent ?? 20}
                onChange={(e) =>
                  updateRangeInput({
                    safetyBufferPercent: Number(e.target.value),
                  })
                }
                className="w-full accent-[var(--cs-primary)] cursor-pointer"
              />
            </div>

            <div>
              <span className="block text-xs text-[var(--cs-muted)] mb-1.5">
                Drive Mode
              </span>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-[14px] bg-[var(--cs-surface-2)]">
                {(['eco', 'city', 'sport'] as DriveMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => updateRangeInput({ driveMode: mode })}
                    className={`min-h-[36px] rounded-[10px] text-xs font-medium capitalize cursor-pointer transition-colors ${
                      rangeInput.driveMode === mode
                        ? 'bg-[var(--cs-primary)] text-[var(--cs-primary-ink)]'
                        : 'text-[var(--cs-muted)] hover:text-[var(--cs-text)]'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <M3Switch
              checked={rangeInput.acOn}
              onChange={(checked) => updateRangeInput({ acOn: checked })}
              label="Cabin Climate (AC)"
              description={
                weather
                  ? `Live Open-Meteo ambient ${rangeInput.ambientTempC}°C`
                  : `Ambient ${rangeInput.ambientTempC}°C`
              }
            />
          </div>
        </TonalCard>
      </div>

      {/* Live OpenStreetMap Stations + Firestore Reliability Recommendations */}
      <TonalCard className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[var(--cs-primary)]" />
              <h2 className="font-display text-lg font-semibold">
                Top Compatible &amp; Reachable Chargers
              </h2>
              <DemoLabel kind="live" />
            </div>
            <p className="text-xs text-[var(--cs-muted)] mt-0.5 tabular-nums">
              {report
                ? `${report.summary} (${report.computationMs} ms)`
                : stationsError
                ? stationsError
                : 'Loading live OpenStreetMap Overpass stations...'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {stationsError && (
              <RippleButton
                variant="secondary"
                size="sm"
                onClick={() => void refreshLiveStations(true)}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Live Sync</span>
              </RippleButton>
            )}
            <RippleButton
              variant="tonal"
              size="sm"
              onClick={() => navigate('/app/charging')}
            >
              Open Charging Map
            </RippleButton>
          </div>
        </div>

        {report && report.recommendations.length > 0 ? (
          <div className="divide-y divide-[var(--cs-outline)]">
            {report.recommendations.map((rec, idx) => (
              <div
                key={rec.station.id}
                className="py-4 first:pt-1 last:pb-1 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-[var(--cs-muted)] tabular-nums">
                    <span>0{idx + 1}</span>
                    <span aria-hidden="true">·</span>
                    <span>{rec.station.corridorSegment}</span>
                    <span aria-hidden="true">·</span>
                    <span>{rec.distanceKm} km away</span>
                    <span aria-hidden="true">·</span>
                    <span>Confidence: {rec.confidence}</span>
                  </div>
                  <p className="font-display text-base font-semibold text-[var(--cs-text)] truncate">
                    {rec.station.name}
                  </p>
                  <p className="text-xs text-[var(--cs-muted)] leading-relaxed">
                    {rec.whyThisOne}
                  </p>
                </div>

                <div className="flex items-center gap-5 shrink-0 tabular-nums">
                  <div className="text-right">
                    <span className="text-[11px] text-[var(--cs-muted)] block">
                      Reliability
                    </span>
                    <span className="font-display text-lg font-bold text-[var(--cs-primary)]">
                      {rec.reliability.score}/100
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-[var(--cs-muted)] block">
                      Tariff
                    </span>
                    <span className="font-display text-lg font-bold text-[var(--cs-text)]">
                      ₹{rec.station.pricePerKwhInr}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-[var(--cs-muted)] block">
                      Open Bays
                    </span>
                    <span className="font-display text-lg font-bold text-[var(--cs-text)]">
                      {rec.availableCompatibleBays}/{rec.totalCompatibleBays}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-5 rounded-[16px] bg-[var(--cs-error-container)] flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[var(--cs-error)] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[var(--cs-error)]">
                No compatible stations reachable
              </p>
              <p className="text-xs text-[var(--cs-muted)] mt-1">
                {stationsError ??
                  report?.summary ??
                  'Increase SoC or reduce safety buffer to inspect corridor options.'}
              </p>
            </div>
          </div>
        )}
      </TonalCard>

      {/* Vehicle Health & Quick Actions Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TonalCard tone="surface-2" padding="sm" className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[var(--cs-muted)]">
            <span className="flex items-center gap-1.5">
              <BatteryCharging className="w-4 h-4 text-[var(--cs-primary)]" />
              Battery SoH
            </span>
            <DemoLabel kind="cloud" />
          </div>
          <p className="font-display text-2xl font-bold tabular-nums">
            {activeVehicle.sohPercent}%
          </p>
          <p className="text-xs text-[var(--cs-muted)] tabular-nums">
            {activeVehicle.cycleCount} eq. cycles ·{' '}
            {activeVehicle.odometerKm.toLocaleString()} km
          </p>
        </TonalCard>

        <TonalCard tone="surface-2" padding="sm" className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[var(--cs-muted)]">
            <span className="flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-[var(--cs-secondary)]" />
              Bengaluru → Mysuru
            </span>
            <DemoLabel kind="deterministic" />
          </div>
          <p className="font-display text-2xl font-bold tabular-nums">
            143 km
          </p>
          <p className="text-xs text-[var(--cs-muted)]">
            {rangeBand.likelyKm >= 143 + 20
              ? 'Likely non-stop at current SoC'
              : '1 corridor fast-charge stop advised'}
          </p>
        </TonalCard>

        <TonalCard tone="surface-2" padding="sm" className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[var(--cs-muted)]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[var(--cs-primary)]" />
              Platform Transparency
            </span>
          </div>
          <p className="text-sm font-semibold text-[var(--cs-text)]">
            Live OSM, OSRM, Open-Meteo &amp; Cloud Firestore
          </p>
          <button
            type="button"
            onClick={() => navigate('/about')}
            className="text-xs font-medium text-[var(--cs-primary)] hover:underline cursor-pointer"
          >
            Read About &amp; Limitations →
          </button>
        </TonalCard>
      </div>
    </div>
  );
}
