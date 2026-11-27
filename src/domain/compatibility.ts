import {
  CompatibilityResult,
  ExcludedStation,
  ExclusionReason,
  GeoPoint,
  Station,
  Vehicle,
} from './types';

const EARTH_RADIUS_KM = 6371;
const ROAD_TORTUOSITY_FACTOR = 1.18;

export function haversineDistanceKm(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function estimatedRoadDistanceKm(a: GeoPoint, b: GeoPoint): number {
  return Number((haversineDistanceKm(a, b) * ROAD_TORTUOSITY_FACTOR).toFixed(1));
}

export function getMatchingConnectors(vehicle: Vehicle, station: Station) {
  return station.connectors.filter((c) => vehicle.connectors.includes(c.type));
}

export interface CompatibilityFilterOptions {
  origin: GeoPoint;
  reachableKm: number;
  maxPriceInr?: number;
  minPowerKw?: number;
}

/**
 * Hard-excludes stations that:
 * 1. Are offline
 * 2. Have no connector matching the vehicle's supported connectors
 * 3. Exceed the vehicle's reachable range
 * 4. Optionally exceed maxPriceInr or fall below minPowerKw
 */
export function filterCompatibleStations(
  vehicle: Vehicle,
  stations: Station[],
  options: CompatibilityFilterOptions
): CompatibilityResult {
  const compatible: Station[] = [];
  const excluded: ExcludedStation[] = [];

  for (const station of stations) {
    const reasons: ExclusionReason[] = [];

    if (station.status === 'offline') {
      reasons.push('offline');
    }

    const matching = getMatchingConnectors(vehicle, station);
    if (matching.length === 0) {
      reasons.push('incompatible_connector');
    }

    const roadKm = estimatedRoadDistanceKm(options.origin, station.location);
    if (roadKm > options.reachableKm || options.reachableKm <= 0) {
      reasons.push('out_of_range');
    }

    if (
      options.maxPriceInr !== undefined &&
      station.pricePerKwhInr > options.maxPriceInr
    ) {
      reasons.push('price_exceeded');
    }

    if (
      options.minPowerKw !== undefined &&
      matching.length > 0 &&
      Math.max(...matching.map((m) => m.powerKw)) < options.minPowerKw
    ) {
      reasons.push('power_below_min');
    }

    if (reasons.length === 0) {
      compatible.push(station);
    } else {
      excluded.push({ station, reasons });
    }
  }

  return { compatible, excluded };
}
