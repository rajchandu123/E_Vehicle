import {
  BatteryHealthSnapshot,
  ClaimRecord,
  FaqEntry,
  PassportEventPayload,
  ServiceCentre,
  TripHistoryRecord,
} from '../../domain/types';

export const SEED_TRIPS: TripHistoryRecord[] = [
  {
    id: 'trp-001',
    vehicleId: 'veh-nexon-lr',
    date: '2026-11-21',
    origin: 'Bengaluru (Indiranagar)',
    destination: 'Mysuru (Ring Road)',
    distanceKm: 148,
    energyUsedKwh: 20.9,
    costInr: 294,
    avgEfficiencyWhKm: 141,
    ecoScore: 88,
  },
  {
    id: 'trp-002',
    vehicleId: 'veh-nexon-lr',
    date: '2026-11-16',
    origin: 'Mysuru (Ring Road)',
    destination: 'Bengaluru (Kengeri)',
    distanceKm: 143,
    energyUsedKwh: 21.8,
    costInr: 312,
    avgEfficiencyWhKm: 152,
    ecoScore: 82,
  },
  {
    id: 'trp-003',
    vehicleId: 'veh-nexon-lr',
    date: '2026-11-11',
    origin: 'Bengaluru (Koramangala)',
    destination: 'Ramanagara Silk Market',
    distanceKm: 49,
    energyUsedKwh: 6.4,
    costInr: 58,
    avgEfficiencyWhKm: 131,
    ecoScore: 93,
  },
  {
    id: 'trp-004',
    vehicleId: 'veh-nexon-lr',
    date: '2026-11-04',
    origin: 'Bengaluru',
    destination: 'Nandi Hills',
    distanceKm: 64,
    energyUsedKwh: 10.6,
    costInr: 148,
    avgEfficiencyWhKm: 165,
    ecoScore: 79,
  },
  {
    id: 'trp-005',
    vehicleId: 'veh-nexon-lr',
    date: '2026-10-28',
    origin: 'Bengaluru',
    destination: 'Mandya',
    distanceKm: 102,
    energyUsedKwh: 13.8,
    costInr: 196,
    avgEfficiencyWhKm: 135,
    ecoScore: 90,
  },
];

export const SEED_SERVICE_CENTRES: ServiceCentre[] = [
  {
    id: 'svc-blr-01',
    name: 'Kengeri EV Diagnostics & High-Voltage Hub (Demo)',
    brandSupport: ['Tata', 'MG', 'Mahindra'],
    city: 'Bengaluru',
    corridorSegment: 'Bengaluru Urban',
    address: 'Plot 14, Mysore Road Satellite Town, Kengeri, Bengaluru 560060',
    phone: '+91 80 4900 1120',
    location: { lat: 12.907, lng: 77.484 },
    evCertifiedBays: 6,
    nextSlotLabel: 'Tomorrow · 10:30 AM',
    servicesOffered: [
      'HV Battery SoH Calibration',
      'Coolant Flush',
      'CCS2 Port Inspection',
      'Brake & Regen Servicing',
    ],
    isDemoData: true,
  },
  {
    id: 'svc-rmg-02',
    name: 'Ramanagara Expressway EV Care (Demo)',
    brandSupport: ['Tata', 'Mahindra', 'Hyundai', 'MG'],
    city: 'Ramanagara',
    corridorSegment: 'Ramanagara',
    address: 'NH-275 Industrial Estate, Near Bidadi Cross, Ramanagara 562159',
    phone: '+91 80 4900 2284',
    location: { lat: 12.724, lng: 77.289 },
    evCertifiedBays: 3,
    nextSlotLabel: 'Today · 04:00 PM',
    servicesOffered: [
      '12V Auxiliary Battery Replacement',
      'Tyre & Alignment',
      'Emergency Mobile Flatbed',
    ],
    isDemoData: true,
  },
  {
    id: 'svc-mdy-03',
    name: 'Mandya Kaveri Volt Workshop (Demo)',
    brandSupport: ['Tata', 'MG', 'BYD', 'Hyundai'],
    city: 'Mandya',
    corridorSegment: 'Mandya',
    address: 'Sugar Town Ring Road, Mandya 571401',
    phone: '+91 8232 400 715',
    location: { lat: 12.526, lng: 76.901 },
    evCertifiedBays: 4,
    nextSlotLabel: 'Tomorrow · 11:00 AM',
    servicesOffered: [
      'Thermal Loop Check',
      'On-Board Charger Diagnostics',
      'Roadside Tow Dispatch',
    ],
    isDemoData: true,
  },
  {
    id: 'svc-mys-04',
    name: 'Mysuru Hebbal EV Technical Centre (Demo)',
    brandSupport: ['Tata', 'MG', 'Mahindra', 'Hyundai', 'BYD'],
    city: 'Mysuru',
    corridorSegment: 'Mysuru',
    address: 'Hebbal Industrial Area Phase 2, Mysuru 570016',
    phone: '+91 821 490 8820',
    location: { lat: 12.354, lng: 76.612 },
    evCertifiedBays: 7,
    nextSlotLabel: 'Tomorrow · 09:30 AM',
    servicesOffered: [
      'Full HV Pack Diagnostics',
      'BMS Firmware Update',
      'Insurance Body & Battery Survey',
    ],
    isDemoData: true,
  },
];

export const SEED_CLAIMS: ClaimRecord[] = [
  {
    id: 'clm-2026-104',
    vehicleId: 'veh-nexon-lr',
    policyNumber: 'EV-KA-2026-884920',
    insurerName: 'NammaShield EV Assurance (Demo)',
    incidentType: 'charger_surge',
    incidentDate: '2026-09-14',
    description:
      'Onboard AC charger tripped after voltage fluctuation at unverified destination wallbox; OBC fuse & port latch replaced.',
    estimatedAmountInr: 18400,
    documents: ['obc_diagnostic_report.pdf', 'station_receipt_sep14.png'],
    status: 'settled',
    timeline: [
      {
        stage: 'Claim Registered',
        timestamp: '2026-09-14T18:20:00Z',
        note: 'Initial FNOL submitted with diagnostic fault code log.',
      },
      {
        stage: 'Surveyor Approved',
        timestamp: '2026-09-16T11:05:00Z',
        note: 'Cashless repair cleared at Kengeri EV Diagnostics Hub.',
      },
      {
        stage: 'Settled',
        timestamp: '2026-09-21T15:30:00Z',
        note: '₹18,400 settled directly to service partner.',
      },
    ],
  },
];

export const SEED_BATTERY_HEALTH: Record<string, BatteryHealthSnapshot[]> = {
  'veh-nexon-lr': [
    { month: 'Jun 26', sohPercent: 98.4, dcFastChargeRatio: 22, avgTempC: 31, cycles: 112 },
    { month: 'Jul 26', sohPercent: 98.2, dcFastChargeRatio: 25, avgTempC: 29, cycles: 121 },
    { month: 'Aug 26', sohPercent: 98.0, dcFastChargeRatio: 28, avgTempC: 28, cycles: 130 },
    { month: 'Sep 26', sohPercent: 97.8, dcFastChargeRatio: 24, avgTempC: 29, cycles: 141 },
    { month: 'Oct 26', sohPercent: 97.6, dcFastChargeRatio: 26, avgTempC: 30, cycles: 152 },
    { month: 'Nov 26', sohPercent: 97.4, dcFastChargeRatio: 23, avgTempC: 27, cycles: 162 },
  ],
};

export const SEED_PASSPORT_PAYLOADS: Record<string, PassportEventPayload[]> = {
  'veh-nexon-lr': [
    {
      id: 'evt-001',
      vehicleId: 'veh-nexon-lr',
      type: 'ownership_registered',
      timestamp: '2025-04-12T09:00:00.000Z',
      odometerKm: 18,
      title: 'Initial Delivery & EV Passport Genesis',
      summary: 'Vehicle registered to Ananya Rao in Bengaluru (KA-05-EV-4821).',
      metadata: {
        usableKwh: 43.2,
        sohPercent: 100,
        city: 'Bengaluru',
      },
    },
    {
      id: 'evt-002',
      vehicleId: 'veh-nexon-lr',
      type: 'service_record',
      timestamp: '2026-03-10T10:45:00.000Z',
      odometerKm: 10240,
      title: '10,000 km Scheduled EV Inspection',
      summary: 'HV coolant level verified, BMS cell balance delta 8 mV, firmware updated.',
      metadata: {
        centre: 'Kengeri EV Diagnostics Hub',
        cellDeltaMv: 8,
        costInr: 1850,
      },
    },
    {
      id: 'evt-003',
      vehicleId: 'veh-nexon-lr',
      type: 'insurance_claim',
      timestamp: '2026-09-21T15:30:00.000Z',
      odometerKm: 15980,
      title: 'OBC Port Latch Replacement (Settled)',
      summary: 'Claim clm-2026-104 settled cashless under NammaShield policy.',
      metadata: {
        claimId: 'clm-2026-104',
        amountInr: 18400,
        status: 'settled',
      },
    },
    {
      id: 'evt-004',
      vehicleId: 'veh-nexon-lr',
      type: 'battery_snapshot',
      timestamp: '2026-11-18T08:15:00.000Z',
      odometerKm: 18210,
      title: 'Quarterly SoH Diagnostic Snapshot',
      summary: 'Estimated State of Health 97.4% across 162 equivalent full cycles.',
      metadata: {
        sohPercent: 97.4,
        cycles: 162,
        dcFastRatioPct: 23,
      },
    },
  ],
};

export const SEED_FAQS: FaqEntry[] = [
  {
    id: 'faq-1',
    topic: 'Range Estimation',
    question: 'How does ChargeSense calculate my reachable range band?',
    answer:
      'ChargeSense multiplies your vehicle usable battery capacity (kWh) by SoC%, reserves your configured safety buffer (default 20%), and divides by speed-, AC-, payload-, and temperature-adjusted Wh/km to return a conservative Min, Likely, and Max band.',
    keywords: ['range', 'band', '55%', 'buffer', 'wh/km', 'consumption'],
  },
  {
    id: 'faq-2',
    topic: 'Reliability Score',
    question: 'Why do brand-new charging stations not score 98/100 immediately?',
    answer:
      'Reliability uses a Bayesian-smoothed Beta prior (65/100 baseline) combined with historical session outcomes, recency-weighted user check-ins (14-day half-life), and 30-day downtime. New stations start conservatively until enough verified sessions build confidence.',
    keywords: ['reliability', 'score', 'bayesian', 'new station', 'check-in'],
  },
  {
    id: 'faq-3',
    topic: 'Corridor Charging',
    question: 'Which connectors are supported on the Bengaluru–Mysuru pilot?',
    answer:
      'Most expressway DC hubs provide CCS2 (30–180 kW) and Type 2 AC (7.4–22 kW). Select fleet depots offer GB/T and legacy CHAdeMO. ChargeSense automatically excludes incompatible connectors for your active vehicle.',
    keywords: ['connector', 'ccs2', 'type 2', 'chademo', 'gbt', 'mysuru', 'bengaluru'],
  },
  {
    id: 'faq-4',
    topic: 'Digital Passport',
    question: 'How does the EV Digital Passport detect tampering?',
    answer:
      'Every ownership, charging, service, battery, and claim record includes the SHA-256 hash of the previous record before computing its own SHA-256 digest. Modifying any past record breaks the downstream chain.',
    keywords: ['passport', 'sha-256', 'hash', 'tamper', 'export', 'qr'],
  },
];
