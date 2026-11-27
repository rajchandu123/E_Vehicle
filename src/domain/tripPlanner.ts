import { getMatchingConnectors, haversineDistanceKm } from './compatibility';
import { estimateRange } from './range';
import { computeReliability } from './reliability';
import {
  RouteCorridor,
  RoutingProvider,
  Station,
  TripPlan,
  TripPlanRequest,
  TripStop,
  Vehicle,
} from './types';

export const SEEDED_CORRIDORS: RouteCorridor[] = [
  {
    id: 'blr-mys-expressway',
    source: 'Bengaluru',
    destination: 'Mysuru',
    distanceKm: 143,
    baseDriveMinutes: 140,
    elevationGainM: -150,
    waypoints: [
      { name: 'Bengaluru (Kengeri / NICE Rd)', kmFromStart: 0, location: { lat: 12.9098, lng: 77.4828 } },
      { name: 'Bidadi', kmFromStart: 24, location: { lat: 12.7985, lng: 77.3822 } },
      { name: 'Ramanagara', kmFromStart: 42, location: { lat: 12.7159, lng: 77.2816 } },
      { name: 'Channapatna', kmFromStart: 54, location: { lat: 12.6518, lng: 77.2067 } },
      { name: 'Maddur', kmFromStart: 76, location: { lat: 12.5844, lng: 77.0439 } },
      { name: 'Mandya', kmFromStart: 98, location: { lat: 12.5218, lng: 76.8951 } },
      { name: 'Srirangapatna', kmFromStart: 126, location: { lat: 12.4237, lng: 76.6829 } },
      { name: 'Mysuru (Ring Road)', kmFromStart: 143, location: { lat: 12.3133, lng: 76.6413 } },
    ],
  },
  {
    id: 'mys-blr-return',
    source: 'Mysuru',
    destination: 'Bengaluru',
    distanceKm: 143,
    baseDriveMinutes: 145,
    elevationGainM: 150,
    waypoints: [
      { name: 'Mysuru (Ring Road)', kmFromStart: 0, location: { lat: 12.3133, lng: 76.6413 } },
      { name: 'Srirangapatna', kmFromStart: 17, location: { lat: 12.4237, lng: 76.6829 } },
      { name: 'Mandya', kmFromStart: 45, location: { lat: 12.5218, lng: 76.8951 } },
      { name: 'Maddur', kmFromStart: 67, location: { lat: 12.5844, lng: 77.0439 } },
      { name: 'Channapatna', kmFromStart: 89, location: { lat: 12.6518, lng: 77.2067 } },
      { name: 'Ramanagara', kmFromStart: 101, location: { lat: 12.7159, lng: 77.2816 } },
      { name: 'Bidadi', kmFromStart: 119, location: { lat: 12.7985, lng: 77.3822 } },
      { name: 'Bengaluru (Kengeri / NICE Rd)', kmFromStart: 143, location: { lat: 12.9098, lng: 77.4828 } },
    ],
  },
  {
    id: 'blr-nandi-loop',
    source: 'Bengaluru',
    destination: 'Nandi Hills',
    distanceKm: 64,
    baseDriveMinutes: 85,
    elevationGainM: 560,
    waypoints: [
      { name: 'Bengaluru Hebbal', kmFromStart: 0, location: { lat: 13.0358, lng: 77.597 } },
      { name: 'Devanahalli', kmFromStart: 35, location: { lat: 13.2473, lng: 77.7132 } },
      { name: 'Nandi Hills Summit', kmFromStart: 64, location: { lat: 13.3702, lng: 77.6835 } },
    ],
  },
  {
    id: 'blr-coorg-corridor',
    source: 'Bengaluru',
    destination: 'Madikeri (Coorg)',
    distanceKm: 254,
    baseDriveMinutes: 300,
    elevationGainM: 420,
    waypoints: [
      { name: 'Bengaluru', kmFromStart: 0, location: { lat: 12.9098, lng: 77.4828 } },
      { name: 'Mandya', kmFromStart: 98, location: { lat: 12.5218, lng: 76.8951 } },
      { name: 'Mysuru Bypass', kmFromStart: 143, location: { lat: 12.3133, lng: 76.6413 } },
      { name: 'Kushalnagar', kmFromStart: 222, location: { lat: 12.4602, lng: 75.9598 } },
      { name: 'Madikeri', kmFromStart: 254, location: { lat: 12.4244, lng: 75.7382 } },
    ],
  },
];

export class SimulatedCorridorRoutingProvider implements RoutingProvider {
  readonly providerName = 'ChargeSense Simulated Corridor Router (Bengaluru–Mysuru Pilot)';

  listAvailableRoutes(): RouteCorridor[] {
    return SEEDED_CORRIDORS;
  }

  findRoute(source: string, destination: string): RouteCorridor | null {
    const s = source.trim().toLowerCase();
    const d = destination.trim().toLowerCase();
    return (
      SEEDED_CORRIDORS.find(
        (c) =>
          c.source.toLowerCase().includes(s) &&
          c.destination.toLowerCase().includes(d)
      ) ?? null
    );
  }
}

/**
 * Plans a corridor trip with deterministic charging stops when needed.
 */
export function planTrip(
  request: TripPlanRequest,
  vehicle: Vehicle,
  stations: Station[],
  routingProvider: RoutingProvider = new SimulatedCorridorRoutingProvider()
): TripPlan {
  const corridor = routingProvider.findRoute(
    request.source,
    request.destination
  );

  if (!corridor) {
    return {
      feasible: false,
      corridor: null,
      startingSocPercent: request.startingSocPercent,
      finalArrivalSocPercent: 0,
      totalDistanceKm: 0,
      totalEnergyNeededKwh: 0,
      drivingMinutes: 0,
      chargingMinutes: 0,
      totalMinutes: 0,
      totalEstimatedCostInr: 0,
      stops: [],
      narrative: `No simulated route found from "${request.source}" to "${request.destination}". Try Bengaluru → Mysuru or Mysuru → Bengaluru.`,
      warnings: ['Unsupported corridor in pilot routing dataset.'],
    };
  }

  const minArrivalSoc = request.minArrivalSocPercent ?? 15;
  const driveMode = request.driveMode ?? 'city';
  const acOn = request.acOn ?? true;

  // Use deterministic range estimator to derive realistic Wh/km for highway cruise
  const probeBand = estimateRange(vehicle, {
    socPercent: 100,
    avgSpeedKmh: 82,
    acOn,
    ambientTempC: request.ambientTempC ?? 29,
    passengers: 2,
    cargoKg: 20,
    driveMode,
    safetyBufferPercent: 0,
  });

  // Elevation penalty on uphill corridors (150m+ climb)
  const elevationExtraKwh =
    corridor.elevationGainM > 0 ? (corridor.elevationGainM / 100) * 0.45 : 0;
  const whPerKm = probeBand.adjustedWhPerKm;
  const totalEnergyNeededKwh = Number(
    ((corridor.distanceKm * whPerKm) / 1000 + elevationExtraKwh).toFixed(1)
  );
  const socConsumedTotal = (totalEnergyNeededKwh / vehicle.usableKwh) * 100;

  if (request.startingSocPercent <= 5) {
    return {
      feasible: false,
      corridor,
      startingSocPercent: request.startingSocPercent,
      finalArrivalSocPercent: 0,
      totalDistanceKm: corridor.distanceKm,
      totalEnergyNeededKwh,
      drivingMinutes: corridor.baseDriveMinutes,
      chargingMinutes: 0,
      totalMinutes: corridor.baseDriveMinutes,
      totalEstimatedCostInr: 0,
      stops: [],
      narrative: `Starting SoC (${request.startingSocPercent}%) is too low to safely reach the first highway charger. Charge locally before departing.`,
      warnings: ['Insufficient starting charge for highway departure.'],
    };
  }

  // Direct non-stop check
  const directArrivalSoc = Number(
    (request.startingSocPercent - socConsumedTotal).toFixed(1)
  );
  if (directArrivalSoc >= minArrivalSoc) {
    return {
      feasible: true,
      corridor,
      startingSocPercent: request.startingSocPercent,
      finalArrivalSocPercent: Math.round(directArrivalSoc),
      totalDistanceKm: corridor.distanceKm,
      totalEnergyNeededKwh,
      drivingMinutes: corridor.baseDriveMinutes,
      chargingMinutes: 0,
      totalMinutes: corridor.baseDriveMinutes,
      totalEstimatedCostInr: 0,
      stops: [],
      narrative: `Your ${vehicle.make} ${vehicle.model} can complete the ${corridor.distanceKm} km ${corridor.source} → ${corridor.destination} trip non-stop, arriving with ~${Math.round(
        directArrivalSoc
      )}% SoC (above your ${minArrivalSoc}% arrival reserve).`,
      warnings: [],
    };
  }

  // Otherwise select optimal charging stops along the corridor
  const isBlrMys = corridor.id === 'blr-mys-expressway';
  const isMysBlr = corridor.id === 'mys-blr-return';
  const corridorStations = stations
    .filter((s) => s.status !== 'offline')
    .filter((s) => getMatchingConnectors(vehicle, s).length > 0)
    .map((s) => {
      let kmAlongRoute = -1;
      if (isBlrMys) {
        kmAlongRoute = s.kmFromBengaluru;
      } else if (isMysBlr) {
        kmAlongRoute = Math.max(0, 143 - s.kmFromBengaluru);
      } else if (corridor.waypoints.length > 0) {
        let bestDist = Infinity;
        let bestKm = -1;
        for (const wp of corridor.waypoints) {
          const d = haversineDistanceKm(s.location, wp.location);
          if (d < bestDist) {
            bestDist = d;
            bestKm = wp.kmFromStart;
          }
        }
        if (bestDist <= 22) {
          kmAlongRoute = bestKm;
        }
      }
      const reliability = computeReliability(s);
      const matching = getMatchingConnectors(vehicle, s);
      const bestKw = Math.max(
        ...matching.map((m) =>
          Math.min(
            m.powerKw,
            m.type === 'Type 2' ? vehicle.maxAcChargeKw : vehicle.maxDcChargeKw
          )
        )
      );
      const freeBays = matching.reduce((acc, m) => acc + m.availableBays, 0);
      return {
        station: s,
        kmAlongRoute,
        reliabilityScore: reliability.score,
        bestKw,
        freeBays,
      };
    })
    .filter((item) => item.kmAlongRoute > 5 && item.kmAlongRoute < corridor.distanceKm - 5)
    .sort((a, b) => a.kmAlongRoute - b.kmAlongRoute);

  const stops: TripStop[] = [];
  const warnings: string[] = [];
  let currentKm = 0;
  let currentSoc = request.startingSocPercent;
  let totalChargingMinutes = 0;
  let totalCostInr = 0;

  // Greedy safe-horizon planner (up to 4 stops)
  for (let guard = 0; guard < 4; guard++) {
    const remainingKm = corridor.distanceKm - currentKm;
    const socNeededToEnd =
      ((remainingKm * whPerKm) / 1000 / vehicle.usableKwh) * 100;
    if (currentSoc - socNeededToEnd >= minArrivalSoc) {
      break;
    }

    // Reachable distance keeping 10% emergency floor
    const usableSocToStop = Math.max(0, currentSoc - 10);
    const maxReachKmFromHere =
      ((usableSocToStop / 100) * vehicle.usableKwh * 1000) / whPerKm;

    const candidates = corridorStations.filter(
      (c) =>
        c.kmAlongRoute > currentKm + 8 &&
        c.kmAlongRoute <= currentKm + maxReachKmFromHere
    );

    if (candidates.length === 0) {
      return {
        feasible: false,
        corridor,
        startingSocPercent: request.startingSocPercent,
        finalArrivalSocPercent: 0,
        totalDistanceKm: corridor.distanceKm,
        totalEnergyNeededKwh,
        drivingMinutes: corridor.baseDriveMinutes,
        chargingMinutes: totalChargingMinutes,
        totalMinutes: corridor.baseDriveMinutes + totalChargingMinutes,
        totalEstimatedCostInr: Math.round(totalCostInr),
        stops,
        narrative: `Unable to reach any compatible charger from km ${Math.round(
          currentKm
        )} with ${Math.round(currentSoc)}% SoC.`,
        warnings: [
          'No compatible online station inside safe reachable horizon along this segment.',
        ],
      };
    }

    // Pick candidate prioritizing reliability, free bays, fast charging, and good forward progress
    const best = [...candidates].sort((a, b) => {
      const scoreA =
        a.reliabilityScore * 0.45 +
        (a.freeBays > 0 ? 18 : -15) +
        Math.min(30, a.bestKw * 0.4) +
        ((a.kmAlongRoute - currentKm) / Math.max(1, maxReachKmFromHere)) * 18 -
        (request.preset === 'cheapest' ? a.station.pricePerKwhInr * 0.8 : 0);
      const scoreB =
        b.reliabilityScore * 0.45 +
        (b.freeBays > 0 ? 18 : -15) +
        Math.min(30, b.bestKw * 0.4) +
        ((b.kmAlongRoute - currentKm) / Math.max(1, maxReachKmFromHere)) * 18 -
        (request.preset === 'cheapest' ? b.station.pricePerKwhInr * 0.8 : 0);
      return scoreB - scoreA;
    })[0];

    const legKm = best.kmAlongRoute - currentKm;
    const legSoc = ((legKm * whPerKm) / 1000 / vehicle.usableKwh) * 100;
    const arrivalSoc = Math.max(5, Number((currentSoc - legSoc).toFixed(1)));

    const distLeftAfterStop = corridor.distanceKm - best.kmAlongRoute;
    const socNeededAfterStop =
      ((distLeftAfterStop * whPerKm) / 1000 / vehicle.usableKwh) * 100 +
      minArrivalSoc;
    const targetDepartSoc = Math.min(85, Math.max(arrivalSoc + 20, Math.ceil(socNeededAfterStop)));
    const socAdded = Math.max(0, targetDepartSoc - arrivalSoc);
    const energyAddedKwh = Number(
      ((socAdded / 100) * vehicle.usableKwh).toFixed(1)
    );
    // Realistic 82% average taper efficiency
    const chargeDurationMinutes = Math.max(
      8,
      Math.round((energyAddedKwh / Math.max(3.3, best.bestKw * 0.82)) * 60)
    );
    const estimatedCostInr = Math.round(
      energyAddedKwh * best.station.pricePerKwhInr
    );

    stops.push({
      station: best.station,
      kmFromStart: best.kmAlongRoute,
      arrivalSocPercent: Math.round(arrivalSoc),
      departSocPercent: Math.round(targetDepartSoc),
      energyAddedKwh,
      chargeDurationMinutes,
      estimatedCostInr,
      reliabilityScore: best.reliabilityScore,
      reason: `Sits at km ${best.kmAlongRoute} (${best.station.corridorSegment}), ${best.reliabilityScore}/100 reliability, ${best.bestKw} kW effective rate.`,
    });

    currentKm = best.kmAlongRoute;
    currentSoc = targetDepartSoc;
    totalChargingMinutes += chargeDurationMinutes;
    totalCostInr += estimatedCostInr;
  }

  const finalLegKm = corridor.distanceKm - currentKm;
  const finalLegSoc =
    ((finalLegKm * whPerKm) / 1000 / vehicle.usableKwh) * 100;
  const finalArrivalSoc = Math.max(0, Math.round(currentSoc - finalLegSoc));

  if (finalArrivalSoc < minArrivalSoc) {
    warnings.push(
      `Projected arrival SoC (${finalArrivalSoc}%) is slightly below your ${minArrivalSoc}% target.`
    );
  }

  return {
    feasible: true,
    corridor,
    startingSocPercent: request.startingSocPercent,
    finalArrivalSocPercent: finalArrivalSoc,
    totalDistanceKm: corridor.distanceKm,
    totalEnergyNeededKwh,
    drivingMinutes: corridor.baseDriveMinutes,
    chargingMinutes: totalChargingMinutes,
    totalMinutes: corridor.baseDriveMinutes + totalChargingMinutes,
    totalEstimatedCostInr: Math.round(totalCostInr),
    stops,
    narrative: `Planned ${corridor.source} → ${corridor.destination} (${corridor.distanceKm} km) with ${stops.length} charging stop${stops.length === 1 ? '' : 's'}. Total charging ~${totalChargingMinutes} min (₹${Math.round(
      totalCostInr
    )}), arriving with ~${finalArrivalSoc}% SoC.`,
    warnings,
  };
}
