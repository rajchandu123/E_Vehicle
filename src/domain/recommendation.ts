import {
  estimatedRoadDistanceKm,
  filterCompatibleStations,
  getMatchingConnectors,
} from './compatibility';
import { computeReliability } from './reliability';
import {
  ConfidenceLevel,
  ExclusionReason,
  RecommendationOptions,
  RecommendationPreset,
  RecommendationReport,
  RecommendationWeights,
  StationRecommendation,
  Vehicle,
  Station,
} from './types';

export const PRESET_WEIGHTS: Record<
  Exclude<RecommendationPreset, 'custom'>,
  RecommendationWeights
> = {
  balanced: {
    detour: 0.18,
    eta: 0.14,
    price: 0.14,
    speed: 0.18,
    availability: 0.14,
    reliability: 0.22,
  },
  fastest: {
    detour: 0.16,
    eta: 0.24,
    price: 0.05,
    speed: 0.30,
    availability: 0.12,
    reliability: 0.13,
  },
  cheapest: {
    detour: 0.14,
    eta: 0.10,
    price: 0.40,
    speed: 0.10,
    availability: 0.10,
    reliability: 0.16,
  },
  most_reliable: {
    detour: 0.12,
    eta: 0.10,
    price: 0.08,
    speed: 0.12,
    availability: 0.16,
    reliability: 0.42,
  },
};

function resolveWeights(
  preset: RecommendationPreset,
  custom?: Partial<RecommendationWeights>
): RecommendationWeights {
  const base =
    preset === 'custom' ? PRESET_WEIGHTS.balanced : PRESET_WEIGHTS[preset];
  const merged: RecommendationWeights = {
    detour: custom?.detour ?? base.detour,
    eta: custom?.eta ?? base.eta,
    price: custom?.price ?? base.price,
    speed: custom?.speed ?? base.speed,
    availability: custom?.availability ?? base.availability,
    reliability: custom?.reliability ?? base.reliability,
  };
  const sum =
    merged.detour +
    merged.eta +
    merged.price +
    merged.speed +
    merged.availability +
    merged.reliability;
  if (sum <= 0) return PRESET_WEIGHTS.balanced;
  return {
    detour: merged.detour / sum,
    eta: merged.eta / sum,
    price: merged.price / sum,
    speed: merged.speed / sum,
    availability: merged.availability / sum,
    reliability: merged.reliability / sum,
  };
}

function combineConfidence(
  relConf: ConfidenceLevel,
  availableBays: number
): ConfidenceLevel {
  if (relConf === 'high' && availableBays > 0) return 'high';
  if (relConf === 'low' || availableBays === 0) return 'low';
  return 'medium';
}

/**
 * 3-step explainable station recommendation engine:
 * Step 1: Hard constraints (compatibility, online, reachable range, optional price/power caps)
 * Step 2: Weighted ranking (detour, ETA, price, effective speed, availability, reliability)
 * Step 3: Return top options with confidence, fallback option, and human-readable explanation
 */
export function recommendStations(
  vehicle: Vehicle,
  stations: Station[],
  options: RecommendationOptions
): RecommendationReport {
  const t0 =
    typeof performance !== 'undefined' ? performance.now() : Date.now();

  const reachableKm = options.useMinRangeForSafety
    ? options.rangeBand.minKm
    : options.rangeBand.likelyKm;

  // Step 1: Hard exclusions
  const { compatible, excluded } = filterCompatibleStations(vehicle, stations, {
    origin: options.origin,
    reachableKm,
    maxPriceInr: options.maxPriceInr,
    minPowerKw: options.minPowerKw,
  });

  const excludedByReason: Record<ExclusionReason, number> = {
    offline: 0,
    incompatible_connector: 0,
    out_of_range: 0,
    price_exceeded: 0,
    power_below_min: 0,
  };
  for (const item of excluded) {
    for (const r of item.reasons) {
      excludedByReason[r] += 1;
    }
  }

  if (compatible.length === 0) {
    const t1 =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    return {
      recommendations: [],
      fallback: null,
      excludedCount: excluded.length,
      excludedByReason,
      computationMs: Number((t1 - t0).toFixed(2)),
      summary:
        reachableKm <= 0
          ? 'Vehicle has 0 km reachable range. No charging stations can be reached under current SoC.'
          : `No compatible stations within ${reachableKm} km reachable range (${excluded.length} stations excluded).`,
    };
  }

  const weights = resolveWeights(options.preset, options.customWeights);
  const now = options.referenceNow ?? new Date();

  // Precompute metrics for normalization
  const rawEntries = compatible.map((station) => {
    const reliability = computeReliability(station, now);
    const distanceKm = estimatedRoadDistanceKm(options.origin, station.location);
    const detourKm =
      options.corridorDirectionKm !== undefined
        ? Number(
            Math.abs(station.kmFromBengaluru - options.corridorDirectionKm).toFixed(
              1
            )
          )
        : distanceKm;
    const etaMinutes = Math.max(2, Math.round((distanceKm / 55) * 60));

    const matching = getMatchingConnectors(vehicle, station);
    let bestEffectiveKw = 0;
    let availableCompatibleBays = 0;
    let totalCompatibleBays = 0;

    for (const conn of matching) {
      const cap =
        conn.type === 'Type 2' ? vehicle.maxAcChargeKw : vehicle.maxDcChargeKw;
      bestEffectiveKw = Math.max(bestEffectiveKw, Math.min(conn.powerKw, cap));
      availableCompatibleBays += conn.availableBays;
      totalCompatibleBays += conn.totalBays;
    }

    const energyFor20To80 = vehicle.usableKwh * 0.6;
    const estimatedCharge20To80Min =
      bestEffectiveKw > 0
        ? Math.round((energyFor20To80 / (bestEffectiveKw * 0.85)) * 60)
        : 999;

    return {
      station,
      reliability,
      distanceKm,
      detourKm,
      etaMinutes,
      bestEffectiveKw,
      availableCompatibleBays,
      totalCompatibleBays,
      estimatedCharge20To80Min,
    };
  });

  const maxDist = Math.max(...rawEntries.map((e) => e.detourKm), 1);
  const maxEta = Math.max(...rawEntries.map((e) => e.etaMinutes), 1);
  const prices = rawEntries.map((e) => e.station.pricePerKwhInr);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const maxSpeed = Math.max(...rawEntries.map((e) => e.bestEffectiveKw), 1);

  // Step 2: Weighted ranking
  const scored: StationRecommendation[] = rawEntries.map((e) => {
    const detourScore = 1 - e.detourKm / maxDist;
    const etaScore = 1 - e.etaMinutes / maxEta;
    const priceScore =
      maxPrice === minPrice
        ? 1
        : 1 - (e.station.pricePerKwhInr - minPrice) / (maxPrice - minPrice);
    const speedScore = e.bestEffectiveKw / maxSpeed;
    const availabilityScore =
      e.totalCompatibleBays > 0
        ? e.availableCompatibleBays / e.totalCompatibleBays
        : 0;
    const reliabilityScore = e.reliability.score / 100;

    const composite =
      (detourScore * weights.detour +
        etaScore * weights.eta +
        priceScore * weights.price +
        speedScore * weights.speed +
        availabilityScore * weights.availability +
        reliabilityScore * weights.reliability) *
      100;

    // Slight penalty if all compatible bays are currently occupied
    const occupiedPenalty = e.availableCompatibleBays === 0 ? 15 : 0;
    const finalScore = Math.max(
      0,
      Math.min(100, Math.round(composite - occupiedPenalty))
    );

    const confidence = combineConfidence(
      e.reliability.confidence,
      e.availableCompatibleBays
    );

    const highlights: string[] = [];
    if (e.reliability.score >= 82) {
      highlights.push(`high ${e.reliability.score}/100 reliability`);
    }
    if (e.availableCompatibleBays > 0) {
      highlights.push(
        `${e.availableCompatibleBays}/${e.totalCompatibleBays} compatible bays open`
      );
    } else {
      highlights.push('all compatible bays currently busy');
    }
    if (e.bestEffectiveKw >= 50) {
      highlights.push(
        `${e.bestEffectiveKw} kW effective speed (~${e.estimatedCharge20To80Min} min 20→80%)`
      );
    } else {
      highlights.push(`${e.bestEffectiveKw} kW charging`);
    }
    highlights.push(`₹${e.station.pricePerKwhInr}/kWh`);
    highlights.push(`${e.distanceKm} km away (${e.etaMinutes} min)`);

    const whyThisOne = `Matches ${vehicle.connectors.join('/')} and sits inside your ${reachableKm} km reachable band. Selected for ${highlights.join(', ')}.`;

    return {
      station: e.station,
      score: finalScore,
      reliability: e.reliability,
      distanceKm: e.distanceKm,
      detourKm: e.detourKm,
      etaMinutes: e.etaMinutes,
      effectiveChargeKw: e.bestEffectiveKw,
      estimatedCharge20To80Min: e.estimatedCharge20To80Min,
      availableCompatibleBays: e.availableCompatibleBays,
      totalCompatibleBays: e.totalCompatibleBays,
      confidence,
      whyThisOne,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  const maxResults = options.maxResults ?? 5;
  const recommendations = scored.slice(0, maxResults);

  // Step 3: Fallback option — highest-reliability station with free bays outside the #1 pick
  const remaining = scored.slice(1);
  const fallbackPool = remaining.filter((r) => r.availableCompatibleBays > 0);
  const fallbackCandidates = fallbackPool.length > 0 ? fallbackPool : remaining;
  const fallback =
    fallbackCandidates.length > 0
      ? [...fallbackCandidates].sort(
          (a, b) => b.reliability.score - a.reliability.score
        )[0]
      : null;

  const t1 =
    typeof performance !== 'undefined' ? performance.now() : Date.now();

  return {
    recommendations,
    fallback,
    excludedCount: excluded.length,
    excludedByReason,
    computationMs: Number((t1 - t0).toFixed(2)),
    summary: `Evaluated ${stations.length} stations: ${compatible.length} compatible & reachable within ${reachableKm} km, ${excluded.length} excluded.`,
  };
}
