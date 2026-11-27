import { ConnectorType, Station, StationCheckIn, StationStatus } from '../../domain/types';

type Segment = Station['corridorSegment'];

interface SegmentConfig {
  segment: Segment;
  baseKm: number;
  lat: number;
  lng: number;
  count: number;
}

const SEGMENTS: SegmentConfig[] = [
  { segment: 'Bengaluru Urban', baseKm: 4, lat: 12.922, lng: 77.528, count: 14 },
  { segment: 'Bidadi', baseKm: 24, lat: 12.798, lng: 77.382, count: 8 },
  { segment: 'Ramanagara', baseKm: 42, lat: 12.716, lng: 77.281, count: 8 },
  { segment: 'Channapatna', baseKm: 54, lat: 12.652, lng: 77.206, count: 8 },
  { segment: 'Maddur', baseKm: 76, lat: 12.584, lng: 77.044, count: 7 },
  { segment: 'Mandya', baseKm: 98, lat: 12.522, lng: 76.895, count: 8 },
  { segment: 'Srirangapatna', baseKm: 126, lat: 12.424, lng: 76.683, count: 6 },
  { segment: 'Mysuru', baseKm: 142, lat: 12.313, lng: 76.641, count: 7 },
];

// Completely fictional operators & hub prefixes for demo honesty
const OPERATORS = [
  'KaveriGrid',
  'VoltSahay',
  'DeccanCharge',
  'SahyadriVolt',
  'NandiPower',
  'CauverySpark',
];

const HUB_PREFIXES = [
  'Banyan Plaza',
  'SilkRoute Hub',
  'Granite Waypoint',
  'Expressway Oasis',
  'Tamarind Bay',
  'Metro Park',
  'Solar Canopy',
  'Highway Crest',
  'Palm Grove',
  'Civic Depot',
  'Tech Corridor',
  'Heritage Stop',
];

const AMENITY_SETS = [
  ['Filter Coffee Café', 'Restrooms', '24x7 Security'],
  ['Highway Diner', 'Restrooms', 'Wi-Fi Lounge', 'Air Pump'],
  ['Covered Canopy', 'UPI Kiosk', 'Restrooms'],
  ['Convenience Store', 'Shaded Waiting Area'],
  ['Food Court', 'Restrooms', 'CCTV', 'EV Tyre Bay'],
];

function buildStation(index: number, seg: SegmentConfig, localIdx: number): Station {
  const operator = OPERATORS[(index + localIdx) % OPERATORS.length];
  const prefix = HUB_PREFIXES[(index * 3 + localIdx) % HUB_PREFIXES.length];
  const id = `stn-blr-mys-${String(index + 1).padStart(3, '0')}`;

  // Deterministic spread around the corridor segment coordinates
  const latJitter = (((index * 37) % 19) - 9) * 0.0042;
  const lngJitter = (((index * 53) % 19) - 9) * 0.0048;
  const kmOffset = ((localIdx - Math.floor(seg.count / 2)) * 2.2);
  const kmFromBengaluru = Math.max(
    0,
    Math.min(152, Number((seg.baseKm + kmOffset).toFixed(1)))
  );

  // Mix statuses: mostly online, some degraded, ~7% offline
  let status: StationStatus = 'online';
  if (index % 15 === 11) status = 'offline';
  else if (index % 9 === 5) status = 'degraded';

  // Mix connectors: predominantly CCS2 + Type 2, plus some Type 2 only, CHAdeMO, GB/T
  let connectors: Station['connectors'];
  if (index % 11 === 4) {
    // AC-only destination / Type 2 hub
    connectors = [
      { type: 'Type 2', powerKw: 22, totalBays: 4, availableBays: status === 'offline' ? 0 : (index % 3) + 1 },
    ];
  } else if (index % 13 === 7) {
    // Fleet GB/T + Type 2 hub
    connectors = [
      { type: 'GB/T', powerKw: 60, totalBays: 3, availableBays: status === 'offline' ? 0 : 2 },
      { type: 'Type 2', powerKw: 7.4, totalBays: 2, availableBays: status === 'offline' ? 0 : 1 },
    ];
  } else if (index % 17 === 9) {
    // Legacy CHAdeMO + CCS2
    connectors = [
      { type: 'CCS2', powerKw: 50, totalBays: 2, availableBays: status === 'offline' ? 0 : 1 },
      { type: 'CHAdeMO', powerKw: 50, totalBays: 1, availableBays: status === 'offline' ? 0 : 1 },
    ];
  } else {
    const dcPowers = [30, 60, 60, 120, 150, 180, 50];
    const dcPower = dcPowers[index % dcPowers.length];
    const totalDc = (index % 3) + 2;
    const availDc =
      status === 'offline'
        ? 0
        : status === 'degraded'
        ? 1
        : Math.max(0, (index % (totalDc + 1)));
    connectors = [
      { type: 'CCS2', powerKw: dcPower, totalBays: totalDc, availableBays: availDc },
      { type: 'Type 2', powerKw: 7.4, totalBays: 2, availableBays: status === 'offline' ? 0 : 1 },
    ];
  }

  // Price diversity between 10.5 and 23.5 INR/kWh
  const maxPower = Math.max(...connectors.map((c) => c.powerKw));
  const basePrice = maxPower >= 120 ? 18.5 : maxPower >= 50 ? 14.5 : 11.0;
  const priceVariance = ((index % 7) - 3) * 0.8;
  const pricePerKwhInr = Number(Math.max(9.5, Math.min(24.0, basePrice + priceVariance)).toFixed(1));

  // Reliability profiles: excellent, average, flaky, brand-new (0-2 sessions)
  let historicalSuccessCount = 48 + ((index * 7) % 90);
  let historicalFailureCount = 3 + (index % 6);
  let downtimeHoursLast30d = index % 4;
  const checkIns: StationCheckIn[] = [];

  if (index % 10 === 2) {
    // Brand-new station: few historical sessions -> Bayesian prior keeps score modest
    historicalSuccessCount = 2;
    historicalFailureCount = 0;
    downtimeHoursLast30d = 0;
  } else if (index % 8 === 6) {
    // Flaky station with recent negative check-ins & downtime
    historicalSuccessCount = 22;
    historicalFailureCount = 19;
    downtimeHoursLast30d = 18;
    checkIns.push(
      {
        id: `chk-${id}-1`,
        stationId: id,
        userId: 'usr-karthik',
        userName: 'Karthik Gowda',
        outcome: 'not_working',
        issueType: 'payment_failed',
        comment: 'RFID handshake failed twice on Bay 1; Bay 2 throttled to 18 kW.',
        timestamp: '2026-11-22T09:15:00.000Z',
      },
      {
        id: `chk-${id}-2`,
        stationId: id,
        userId: 'usr-meera',
        userName: 'Meera Nair',
        outcome: 'not_working',
        issueType: 'charger_offline',
        comment: 'Screen blank on arrival, support reboot took 15 mins.',
        timestamp: '2026-11-19T16:40:00.000Z',
      }
    );
  } else if (index % 4 === 0) {
    // High-reliability station with recent positive check-ins
    historicalSuccessCount = 134 + (index % 40);
    historicalFailureCount = 4;
    downtimeHoursLast30d = 0;
    checkIns.push(
      {
        id: `chk-${id}-1`,
        stationId: id,
        userId: 'usr-ananya',
        userName: 'Ananya Rao',
        outcome: 'worked',
        issueType: 'none',
        comment: 'Clean bay, started on first tap at full rated curve.',
        timestamp: '2026-11-23T07:45:00.000Z',
      },
      {
        id: `chk-${id}-2`,
        stationId: id,
        userId: 'usr-karthik',
        userName: 'Karthik Gowda',
        outcome: 'worked',
        issueType: 'none',
        comment: 'Zero queue, shaded canopy and working UPI terminal.',
        timestamp: '2026-11-20T13:10:00.000Z',
      }
    );
  } else {
    checkIns.push({
      id: `chk-${id}-1`,
      stationId: id,
      userId: 'usr-ananya',
      userName: 'Ananya Rao',
      outcome: 'worked',
      issueType: 'none',
      comment: 'Steady session, matched advertised tariff.',
      timestamp: '2026-11-18T11:00:00.000Z',
    });
  }

  return {
    id,
    name: `${operator} · ${seg.segment} ${prefix} #${localIdx + 1}`,
    operator,
    corridorSegment: seg.segment,
    kmFromBengaluru,
    address: `KM ${kmFromBengaluru}, NH-275 / Mysore Expressway Service Lane, ${seg.segment}, Karnataka`,
    location: {
      lat: Number((seg.lat + latJitter).toFixed(5)),
      lng: Number((seg.lng + lngJitter).toFixed(5)),
    },
    status,
    connectors: connectors as {
      type: ConnectorType;
      powerKw: number;
      totalBays: number;
      availableBays: number;
    }[],
    pricePerKwhInr,
    amenities: AMENITY_SETS[index % AMENITY_SETS.length],
    open24x7: index % 6 !== 5,
    historicalSuccessCount,
    historicalFailureCount,
    downtimeHoursLast30d,
    checkIns,
    installedAt: index % 10 === 2 ? '2026-11-05T00:00:00.000Z' : '2025-03-14T00:00:00.000Z',
    isDemoData: true,
  };
}

function generateSeedStations(): Station[] {
  const result: Station[] = [];
  let globalIdx = 0;
  for (const seg of SEGMENTS) {
    for (let i = 0; i < seg.count; i++) {
      result.push(buildStation(globalIdx, seg, i));
      globalIdx++;
    }
  }
  return result;
}

export const SEED_STATIONS: Station[] = generateSeedStations();
