import { describe, expect, it } from 'vitest';
import { SEED_STATIONS } from '../../data/seed/stations';
import { SEED_VEHICLES } from '../../data/seed/vehicles';
import { filterCompatibleStations } from '../compatibility';
import { appendPassportEvent, buildPassportChain, verifyPassportChain } from '../passport';
import { estimateRange } from '../range';
import { recommendStations } from '../recommendation';
import { computeReliability } from '../reliability';
import { planTrip } from '../tripPlanner';
import { Station, Vehicle } from '../types';

const nexon = SEED_VEHICLES[0]; // CCS2 + Type 2, 43.2 kWh usable, 138 Wh/km
const bydGbt = SEED_VEHICLES[4]; // GB/T + Type 2
const bengaluruOrigin = { lat: 12.912, lng: 77.512 };

describe('Range Estimator (deterministic)', () => {
  it('computes 55% battery scenario band with plain-language explanation', () => {
    const band = estimateRange(nexon, {
      socPercent: 55,
      avgSpeedKmh: 75,
      acOn: true,
      ambientTempC: 30,
      passengers: 2,
      cargoKg: 25,
      driveMode: 'city',
      safetyBufferPercent: 20,
    });

    expect(band.socPercent).toBe(55);
    expect(band.usableEnergyKwh).toBeCloseTo(23.76, 1);
    expect(band.bufferedEnergyKwh).toBeCloseTo(19.01, 1);
    expect(band.minKm).toBeGreaterThan(90);
    expect(band.likelyKm).toBeGreaterThanOrEqual(band.minKm);
    expect(band.maxKm).toBeGreaterThanOrEqual(band.likelyKm);
    expect(band.explanation).toContain('55% SoC');
    expect(band.explanation).toContain('20% safety buffer');
  });

  it('handles 0% battery edge case safely', () => {
    const band = estimateRange(nexon, {
      socPercent: 0,
      avgSpeedKmh: 60,
      acOn: false,
      ambientTempC: 26,
      passengers: 1,
      cargoKg: 0,
      driveMode: 'eco',
      safetyBufferPercent: 20,
    });

    expect(band.minKm).toBe(0);
    expect(band.likelyKm).toBe(0);
    expect(band.maxKm).toBe(0);
    expect(band.usableEnergyKwh).toBe(0);
    expect(band.explanation.toLowerCase()).toContain('0% soc');
  });

  it('reduces range when switching from Eco to Sport mode at high speed', () => {
    const eco = estimateRange(nexon, {
      socPercent: 60,
      avgSpeedKmh: 70,
      acOn: false,
      ambientTempC: 26,
      passengers: 1,
      cargoKg: 0,
      driveMode: 'eco',
    });
    const sport = estimateRange(nexon, {
      socPercent: 60,
      avgSpeedKmh: 110,
      acOn: true,
      ambientTempC: 38,
      passengers: 4,
      cargoKg: 40,
      driveMode: 'sport',
    });
    expect(sport.likelyKm).toBeLessThan(eco.likelyKm);
  });
});

describe('Compatibility & Hard Exclusions', () => {
  it('excludes incompatible connectors and offline stations', () => {
    const chademoOnlyVehicle: Vehicle = {
      ...nexon,
      id: 'veh-chademo-test',
      connectors: ['CHAdeMO'],
    };

    const result = filterCompatibleStations(chademoOnlyVehicle, SEED_STATIONS, {
      origin: bengaluruOrigin,
      reachableKm: 200,
    });

    // Only stations with CHAdeMO and online status should survive
    expect(result.compatible.length).toBeGreaterThan(0);
    expect(result.compatible.length).toBeLessThan(10);
    for (const s of result.compatible) {
      expect(s.status).not.toBe('offline');
      expect(s.connectors.some((c) => c.type === 'CHAdeMO')).toBe(true);
    }
  });

  it('excludes all stations when all stations are offline', () => {
    const allOffline: Station[] = SEED_STATIONS.slice(0, 10).map((s) => ({
      ...s,
      status: 'offline',
    }));
    const result = filterCompatibleStations(nexon, allOffline, {
      origin: bengaluruOrigin,
      reachableKm: 200,
    });
    expect(result.compatible).toHaveLength(0);
    expect(result.excluded).toHaveLength(10);
    expect(result.excluded.every((e) => e.reasons.includes('offline'))).toBe(true);
  });

  it('returns zero compatible stations when reachable range is 0 km', () => {
    const result = filterCompatibleStations(nexon, SEED_STATIONS, {
      origin: bengaluruOrigin,
      reachableKm: 0,
    });
    expect(result.compatible).toHaveLength(0);
    expect(result.excluded.length).toBe(SEED_STATIONS.length);
  });
});

describe('Bayesian Reliability Scoring', () => {
  it('does not over-trust brand-new stations with only 2 sessions', () => {
    const brandNew: Station = {
      ...SEED_STATIONS[0],
      historicalSuccessCount: 2,
      historicalFailureCount: 0,
      downtimeHoursLast30d: 0,
      checkIns: [],
    };
    const res = computeReliability(brandNew, new Date('2026-11-24T10:00:00Z'));
    expect(res.score).toBeLessThan(78);
    expect(res.confidence).toBe('low');
  });

  it('visibly changes score when a user submits a negative or positive check-in', () => {
    const refNow = new Date('2026-11-24T10:00:00Z');
    const baseStation: Station = {
      ...SEED_STATIONS[0],
      historicalSuccessCount: 25,
      historicalFailureCount: 3,
      downtimeHoursLast30d: 1,
      checkIns: [],
    };

    const before = computeReliability(baseStation, refNow);

    const afterNegative = computeReliability(
      {
        ...baseStation,
        checkIns: [
          {
            id: 'c1',
            stationId: baseStation.id,
            userId: 'u1',
            userName: 'Test Driver',
            outcome: 'not_working',
            issueType: 'charger_offline',
            comment: 'Dead screen',
            timestamp: '2026-11-24T09:00:00Z',
          },
        ],
      },
      refNow
    );

    const afterPositive = computeReliability(
      {
        ...baseStation,
        checkIns: [
          {
            id: 'c2',
            stationId: baseStation.id,
            userId: 'u1',
            userName: 'Test Driver',
            outcome: 'worked',
            issueType: 'none',
            comment: 'Fast and smooth',
            timestamp: '2026-11-24T09:00:00Z',
          },
        ],
      },
      refNow
    );

    expect(afterNegative.score).toBeLessThan(before.score);
    expect(afterPositive.score).toBeGreaterThan(before.score);
  });
});

describe('Recommendation Engine & Performance', () => {
  it('returns ranked recommendations, fallback, and explanations in <100ms across 66 stations', () => {
    expect(SEED_STATIONS.length).toBeGreaterThanOrEqual(60);

    const band = estimateRange(nexon, {
      socPercent: 55,
      avgSpeedKmh: 75,
      acOn: true,
      ambientTempC: 30,
      passengers: 2,
      cargoKg: 20,
      driveMode: 'city',
    });

    const report = recommendStations(nexon, SEED_STATIONS, {
      origin: bengaluruOrigin,
      rangeBand: band,
      preset: 'most_reliable',
    });

    expect(report.computationMs).toBeLessThan(100);
    expect(report.recommendations.length).toBeGreaterThan(0);
    expect(report.fallback).not.toBeNull();
    expect(report.recommendations[0].whyThisOne.length).toBeGreaterThan(20);
    expect(report.recommendations[0].station.status).not.toBe('offline');
  });

  it('handles zero reachable stations cleanly', () => {
    const band = estimateRange(bydGbt, {
      socPercent: 0,
      avgSpeedKmh: 70,
      acOn: false,
      ambientTempC: 28,
      passengers: 1,
      cargoKg: 0,
      driveMode: 'city',
    });
    const report = recommendStations(bydGbt, SEED_STATIONS, {
      origin: bengaluruOrigin,
      rangeBand: band,
      preset: 'balanced',
    });
    expect(report.recommendations).toHaveLength(0);
    expect(report.fallback).toBeNull();
    expect(report.summary).toContain('0 km');
  });
});

describe('Corridor Trip Planner', () => {
  it('plans Bengaluru to Mysuru with charging stops when starting at 55% SoC', () => {
    const plan = planTrip(
      {
        source: 'Bengaluru',
        destination: 'Mysuru',
        startingSocPercent: 55,
        minArrivalSocPercent: 18,
      },
      nexon,
      SEED_STATIONS
    );

    expect(plan.feasible).toBe(true);
    expect(plan.totalDistanceKm).toBe(143);
    expect(plan.stops.length).toBeGreaterThanOrEqual(1);
    expect(plan.finalArrivalSocPercent).toBeGreaterThanOrEqual(18);
    expect(plan.chargingMinutes).toBeGreaterThan(0);
  });

  it('allows non-stop Bengaluru to Mysuru when starting at 95% SoC', () => {
    const plan = planTrip(
      {
        source: 'Bengaluru',
        destination: 'Mysuru',
        startingSocPercent: 95,
        minArrivalSocPercent: 15,
      },
      nexon,
      SEED_STATIONS
    );

    expect(plan.feasible).toBe(true);
    expect(plan.stops).toHaveLength(0);
    expect(plan.finalArrivalSocPercent).toBeGreaterThanOrEqual(15);
  });
});

describe('EV Digital Passport SHA-256 Hash Chain', () => {
  it('verifies intact chain and detects payload tampering', async () => {
    const chain = await buildPassportChain([
      {
        id: 'e1',
        vehicleId: 'veh-1',
        type: 'ownership_registered',
        timestamp: '2026-01-01T00:00:00Z',
        odometerKm: 10,
        title: 'Registered',
        summary: 'Genesis',
        metadata: { city: 'Bengaluru' },
      },
      {
        id: 'e2',
        vehicleId: 'veh-1',
        type: 'charging_session',
        timestamp: '2026-02-01T00:00:00Z',
        odometerKm: 520,
        title: 'Fast Charge',
        summary: '30 kWh added',
        metadata: { kwh: 30 },
      },
    ]);

    const ok = await verifyPassportChain(chain);
    expect(ok.valid).toBe(true);
    expect(ok.checkedCount).toBe(2);

    // Tamper with odometer on event 0
    const tampered = [{ ...chain[0], odometerKm: 9999 }, chain[1]];
    const bad = await verifyPassportChain(tampered);
    expect(bad.valid).toBe(false);
    expect(bad.brokenAtIndex).toBe(0);

    // Append new event properly
    const extended = await appendPassportEvent(chain, {
      id: 'e3',
      vehicleId: 'veh-1',
      type: 'service_record',
      timestamp: '2026-03-01T00:00:00Z',
      odometerKm: 1200,
      title: 'Inspection',
      summary: 'All nominal',
      metadata: { soh: 99 },
    });
    const ok2 = await verifyPassportChain(extended);
    expect(ok2.valid).toBe(true);
    expect(ok2.checkedCount).toBe(3);
  });
});
