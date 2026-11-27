import {
  AlertTriangle,
  BatteryCharging,
  Filter,
  Search,
  ShieldCheck,
  Sliders,
  Zap,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DemoLabel } from '../../components/DemoBadge';
import { RippleButton } from '../../components/RippleButton';
import { CardSkeleton } from '../../components/Skeleton';
import { TonalCard } from '../../components/TonalCard';
import { repositories } from '../../data/mockRepositories';
import { filterCompatibleStations } from '../../domain/compatibility';
import { PRESET_WEIGHTS, recommendStations } from '../../domain/recommendation';
import { computeReliability } from '../../domain/reliability';
import {
  IssueType,
  RecommendationPreset,
  RecommendationWeights,
  Station,
} from '../../domain/types';
import { BENGALURU_ORIGIN } from '../../services/orchestrators';
import { useAppStore } from '../../store/useAppStore';
import { ChargingMap } from './ChargingMap';
import { CheckInForm } from './CheckInForm';

const PRESETS: { id: RecommendationPreset; label: string }[] = [
  { id: 'balanced', label: 'Balanced' },
  { id: 'fastest', label: 'Fastest' },
  { id: 'cheapest', label: 'Cheapest' },
  { id: 'most_reliable', label: 'Most Reliable' },
  { id: 'custom', label: 'Custom' },
];

export function ChargingPage() {
  const navigate = useNavigate();
  const {
    activeUser,
    activeVehicle,
    rangeBand,
    rangeInput,
    preset,
    setPreset,
    trigger55PercentDemo,
    addToast,
  } = useAppStore();

  // Direct MockStationRepo integration for Charging Map data visualization
  const [stations, setStations] = useState<Station[]>([]);
  const [loadingStations, setLoadingStations] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [maxPriceInr, setMaxPriceInr] = useState<number>(25);
  const [minPowerKw, setMinPowerKw] = useState<number>(0);
  const [useMinRangeForSafety, setUseMinRangeForSafety] = useState(false);
  const [showExcludedOnMap, setShowExcludedOnMap] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);

  const [customWeights, setCustomWeights] = useState<RecommendationWeights>(
    PRESET_WEIGHTS.balanced
  );

  // Fetch stations from MockStationRepo on mount
  useEffect(() => {
    let active = true;
    setLoadingStations(true);
    repositories.stations
      .listStations()
      .then((list) => {
        if (!active) return;
        setStations(list);
        setLoadingStations(false);
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(
          err instanceof Error ? err.message : 'Failed to load station repo'
        );
        setLoadingStations(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Text search pre-filter (keeps compatibility & ranking deterministic)
  const searchFilteredStations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return stations;
    return stations.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.operator.toLowerCase().includes(q) ||
        s.corridorSegment.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q)
    );
  }, [stations, searchQuery]);

  // Run 3-step deterministic recommendation engine
  const report = useMemo(() => {
    if (!activeVehicle || !rangeBand || searchFilteredStations.length === 0) {
      return null;
    }
    return recommendStations(activeVehicle, searchFilteredStations, {
      origin: BENGALURU_ORIGIN,
      rangeBand,
      preset,
      customWeights: preset === 'custom' ? customWeights : undefined,
      maxPriceInr: maxPriceInr < 25 ? maxPriceInr : undefined,
      minPowerKw: minPowerKw > 0 ? minPowerKw : undefined,
      maxResults: 25,
      useMinRangeForSafety,
    });
  }, [
    activeVehicle,
    rangeBand,
    searchFilteredStations,
    preset,
    customWeights,
    maxPriceInr,
    minPowerKw,
    useMinRangeForSafety,
  ]);

  // Also extract excluded list for map inspection & transparency
  const compatibilityBreakdown = useMemo(() => {
    if (!activeVehicle || !rangeBand) return null;
    const reachableKm = useMinRangeForSafety
      ? rangeBand.minKm
      : rangeBand.likelyKm;
    return filterCompatibleStations(activeVehicle, searchFilteredStations, {
      origin: BENGALURU_ORIGIN,
      reachableKm,
      maxPriceInr: maxPriceInr < 25 ? maxPriceInr : undefined,
      minPowerKw: minPowerKw > 0 ? minPowerKw : undefined,
    });
  }, [
    activeVehicle,
    rangeBand,
    searchFilteredStations,
    useMinRangeForSafety,
    maxPriceInr,
    minPowerKw,
  ]);

  // Default select top recommendation when list updates and nothing is selected
  useEffect(() => {
    if (!report) return;
    if (
      selectedStationId &&
      stations.some((s) => s.id === selectedStationId)
    ) {
      return;
    }
    if (report.recommendations.length > 0) {
      setSelectedStationId(report.recommendations[0].station.id);
    }
  }, [report, selectedStationId, stations]);

  const selectedStation = useMemo(
    () => stations.find((s) => s.id === selectedStationId) ?? null,
    [stations, selectedStationId]
  );

  const selectedRec = useMemo(
    () =>
      report?.recommendations.find((r) => r.station.id === selectedStationId) ??
      null,
    [report, selectedStationId]
  );

  const selectedReliability = useMemo(
    () => (selectedStation ? computeReliability(selectedStation) : null),
    [selectedStation]
  );

  const selectedExclusion = useMemo(
    () =>
      compatibilityBreakdown?.excluded.find(
        (e) => e.station.id === selectedStationId
      ) ?? null,
    [compatibilityBreakdown, selectedStationId]
  );

  const handleCheckInSubmit = async (payload: {
    stationId: string;
    outcome: 'worked' | 'not_working';
    issueType: IssueType;
    comment: string;
  }) => {
    const updated = await repositories.stations.addCheckIn(payload.stationId, {
      userId: activeUser?.id ?? 'usr-ananya',
      userName: activeUser?.name ?? 'Demo Driver',
      outcome: payload.outcome,
      issueType: payload.issueType,
      comment: payload.comment,
    });

    // Refresh local repo state and sync global store stations
    const freshList = await repositories.stations.listStations();
    setStations(freshList);
    useAppStore.setState({ stations: freshList });

    const newRel = computeReliability(updated);
    addToast({
      title: `Check-in saved for ${updated.name}`,
      detail: `Reliability score updated to ${newRel.score}/100 (${newRel.confidence} confidence)`,
      tone: payload.outcome === 'worked' ? 'success' : 'warning',
    });
  };

  if (loadingStations || !activeVehicle || !rangeBand) {
    return (
      <div className="space-y-6">
        <CardSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <CardSkeleton />
          </div>
          <div className="lg:col-span-5">
            <CardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <TonalCard className="max-w-lg space-y-3">
        <h1 className="font-display text-xl font-bold text-[var(--cs-error)]">
          Unable to load station repository
        </h1>
        <p className="text-sm text-[var(--cs-muted)]">{loadError}</p>
        <RippleButton variant="tonal" onClick={() => navigate('/app')}>
          Back to Home
        </RippleButton>
      </TonalCard>
    );
  }

  const reachableKm = useMinRangeForSafety
    ? rangeBand.minKm
    : rangeBand.likelyKm;

  return (
    <div className="space-y-6">
      {/* Header & 55% Scenario Shortcut */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[var(--cs-muted)]">
            <span>Bengaluru – Mysuru Corridor</span>
            <span aria-hidden="true">·</span>
            <span>MockStationRepo ({stations.length} stations)</span>
            <span aria-hidden="true">·</span>
            <DemoLabel kind="demo" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mt-1">
            Charging Map &amp; Reliability Explorer
          </h1>
          <p className="text-sm text-[var(--cs-muted)] mt-1 tabular-nums">
            Showing stations compatible with{' '}
            <strong className="text-[var(--cs-text)] font-medium">
              {activeVehicle.make} {activeVehicle.model}
            </strong>{' '}
            ({activeVehicle.connectors.join(' / ')}) inside your{' '}
            <strong className="text-[var(--cs-primary)] font-semibold">
              {reachableKm} km
            </strong>{' '}
            reachable range at {rangeInput.socPercent}% SoC.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <RippleButton
            variant="primary"
            size="sm"
            onClick={trigger55PercentDemo}
          >
            <BatteryCharging className="w-4 h-4" />
            <span>55% Battery Shortcut</span>
          </RippleButton>
          <RippleButton
            variant="tonal"
            size="sm"
            onClick={() => navigate('/onboarding')}
          >
            Change EV
          </RippleButton>
        </div>
      </div>

      {/* Filter & Preset Toolbar */}
      <TonalCard padding="sm" className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Segmented Preset Control */}
          <div
            role="group"
            aria-label="Recommendation ranking preset"
            className="flex flex-wrap items-center gap-1 p-1 rounded-[14px] bg-[var(--cs-surface-2)]"
          >
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreset(p.id)}
                className={`min-h-[36px] px-3 rounded-[10px] text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                  preset === p.id
                    ? 'bg-[var(--cs-primary)] text-[var(--cs-primary-ink)]'
                    : 'text-[var(--cs-muted)] hover:text-[var(--cs-text)]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Search & Quick Caps */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 sm:flex-initial min-w-[210px]">
              <Search className="w-4 h-4 text-[var(--cs-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search hub, Mandya, operator..."
                aria-label="Search stations"
                className="w-full min-h-[38px] pl-9 pr-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-xs text-[var(--cs-text)]"
              />
            </div>

            <select
              aria-label="Maximum tariff filter"
              value={maxPriceInr}
              onChange={(e) => setMaxPriceInr(Number(e.target.value))}
              className="min-h-[38px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-xs text-[var(--cs-text)] tabular-nums"
            >
              <option value={25}>Any price</option>
              <option value={15}>Under ₹15/kWh</option>
              <option value={18}>Under ₹18/kWh</option>
              <option value={20}>Under ₹20/kWh</option>
            </select>

            <select
              aria-label="Minimum power filter"
              value={minPowerKw}
              onChange={(e) => setMinPowerKw(Number(e.target.value))}
              className="min-h-[38px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-xs text-[var(--cs-text)] tabular-nums"
            >
              <option value={0}>Any speed</option>
              <option value={30}>30+ kW DC</option>
              <option value={50}>50+ kW Fast</option>
              <option value={120}>120+ kW Ultra-Fast</option>
            </select>

            <button
              type="button"
              onClick={() => setUseMinRangeForSafety((v) => !v)}
              className={`min-h-[38px] px-3 rounded-[12px] border text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                useMinRangeForSafety
                  ? 'bg-[var(--cs-warning-container)] text-[var(--cs-warning)] border-[var(--cs-warning)]/40'
                  : 'bg-[var(--cs-surface-2)] text-[var(--cs-muted)] border-[var(--cs-outline)]'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>
                {useMinRangeForSafety
                  ? `Conservative (${rangeBand.minKm} km)`
                  : `Likely (${rangeBand.likelyKm} km)`}
              </span>
            </button>
          </div>
        </div>

        {/* Custom Weight Sliders */}
        {preset === 'custom' && (
          <div className="pt-3 border-t border-[var(--cs-outline)] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {(
              [
                ['reliability', 'Reliability'],
                ['speed', 'Charge Speed'],
                ['price', 'Tariff'],
                ['detour', 'Detour'],
                ['eta', 'ETA'],
                ['availability', 'Free Bays'],
              ] as [keyof RecommendationWeights, string][]
            ).map(([key, label]) => (
              <div key={key}>
                <div className="flex items-center justify-between text-[11px] text-[var(--cs-muted)] mb-1 tabular-nums">
                  <span className="flex items-center gap-1">
                    <Sliders className="w-3 h-3" />
                    {label}
                  </span>
                  <span>{Math.round(customWeights[key] * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={50}
                  value={Math.round(customWeights[key] * 100)}
                  onChange={(e) =>
                    setCustomWeights((prev) => ({
                      ...prev,
                      [key]: Number(e.target.value) / 100,
                    }))
                  }
                  className="w-full accent-[var(--cs-primary)] cursor-pointer"
                />
              </div>
            ))}
          </div>
        )}

        {/* Deterministic Filter Audit Summary */}
        {report && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--cs-muted)] pt-2 border-t border-[var(--cs-outline)] tabular-nums">
            <span>
              {report.summary} Engine runtime: {report.computationMs} ms.
            </span>
            <span>
              Excluded: {report.excludedByReason.out_of_range} out of range ·{' '}
              {report.excludedByReason.incompatible_connector} wrong port ·{' '}
              {report.excludedByReason.offline} offline
              {report.excludedByReason.price_exceeded > 0
                ? ` · ${report.excludedByReason.price_exceeded} over tariff`
                : ''}
              {report.excludedByReason.power_below_min > 0
                ? ` · ${report.excludedByReason.power_below_min} below min kW`
                : ''}
            </span>
          </div>
        )}
      </TonalCard>

      {/* Main Split Workspace: Leaflet Map (left) + Selected Station & Ranked List (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-4">
          <ChargingMap
            origin={BENGALURU_ORIGIN}
            rangeBand={rangeBand}
            recommendations={report?.recommendations ?? []}
            fallbackId={report?.fallback?.station.id ?? null}
            excludedStations={compatibilityBreakdown?.excluded ?? []}
            showExcluded={showExcludedOnMap}
            onToggleExcluded={setShowExcludedOnMap}
            selectedStationId={selectedStationId}
            onSelectStation={setSelectedStationId}
          />

          {/* Fallback Option Banner */}
          {report?.fallback && (
            <TonalCard tone="surface-2" padding="sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-[var(--cs-secondary)] font-medium">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>Recommended Plan B (Fallback Station)</span>
                  </div>
                  <p className="font-display text-sm font-semibold text-[var(--cs-text)] truncate">
                    {report.fallback.station.name}
                  </p>
                  <p className="text-xs text-[var(--cs-muted)] tabular-nums">
                    {report.fallback.reliability.score}/100 reliability ·{' '}
                    {report.fallback.availableCompatibleBays}/
                    {report.fallback.totalCompatibleBays} bays open ·{' '}
                    {report.fallback.distanceKm} km away
                  </p>
                </div>
                <RippleButton
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedStationId(report.fallback!.station.id)}
                >
                  Inspect Fallback
                </RippleButton>
              </div>
            </TonalCard>
          )}
        </div>

        {/* Right Column: Selected Station Details + Check-In + Ranked List */}
        <div className="lg:col-span-5 space-y-5">
          {selectedStation && selectedReliability ? (
            <TonalCard className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-[var(--cs-muted)] tabular-nums">
                    <span>{selectedStation.operator}</span>
                    <span aria-hidden="true">·</span>
                    <span>KM {selectedStation.kmFromBengaluru}</span>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize">{selectedStation.status}</span>
                  </div>
                  <h2 className="font-display text-lg font-bold text-[var(--cs-text)] mt-0.5">
                    {selectedStation.name}
                  </h2>
                  <p className="text-xs text-[var(--cs-muted)] mt-0.5">
                    {selectedStation.address}
                  </p>
                </div>

                <div className="text-right shrink-0 tabular-nums">
                  <span className="text-[11px] text-[var(--cs-muted)] block">
                    Reliability
                  </span>
                  <span className="font-display text-2xl font-bold text-[var(--cs-primary)]">
                    {selectedReliability.score}
                  </span>
                  <span className="text-xs text-[var(--cs-muted)]">/100</span>
                </div>
              </div>

              {selectedExclusion ? (
                <div className="p-3.5 rounded-[14px] bg-[var(--cs-error-container)] text-xs text-[var(--cs-error)] flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Excluded for your active vehicle:{' '}
                    {selectedExclusion.reasons.join(', ').replaceAll('_', ' ')}.
                  </span>
                </div>
              ) : selectedRec ? (
                <p className="text-xs text-[var(--cs-muted)] leading-relaxed p-3 rounded-[14px] bg-[var(--cs-surface-2)]">
                  {selectedRec.whyThisOne}
                </p>
              ) : null}

              {/* Connectors & Tariff */}
              <div className="grid grid-cols-2 gap-2.5 text-xs tabular-nums">
                {selectedStation.connectors.map((c, idx) => {
                  const compatible = activeVehicle.connectors.includes(c.type);
                  return (
                    <div
                      key={`${c.type}-${idx}`}
                      className={`p-3 rounded-[14px] border ${
                        compatible
                          ? 'bg-[var(--cs-surface-2)] border-[var(--cs-outline-strong)]'
                          : 'bg-[var(--cs-surface-2)]/50 border-[var(--cs-outline)] opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[var(--cs-text)]">
                          {c.type}
                        </span>
                        <span className="text-[var(--cs-primary)] font-medium">
                          {c.powerKw} kW
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--cs-muted)] mt-1">
                        {c.availableBays}/{c.totalBays} bays free ·{' '}
                        {compatible ? 'Fits EV' : 'Incompatible'}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Bayesian Reliability Reasons */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--cs-text)]">
                    Reliability Breakdown
                  </span>
                  <span className="text-[var(--cs-muted)] capitalize tabular-nums">
                    {selectedReliability.confidence} confidence ({selectedReliability.effectiveSamples} eff. obs)
                  </span>
                </div>
                <ul className="space-y-1 text-xs text-[var(--cs-muted)] list-disc pl-4">
                  {selectedReliability.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>

              {/* Recent Check-Ins */}
              {selectedStation.checkIns.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[var(--cs-outline)]">
                  <span className="block text-xs font-semibold text-[var(--cs-text)]">
                    Recent Driver Check-Ins ({selectedStation.checkIns.length})
                  </span>
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {selectedStation.checkIns.slice(0, 4).map((chk) => (
                      <div
                        key={chk.id}
                        className="text-xs p-2.5 rounded-[12px] bg-[var(--cs-surface-2)]"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-[var(--cs-text)]">
                            {chk.userName}
                          </span>
                          <span
                            className={
                              chk.outcome === 'worked'
                                ? 'text-[var(--cs-primary)] font-medium'
                                : 'text-[var(--cs-error)] font-medium'
                            }
                          >
                            {chk.outcome === 'worked' ? 'Worked' : chk.issueType.replaceAll('_', ' ')}
                          </span>
                        </div>
                        <p className="text-[var(--cs-muted)] mt-0.5">
                          {chk.comment}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Check-in Submission Form */}
              <CheckInForm
                stationId={selectedStation.id}
                stationName={selectedStation.name}
                onSubmit={handleCheckInSubmit}
              />
            </TonalCard>
          ) : null}

          {/* Ranked Compatible List */}
          <TonalCard padding="sm" className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 text-[var(--cs-primary)]" />
                <span>
                  Compatible Stations ({report?.recommendations.length ?? 0})
                </span>
              </h3>
              <DemoLabel kind="demo" />
            </div>

            {report && report.recommendations.length > 0 ? (
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {report.recommendations.map((rec, idx) => {
                  const isSelected = rec.station.id === selectedStationId;
                  return (
                    <button
                      key={rec.station.id}
                      type="button"
                      onClick={() => setSelectedStationId(rec.station.id)}
                      className={`w-full text-left p-3.5 rounded-[16px] border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--cs-primary-container)] border-[var(--cs-primary)]'
                          : 'bg-[var(--cs-surface-2)] border-[var(--cs-outline)] hover:border-[var(--cs-outline-strong)]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[11px] text-[var(--cs-muted)] tabular-nums">
                            #{idx + 1} · {rec.station.corridorSegment} · {rec.distanceKm} km ({rec.etaMinutes} min)
                          </div>
                          <p className="text-sm font-semibold text-[var(--cs-text)] truncate mt-0.5">
                            {rec.station.name}
                          </p>
                        </div>
                        <span className="font-display text-sm font-bold tabular-nums text-[var(--cs-primary)] shrink-0">
                          {rec.reliability.score}/100
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-[var(--cs-muted)] mt-1.5 tabular-nums">
                        <span>{rec.effectiveChargeKw} kW max</span>
                        <span aria-hidden="true">·</span>
                        <span>₹{rec.station.pricePerKwhInr}/kWh</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {rec.availableCompatibleBays}/{rec.totalCompatibleBays} bays free
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-[14px] bg-[var(--cs-surface-2)] text-xs text-[var(--cs-muted)] space-y-2">
                <p className="font-semibold text-[var(--cs-text)]">
                  No compatible stations match your current range &amp; filters.
                </p>
                <p>
                  Try the 55% Battery Shortcut, loosen tariff/power filters, or
                  toggle "Show Excluded" on the map to see why stations were
                  filtered out.
                </p>
              </div>
            )}
          </TonalCard>
        </div>
      </div>
    </div>
  );
}
