import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed, Layers } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { SEEDED_CORRIDORS } from '../../domain/tripPlanner';
import {
  ExcludedStation,
  GeoPoint,
  RangeBand,
  StationRecommendation,
} from '../../domain/types';

interface ChargingMapProps {
  origin: GeoPoint;
  rangeBand: RangeBand;
  recommendations: StationRecommendation[];
  fallbackId: string | null;
  excludedStations: ExcludedStation[];
  showExcluded: boolean;
  onToggleExcluded: (show: boolean) => void;
  selectedStationId: string | null;
  onSelectStation: (stationId: string) => void;
}

export function ChargingMap({
  origin,
  rangeBand,
  recommendations,
  fallbackId,
  excludedStations,
  showExcluded,
  onToggleExcluded,
  selectedStationId,
  onSelectStation,
}: ChargingMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Initialize Leaflet map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [12.64, 77.08],
      zoom: 9,
      zoomControl: false,
      attributionControl: true,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const group = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerGroupRef.current = group;
    setMapReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  // Re-render markers, range circles, and corridor line when data changes
  useEffect(() => {
    const map = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group || !mapReady) return;

    group.clearLayers();

    // 1. Bengaluru-Mysuru corridor polyline
    const corridor = SEEDED_CORRIDORS[0];
    if (corridor) {
      const latlngs: L.LatLngExpression[] = corridor.waypoints.map((w) => [
        w.location.lat,
        w.location.lng,
      ]);
      L.polyline(latlngs, {
        color: '#8DA6FF',
        weight: 3,
        opacity: 0.55,
        dashArray: '6 8',
      }).addTo(group);
    }

    // 2. Reachable range circles (likely & conservative min)
    if (rangeBand.likelyKm > 0) {
      L.circle([origin.lat, origin.lng], {
        radius: rangeBand.likelyKm * 1000,
        color: '#3DEBB0',
        weight: 1.5,
        opacity: 0.55,
        fillColor: '#3DEBB0',
        fillOpacity: 0.06,
      }).addTo(group);
    }

    if (rangeBand.minKm > 0) {
      L.circle([origin.lat, origin.lng], {
        radius: rangeBand.minKm * 1000,
        color: '#FFC876',
        weight: 1,
        dashArray: '4 6',
        opacity: 0.5,
        fill: false,
      }).addTo(group);
    }

    // 3. Vehicle Origin Pin
    L.circleMarker([origin.lat, origin.lng], {
      radius: 8,
      color: '#FFFFFF',
      weight: 2.5,
      fillColor: '#8DA6FF',
      fillOpacity: 1,
    })
      .bindTooltip('Vehicle Origin (Bengaluru)', { direction: 'top' })
      .addTo(group);

    // 4. Excluded stations (optional layer)
    if (showExcluded) {
      for (const item of excludedStations) {
        const isSelected = item.station.id === selectedStationId;
        const marker = L.circleMarker(
          [item.station.location.lat, item.station.location.lng],
          {
            radius: isSelected ? 8 : 5,
            color: isSelected ? '#FFFFFF' : '#FF6B81',
            weight: isSelected ? 2 : 1,
            fillColor: '#FF6B81',
            fillOpacity: 0.45,
          }
        );
        marker.bindTooltip(
          `${item.station.name} · Excluded (${item.reasons.join(', ')})`,
          { direction: 'top' }
        );
        marker.on('click', () => onSelectStation(item.station.id));
        marker.addTo(group);
      }
    }

    // 5. Compatible & Recommended Stations
    recommendations.forEach((rec, idx) => {
      const isSelected = rec.station.id === selectedStationId;
      const isTop = idx === 0;
      const isFallback = rec.station.id === fallbackId;

      const fillColor =
        rec.availableCompatibleBays === 0
          ? '#FFC876'
          : rec.reliability.score >= 80
          ? '#3DEBB0'
          : '#8DA6FF';

      const marker = L.circleMarker(
        [rec.station.location.lat, rec.station.location.lng],
        {
          radius: isSelected ? 11 : isTop || isFallback ? 9 : 7,
          color: isSelected ? '#FFFFFF' : '#0B0D10',
          weight: isSelected ? 3 : 2,
          fillColor,
          fillOpacity: 0.95,
        }
      );

      const roleTag = isTop
        ? ' · Top Pick'
        : isFallback
        ? ' · Fallback'
        : '';

      marker.bindTooltip(
        `${rec.station.name}${roleTag} — ${rec.reliability.score}/100 · ₹${rec.station.pricePerKwhInr}/kWh`,
        { direction: 'top' }
      );
      marker.on('click', () => onSelectStation(rec.station.id));
      marker.addTo(group);
    });
  }, [
    mapReady,
    origin,
    rangeBand,
    recommendations,
    fallbackId,
    excludedStations,
    showExcluded,
    selectedStationId,
    onSelectStation,
  ]);

  // Gently pan to selected station if outside immediate focus
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedStationId) return;
    const match =
      recommendations.find((r) => r.station.id === selectedStationId)?.station ??
      excludedStations.find((e) => e.station.id === selectedStationId)?.station;
    if (match) {
      map.panTo([match.location.lat, match.location.lng], { animate: true });
    }
  }, [selectedStationId, recommendations, excludedStations]);

  const handleRecenter = () => {
    mapRef.current?.setView([12.64, 77.08], 9, { animate: true });
  };

  return (
    <div className="relative rounded-[22px] overflow-hidden border border-[var(--cs-outline)] bg-[var(--cs-surface-2)] h-[380px] sm:h-[460px] lg:h-[560px]">
      <div
        ref={containerRef}
        className="w-full h-full z-0"
        aria-label="Interactive Bengaluru to Mysuru EV charging station map"
      />

      {/* Map Floating Controls */}
      <div className="absolute top-3 left-3 right-3 z-[400] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3 px-3.5 py-2 rounded-[14px] bg-[var(--cs-surface-1)]/92 backdrop-blur-md border border-[var(--cs-outline)] text-xs tabular-nums shadow-sm">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3DEBB0] inline-block" />
            <span>High trust</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8DA6FF] inline-block" />
            <span>Compatible</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFC876] inline-block" />
            <span>Busy</span>
          </span>
          {showExcluded && (
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF6B81] inline-block" />
              <span>Excluded</span>
            </span>
          )}
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleExcluded(!showExcluded)}
            className={`min-h-[36px] px-3 rounded-[12px] text-xs font-medium inline-flex items-center gap-1.5 border backdrop-blur-md cursor-pointer transition-colors ${
              showExcluded
                ? 'bg-[var(--cs-error-container)] text-[var(--cs-error)] border-[var(--cs-error)]/40'
                : 'bg-[var(--cs-surface-1)]/92 text-[var(--cs-text)] border-[var(--cs-outline)] hover:bg-[var(--cs-surface-2)]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{showExcluded ? 'Hide Excluded' : `Show Excluded (${excludedStations.length})`}</span>
          </button>

          <button
            type="button"
            onClick={handleRecenter}
            aria-label="Re-center map on Bengaluru–Mysuru corridor"
            className="min-h-[36px] px-3 rounded-[12px] text-xs font-medium inline-flex items-center gap-1.5 bg-[var(--cs-surface-1)]/92 text-[var(--cs-text)] border border-[var(--cs-outline)] backdrop-blur-md hover:bg-[var(--cs-surface-2)] cursor-pointer"
          >
            <LocateFixed className="w-3.5 h-3.5" />
            <span>Corridor</span>
          </button>
        </div>
      </div>

      {/* Range Band Overlay Legend */}
      <div className="absolute bottom-3 left-3 z-[400] pointer-events-none">
        <div className="px-3 py-1.5 rounded-[12px] bg-[var(--cs-surface-1)]/92 backdrop-blur-md border border-[var(--cs-outline)] text-[11px] text-[var(--cs-muted)] tabular-nums">
          Range circle: {rangeBand.minKm} km safe · {rangeBand.likelyKm} km likely (OSM tiles)
        </div>
      </div>
    </div>
  );
}
