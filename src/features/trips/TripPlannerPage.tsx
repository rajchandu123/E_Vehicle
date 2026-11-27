import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AlertTriangle,
  BookmarkCheck,
  Clock,
  Navigation,
  Route as RouteIcon,
  Zap,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DemoLabel } from '../../components/DemoBadge';
import { M3Switch } from '../../components/M3Switch';
import { RippleButton } from '../../components/RippleButton';
import { TonalCard } from '../../components/TonalCard';
import { firestoreTripRepo } from '../../data/firestoreRepositories';
import { planTrip, SEEDED_CORRIDORS } from '../../domain/tripPlanner';
import {
  DriveMode,
  RecommendationPreset,
  RouteCorridor,
  RoutingProvider,
  TripPlan,
} from '../../domain/types';
import { auth } from '../../lib/firebase';
import { liveApi } from '../../services/liveApi';
import { useAppStore } from '../../store/useAppStore';

export function TripPlannerPage() {
  const navigate = useNavigate();
  const {
    activeVehicle,
    stations,
    weather,
    rangeInput,
    preset,
    addToast,
  } = useAppStore();

  const [source, setSource] = useState('Bengaluru');
  const [destination, setDestination] = useState('Mysuru');
  const [startingSoc, setStartingSoc] = useState(rangeInput.socPercent);
  const [minArrivalSoc, setMinArrivalSoc] = useState(18);
  const [driveMode, setDriveMode] = useState<DriveMode>(rangeInput.driveMode);
  const [acOn, setAcOn] = useState(rangeInput.acOn);
  const [routePreset, setRoutePreset] = useState<RecommendationPreset>(preset);

  const [corridor, setCorridor] = useState<RouteCorridor>(SEEDED_CORRIDORS[0]);
  const [routingLoading, setRoutingLoading] = useState(false);
  const [routingError, setRoutingError] = useState<string | null>(null);
  const [loggingTrip, setLoggingTrip] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  const fetchOsrmRoute = async (src: string, dst: string) => {
    setRoutingLoading(true);
    setRoutingError(null);
    try {
      const res = await liveApi.fetchRoute(src, dst);
      setCorridor(res.corridor);
    } catch (err) {
      setRoutingError(
        err instanceof Error ? err.message : 'Unable to fetch OSRM route.'
      );
    } finally {
      setRoutingLoading(false);
    }
  };

  useEffect(() => {
    void fetchOsrmRoute('Bengaluru', 'Mysuru');
  }, []);

  const plan: TripPlan | null = useMemo(() => {
    if (!activeVehicle) return null;
    const singleRouteProvider: RoutingProvider = {
      providerName: corridor.providerSource === 'osrm' ? 'OSRM Live' : 'Pilot Corridor',
      listAvailableRoutes: () => [corridor],
      findRoute: () => corridor,
    };
    return planTrip(
      {
        source,
        destination,
        startingSocPercent: startingSoc,
        minArrivalSocPercent: minArrivalSoc,
        driveMode,
        acOn,
        ambientTempC: weather?.temperatureC ?? rangeInput.ambientTempC,
        preset: routePreset,
      },
      activeVehicle,
      stations,
      singleRouteProvider
    );
  }, [
    activeVehicle,
    corridor,
    source,
    destination,
    startingSoc,
    minArrivalSoc,
    driveMode,
    acOn,
    weather,
    rangeInput.ambientTempC,
    routePreset,
    stations,
  ]);

  // Initialize & update Leaflet trip map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current, {
      center: [12.64, 77.08],
      zoom: 9,
      zoomControl: false,
    });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    const group = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerRef.current = group;

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const group = layerRef.current;
    if (!map || !group || !corridor) return;
    group.clearLayers();

    const lineCoords: L.LatLngExpression[] =
      corridor.geometry && corridor.geometry.length > 1
        ? corridor.geometry
        : corridor.waypoints.map((w) => [w.location.lat, w.location.lng]);

    if (lineCoords.length > 1) {
      const polyline = L.polyline(lineCoords, {
        color: '#3DEBB0',
        weight: 4,
        opacity: 0.85,
      }).addTo(group);
      map.fitBounds(polyline.getBounds(), { padding: [36, 36] });
    }

    const startWp = corridor.waypoints[0];
    const endWp = corridor.waypoints[corridor.waypoints.length - 1];
    if (startWp) {
      L.circleMarker([startWp.location.lat, startWp.location.lng], {
        radius: 8,
        color: '#FFFFFF',
        weight: 2.5,
        fillColor: '#8DA6FF',
        fillOpacity: 1,
      })
        .bindTooltip(`Start: ${corridor.source}`, { direction: 'top' })
        .addTo(group);
    }
    if (endWp) {
      L.circleMarker([endWp.location.lat, endWp.location.lng], {
        radius: 8,
        color: '#FFFFFF',
        weight: 2.5,
        fillColor: '#3DEBB0',
        fillOpacity: 1,
      })
        .bindTooltip(`Destination: ${corridor.destination}`, { direction: 'top' })
        .addTo(group);
    }

    if (plan) {
      for (const stop of plan.stops) {
        L.circleMarker([stop.station.location.lat, stop.station.location.lng], {
          radius: 10,
          color: '#0B0D10',
          weight: 2.5,
          fillColor: '#FFC876',
          fillOpacity: 1,
        })
          .bindTooltip(
            `Charge Stop: ${stop.station.name} (${stop.arrivalSocPercent}% → ${stop.departSocPercent}%)`,
            { direction: 'top' }
          )
          .addTo(group);
      }
    }
  }, [corridor, plan]);

  const handlePlanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void fetchOsrmRoute(source, destination);
  };

  const handleLogTrip = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !activeVehicle || !plan) return;
    setLoggingTrip(true);
    try {
      const avgWhKm = Math.round(
        (plan.totalEnergyNeededKwh * 1000) / Math.max(1, plan.totalDistanceKm)
      );
      const ecoScore = Math.max(
        50,
        Math.min(99, Math.round(105 - (avgWhKm - 115) * 0.45))
      );
      await firestoreTripRepo.logTrip(uid, {
        vehicleId: activeVehicle.id,
        date: new Date().toISOString().slice(0, 10),
        origin: corridor.source,
        destination: corridor.destination,
        distanceKm: plan.totalDistanceKm,
        energyUsedKwh: plan.totalEnergyNeededKwh,
        costInr: plan.totalEstimatedCostInr,
        avgEfficiencyWhKm: Math.max(80, Math.min(450, avgWhKm)),
        ecoScore,
      });
      addToast({
        title: 'Trip logged to Cloud Firestore',
        detail: `${corridor.source} → ${corridor.destination} (${plan.totalDistanceKm} km)`,
        tone: 'success',
      });
    } catch (err) {
      addToast({
        title: 'Unable to log trip',
        detail: err instanceof Error ? err.message : 'Error saving trip',
        tone: 'error',
      });
    } finally {
      setLoggingTrip(false);
    }
  };

  if (!activeVehicle) {
    return (
      <TonalCard className="max-w-lg space-y-3">
        <h1 className="font-display text-xl font-bold">Add an EV First</h1>
        <p className="text-sm text-[var(--cs-muted)]">
          Trip planning requires an active electric vehicle in your Cloud Firestore garage.
        </p>
        <RippleButton variant="primary" onClick={() => navigate('/onboarding')}>
          Open Profile &amp; EV Setup
        </RippleButton>
      </TonalCard>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[var(--cs-muted)]">
            <span>OSRM Road Routing + Deterministic Charging Stops</span>
            <span aria-hidden="true">·</span>
            <DemoLabel kind="live" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mt-1">
            Corridor Trip Planner
          </h1>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            ['Bengaluru', 'Mysuru'],
            ['Mysuru', 'Bengaluru'],
            ['Bengaluru', 'Nandi Hills'],
            ['Bengaluru', 'Madikeri'],
          ].map(([s, d]) => (
            <button
              key={`${s}-${d}`}
              type="button"
              onClick={() => {
                setSource(s);
                setDestination(d);
                void fetchOsrmRoute(s, d);
              }}
              className="min-h-[34px] px-3 rounded-[10px] text-xs font-medium bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] hover:border-[var(--cs-primary)] text-[var(--cs-text)] cursor-pointer"
            >
              {s} → {d}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Controls */}
        <TonalCard className="lg:col-span-5 space-y-4">
          <form onSubmit={handlePlanSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--cs-muted)] mb-1">
                  Origin City / Landmark
                </label>
                <input
                  type="text"
                  required
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--cs-muted)] mb-1">
                  Destination
                </label>
                <input
                  type="text"
                  required
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1 tabular-nums">
                <span className="text-[var(--cs-muted)]">Starting Battery SoC</span>
                <span className="font-semibold text-[var(--cs-primary)]">{startingSoc}%</span>
              </div>
              <input
                type="range"
                min={5}
                max={100}
                value={startingSoc}
                onChange={(e) => setStartingSoc(Number(e.target.value))}
                className="w-full accent-[var(--cs-primary)] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1 tabular-nums">
                <span className="text-[var(--cs-muted)]">Target Arrival Reserve</span>
                <span className="font-semibold">{minArrivalSoc}%</span>
              </div>
              <input
                type="range"
                min={5}
                max={35}
                value={minArrivalSoc}
                onChange={(e) => setMinArrivalSoc(Number(e.target.value))}
                className="w-full accent-[var(--cs-primary)] cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="block text-xs text-[var(--cs-muted)] mb-1">Drive Mode</span>
                <select
                  value={driveMode}
                  onChange={(e) => setDriveMode(e.target.value as DriveMode)}
                  className="w-full min-h-[40px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-xs"
                >
                  <option value="eco">Eco</option>
                  <option value="city">City</option>
                  <option value="sport">Sport</option>
                </select>
              </div>
              <div>
                <span className="block text-xs text-[var(--cs-muted)] mb-1">Stop Priority</span>
                <select
                  value={routePreset}
                  onChange={(e) =>
                    setRoutePreset(e.target.value as RecommendationPreset)
                  }
                  className="w-full min-h-[40px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-xs"
                >
                  <option value="balanced">Balanced</option>
                  <option value="fastest">Fastest</option>
                  <option value="cheapest">Cheapest</option>
                  <option value="most_reliable">Most Reliable</option>
                </select>
              </div>
            </div>

            <M3Switch
              checked={acOn}
              onChange={setAcOn}
              label="Cabin AC Active"
              description={`Ambient ${weather?.temperatureC ?? rangeInput.ambientTempC}°C`}
            />

            <RippleButton
              type="submit"
              variant="primary"
              className="w-full"
              disabled={routingLoading}
            >
              <Navigation className="w-4 h-4" />
              <span>
                {routingLoading ? 'Calculating OSRM Route...' : 'Calculate Real Route'}
              </span>
            </RippleButton>
          </form>

          {routingError && (
            <div
              role="alert"
              className="p-3 rounded-[12px] bg-[var(--cs-error-container)] text-xs text-[var(--cs-error)]"
            >
              {routingError}
            </div>
          )}

          {plan && (
            <div className="pt-4 border-t border-[var(--cs-outline)] space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center tabular-nums">
                <div className="p-2.5 rounded-[12px] bg-[var(--cs-surface-2)]">
                  <span className="text-[11px] text-[var(--cs-muted)] block">Distance</span>
                  <span className="font-display text-base font-bold">
                    {plan.totalDistanceKm} km
                  </span>
                </div>
                <div className="p-2.5 rounded-[12px] bg-[var(--cs-surface-2)]">
                  <span className="text-[11px] text-[var(--cs-muted)] block">Total Time</span>
                  <span className="font-display text-base font-bold">
                    {plan.totalMinutes} min
                  </span>
                </div>
                <div className="p-2.5 rounded-[12px] bg-[var(--cs-primary-container)]">
                  <span className="text-[11px] text-[var(--cs-primary)] block">Arrival SoC</span>
                  <span className="font-display text-base font-bold text-[var(--cs-primary)]">
                    {plan.finalArrivalSocPercent}%
                  </span>
                </div>
                <div className="p-2.5 rounded-[12px] bg-[var(--cs-surface-2)]">
                  <span className="text-[11px] text-[var(--cs-muted)] block">Charge Cost</span>
                  <span className="font-display text-base font-bold">
                    ₹{plan.totalEstimatedCostInr}
                  </span>
                </div>
              </div>

              <p className="text-xs text-[var(--cs-muted)] leading-relaxed">
                {plan.narrative}
              </p>

              {!plan.feasible && (
                <div className="p-3 rounded-[12px] bg-[var(--cs-error-container)] text-xs text-[var(--cs-error)] flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{plan.warnings[0] ?? 'Route infeasible at current SoC.'}</span>
                </div>
              )}

              {plan.feasible && (
                <RippleButton
                  variant="tonal"
                  size="sm"
                  className="w-full"
                  disabled={loggingTrip}
                  onClick={() => void handleLogTrip()}
                >
                  <BookmarkCheck className="w-4 h-4" />
                  <span>
                    {loggingTrip ? 'Saving...' : 'Save Trip to Analytics History'}
                  </span>
                </RippleButton>
              )}
            </div>
          )}
        </TonalCard>

        {/* Right Map + Charging Stops Timeline */}
        <div className="lg:col-span-7 space-y-5">
          <div className="relative rounded-[22px] overflow-hidden border border-[var(--cs-outline)] bg-[var(--cs-surface-2)] h-[360px] sm:h-[420px]">
            <div
              ref={mapContainerRef}
              className="w-full h-full z-0"
              aria-label="Route map with charging stops"
            />
            <div className="absolute bottom-3 left-3 z-[400] px-3 py-1.5 rounded-[12px] bg-[var(--cs-surface-1)]/92 backdrop-blur-md border border-[var(--cs-outline)] text-[11px] text-[var(--cs-muted)]">
              {corridor.providerSource === 'osrm'
                ? 'Live OSRM road geometry · OpenStreetMap'
                : 'Pilot corridor route'}
            </div>
          </div>

          <TonalCard className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold flex items-center gap-2">
                <RouteIcon className="w-4 h-4 text-[var(--cs-primary)]" />
                <span>Recommended Charging Stops ({plan?.stops.length ?? 0})</span>
              </h2>
              <span className="text-xs text-[var(--cs-muted)] tabular-nums">
                Energy needed: {plan?.totalEnergyNeededKwh ?? 0} kWh
              </span>
            </div>

            {plan && plan.stops.length > 0 ? (
              <div className="space-y-3">
                {plan.stops.map((stop, idx) => (
                  <div
                    key={`${stop.station.id}-${idx}`}
                    className="p-4 rounded-[16px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-[var(--cs-primary)] font-medium tabular-nums">
                        <Zap className="w-3.5 h-3.5" />
                        <span>
                          Stop {idx + 1} · km {stop.kmFromStart} · {stop.arrivalSocPercent}% →{' '}
                          {stop.departSocPercent}% SoC
                        </span>
                      </div>
                      <p className="font-display text-sm font-semibold text-[var(--cs-text)]">
                        {stop.station.name}
                      </p>
                      <p className="text-xs text-[var(--cs-muted)]">{stop.reason}</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs tabular-nums shrink-0">
                      <div className="text-right">
                        <span className="text-[var(--cs-muted)] block">Charge Time</span>
                        <span className="font-semibold flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {stop.chargeDurationMinutes} min
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[var(--cs-muted)] block">Est. Cost</span>
                        <span className="font-semibold">₹{stop.estimatedCostInr}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--cs-muted)]">
                {plan?.feasible
                  ? 'No intermediate charging stops needed for this trip.'
                  : 'Adjust starting SoC or reserve target to evaluate stops.'}
              </p>
            )}
          </TonalCard>
        </div>
      </div>
    </div>
  );
}
