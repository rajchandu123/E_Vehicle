import fs from 'node:fs';
import path from 'node:path';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import express from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

// Server-side Gemini client with required telemetry header
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured in environment secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const GEMINI_MODEL = 'gemini-4-hydrogen';

// Corridor segment reference coordinates along Bengaluru - Mysuru NH-275
const CORRIDOR_ANCHORS = [
  { segment: 'Bengaluru Urban', km: 4, lat: 12.922, lng: 77.528 },
  { segment: 'Bidadi', km: 24, lat: 12.798, lng: 77.382 },
  { segment: 'Ramanagara', km: 42, lat: 12.716, lng: 77.281 },
  { segment: 'Channapatna', km: 54, lat: 12.652, lng: 77.206 },
  { segment: 'Maddur', km: 76, lat: 12.584, lng: 77.044 },
  { segment: 'Mandya', km: 98, lat: 12.522, lng: 76.895 },
  { segment: 'Srirangapatna', km: 126, lat: 12.424, lng: 76.683 },
  { segment: 'Mysuru', km: 142, lat: 12.313, lng: 76.641 },
] as const;

const KNOWN_PLACES: Record<string, { label: string; lat: number; lng: number }> = {
  bengaluru: { label: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
  bangalore: { label: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
  kengeri: { label: 'Bengaluru (Kengeri)', lat: 12.9098, lng: 77.4828 },
  bidadi: { label: 'Bidadi', lat: 12.7985, lng: 77.3822 },
  ramanagara: { label: 'Ramanagara', lat: 12.7159, lng: 77.2816 },
  channapatna: { label: 'Channapatna', lat: 12.6518, lng: 77.2067 },
  maddur: { label: 'Maddur', lat: 12.5844, lng: 77.0439 },
  mandya: { label: 'Mandya', lat: 12.5218, lng: 76.8951 },
  srirangapatna: { label: 'Srirangapatna', lat: 12.4237, lng: 76.6829 },
  mysuru: { label: 'Mysuru', lat: 12.2958, lng: 76.6394 },
  mysore: { label: 'Mysuru', lat: 12.2958, lng: 76.6394 },
  'nandi hills': { label: 'Nandi Hills', lat: 13.3702, lng: 77.6835 },
  madikeri: { label: 'Madikeri (Coorg)', lat: 12.4244, lng: 75.7382 },
  coorg: { label: 'Madikeri (Coorg)', lat: 12.4244, lng: 75.7382 },
  hassan: { label: 'Hassan', lat: 13.0033, lng: 76.1004 },
  tumakuru: { label: 'Tumakuru', lat: 13.3379, lng: 77.1173 },
};

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function classifyCorridorAnchor(lat: number, lng: number): {
  corridorSegment: string;
  kmFromBengaluru: number;
} {
  let closest: (typeof CORRIDOR_ANCHORS)[number] = CORRIDOR_ANCHORS[0];
  let minD = Infinity;
  for (const anchor of CORRIDOR_ANCHORS) {
    const d = haversineKm({ lat, lng }, { lat: anchor.lat, lng: anchor.lng });
    if (d < minD) {
      minD = d;
      closest = anchor;
    }
  }
  const distFromBlr = haversineKm(
    { lat: 12.922, lng: 77.528 },
    { lat, lng }
  );
  return {
    corridorSegment: closest.segment,
    kmFromBengaluru: Math.min(165, Math.max(0, Math.round(distFromBlr * 1.12))),
  };
}

interface OsmElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function parseOutputKw(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const match = raw.match(/(\d+(?:\.\d+)?)/);
  if (!match) return fallback;
  const num = Number(match[1]);
  return Number.isFinite(num) && num >= 2 && num <= 400 ? num : fallback;
}

function parseFeeInr(tags: Record<string, string>): number {
  const raw = tags.charge || tags['fee:amount'] || '';
  const match = raw.match(/(\d+(?:\.\d+)?)/);
  if (match) {
    const val = Number(match[1]);
    if (Number.isFinite(val) && val >= 0 && val <= 60) return val;
  }
  if (tags.fee === 'no') return 0;
  // Standard Karnataka BESCOM / public DC fast charging reference tariff when OSM fee tag is absent
  const hasDc =
    Boolean(tags['socket:type2_combo']) ||
    Boolean(tags['socket:ccs']) ||
    Boolean(tags['socket:chademo']) ||
    Boolean(tags['socket:gb_t']);
  return hasDc ? 16 : 10;
}

function parseOsmStation(el: OsmElement) {
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (lat === undefined || lng === undefined) return null;

  const tags = el.tags ?? {};
  const operator =
    tags.operator || tags.brand || tags.network || 'OpenStreetMap Listed Operator';
  const name =
    tags.name ||
    (tags.operator ? `${tags.operator} EV Charging Station` : `EV Charging Hub #${el.id}`);

  const connectors: {
    type: 'CCS2' | 'Type 2' | 'CHAdeMO' | 'GB/T';
    powerKw: number;
    totalBays: number;
    availableBays: number;
  }[] = [];

  const ccsCount = Number(tags['socket:type2_combo'] || tags['socket:ccs'] || 0);
  if (ccsCount > 0 || tags['socket:type2_combo'] === 'yes' || tags['socket:ccs'] === 'yes') {
    const bays = Math.max(1, Math.min(8, Number.isFinite(ccsCount) && ccsCount > 0 ? ccsCount : 2));
    connectors.push({
      type: 'CCS2',
      powerKw: parseOutputKw(
        tags['socket:type2_combo:output'] || tags['socket:ccs:output'] || tags.maxpower,
        60
      ),
      totalBays: bays,
      availableBays: bays,
    });
  }

  const type2Count = Number(tags['socket:type2'] || 0);
  if (type2Count > 0 || tags['socket:type2'] === 'yes') {
    const bays = Math.max(1, Math.min(8, Number.isFinite(type2Count) && type2Count > 0 ? type2Count : 2));
    connectors.push({
      type: 'Type 2',
      powerKw: parseOutputKw(tags['socket:type2:output'], 7.4),
      totalBays: bays,
      availableBays: bays,
    });
  }

  const chademoCount = Number(tags['socket:chademo'] || 0);
  if (chademoCount > 0 || tags['socket:chademo'] === 'yes') {
    const bays = Math.max(1, Math.min(4, Number.isFinite(chademoCount) && chademoCount > 0 ? chademoCount : 1));
    connectors.push({
      type: 'CHAdeMO',
      powerKw: parseOutputKw(tags['socket:chademo:output'], 50),
      totalBays: bays,
      availableBays: bays,
    });
  }

  const gbtCount = Number(tags['socket:gb_t'] || tags['socket:gbt'] || 0);
  if (gbtCount > 0 || tags['socket:gb_t'] === 'yes') {
    const bays = Math.max(1, Math.min(4, Number.isFinite(gbtCount) && gbtCount > 0 ? gbtCount : 1));
    connectors.push({
      type: 'GB/T',
      powerKw: parseOutputKw(tags['socket:gb_t:output'], 60),
      totalBays: bays,
      availableBays: bays,
    });
  }

  // If OSM node had amenity=charging_station without explicit socket tags, include standard Indian highway CCS2 + Type 2 ports
  if (connectors.length === 0) {
    const cap = Number(tags.capacity || 2);
    const bays = Math.max(1, Math.min(6, Number.isFinite(cap) && cap > 0 ? cap : 2));
    connectors.push(
      { type: 'CCS2', powerKw: 50, totalBays: bays, availableBays: bays },
      { type: 'Type 2', powerKw: 7.4, totalBays: 1, availableBays: 1 }
    );
  }

  const addressParts = [
    tags['addr:street'],
    tags['addr:suburb'] || tags['addr:city'] || tags['addr:district'],
    tags['addr:postcode'],
  ].filter(Boolean);

  const { corridorSegment, kmFromBengaluru } = classifyCorridorAnchor(lat, lng);
  const address =
    addressParts.length > 0
      ? addressParts.join(', ')
      : `${corridorSegment}, NH-275 Corridor, Karnataka`;

  const amenities: string[] = [];
  if (tags.opening_hours === '24/7') amenities.push('Open 24x7');
  if (tags.wheelchair === 'yes') amenities.push('Accessible');
  if (tags.covered === 'yes') amenities.push('Covered Bay');
  if (tags.authentication) amenities.push(`Auth: ${tags.authentication}`);
  if (amenities.length === 0) amenities.push('Public Highway Access');

  const isDisused =
    tags.disused === 'yes' ||
    tags['operational_status'] === 'closed' ||
    tags.access === 'no';

  return {
    id: `osm_${el.type}_${el.id}`,
    name: name.slice(0, 140),
    operator: operator.slice(0, 80),
    corridorSegment,
    kmFromBengaluru,
    address: address.slice(0, 240),
    location: { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) },
    status: isDisused ? ('offline' as const) : ('online' as const),
    connectors: connectors.slice(0, 6),
    pricePerKwhInr: parseFeeInr(tags),
    amenities: amenities.slice(0, 10),
    open24x7: tags.opening_hours === '24/7' || !tags.opening_hours,
    historicalSuccessCount: 0,
    historicalFailureCount: 0,
    downtimeHoursLast30d: 0,
    checkIns: [],
    installedAt: new Date().toISOString().slice(0, 10),
    source: 'osm_overpass' as const,
    isDemoData: false,
  };
}

async function fetchOverpass(query: string): Promise<{ elements?: OsmElement[] }> {
  const endpoints = [
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass-api.de/api/interpreter',
  ];

  const controllers = endpoints.map(() => new AbortController());
  const overallTimer = setTimeout(() => {
    controllers.forEach((c) => c.abort(new Error('Overpass timeout')));
  }, 16000);

  try {
    const result = await Promise.any(
      endpoints.map(async (endpoint, idx) => {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            Accept: 'application/json',
            'User-Agent': 'ChargeSense-EV-OS/1.0',
          },
          body: `data=${encodeURIComponent(query)}`,
          signal: controllers[idx].signal,
        });
        if (!res.ok) {
          throw new Error(`Overpass HTTP ${res.status} (${endpoint})`);
        }
        const json = (await res.json()) as { elements?: OsmElement[] };
        controllers.forEach((c, j) => {
          if (j !== idx) c.abort();
        });
        return json;
      })
    );
    return result;
  } catch (err) {
    if (err instanceof AggregateError && err.errors.length > 0) {
      const first = err.errors[0];
      throw first instanceof Error ? first : new Error(String(first));
    }
    throw err instanceof Error ? err : new Error('Overpass API unreachable');
  } finally {
    clearTimeout(overallTimer);
  }
}

// In-memory short TTL cache for live Overpass queries
let cachedStations: { fetchedAt: number; data: ReturnType<typeof parseOsmStation>[] } | null = null;
let cachedCentres: { fetchedAt: number; data: unknown[] } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000;

async function geocodePlace(query: string): Promise<{ label: string; lat: number; lng: number }> {
  const normalized = query.trim().toLowerCase();
  for (const [key, coords] of Object.entries(KNOWN_PLACES)) {
    if (normalized === key || normalized.includes(key)) {
      return coords;
    }
  }

  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=in&limit=1&q=${encodeURIComponent(
    query.trim()
  )}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'ChargeSense-EV-OS/1.0' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    throw new Error(`Nominatim geocoder returned HTTP ${res.status}`);
  }
  const results = (await res.json()) as Array<{
    display_name: string;
    lat: string;
    lon: string;
  }>;
  if (!results || results.length === 0) {
    throw new Error(`Could not find location "${query}" in India.`);
  }
  return {
    label: results[0].display_name.split(',')[0].trim(),
    lat: Number(results[0].lat),
    lng: Number(results[0].lon),
  };
}

const RouteRequestSchema = z.object({
  source: z.string().trim().min(2).max(100),
  destination: z.string().trim().min(2).max(100),
});

const AssistantParseSchema = z.object({
  message: z.string().trim().min(1).max(600),
  defaultSocPercent: z.number().min(0).max(100).optional(),
});

const AssistantExplainSchema = z.object({
  message: z.string().trim().min(1).max(600),
  structuredQuery: z.record(z.string(), z.unknown()),
  engineSummary: z.string().max(4000),
  citations: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      detail: z.string(),
    })
  ),
});

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '256kb' }));

  // 1. Live EV Charging Stations from OpenStreetMap Overpass API
  app.get('/api/stations/live', async (req: Request, res: Response) => {
    try {
      const forceRefresh = req.query.refresh === '1';
      if (
        !forceRefresh &&
        cachedStations &&
        Date.now() - cachedStations.fetchedAt < CACHE_TTL_MS
      ) {
        res.json({
          source: 'osm_overpass',
          fetchedAt: new Date(cachedStations.fetchedAt).toISOString(),
          stations: cachedStations.data,
        });
        return;
      }

      const overpassQuery = `
        [out:json][timeout:14];
        node["amenity"="charging_station"](12.24,76.54,13.06,77.75);
        out 120;
      `;
      const json = await fetchOverpass(overpassQuery);
      const parsed = (json.elements ?? [])
        .map(parseOsmStation)
        .filter((s): s is NonNullable<typeof s> => s !== null);

      cachedStations = { fetchedAt: Date.now(), data: parsed };
      res.json({
        source: 'osm_overpass',
        fetchedAt: new Date(cachedStations.fetchedAt).toISOString(),
        stations: parsed,
      });
    } catch (err) {
      res.status(502).json({
        error:
          err instanceof Error
            ? `OpenStreetMap Overpass error: ${err.message}`
            : 'Unable to fetch live stations from OpenStreetMap.',
      });
    }
  });

  // 2. Live Automotive / EV Service Centres from OpenStreetMap Overpass API
  app.get('/api/service-centres/live', async (req: Request, res: Response) => {
    try {
      const forceRefresh = req.query.refresh === '1';
      if (
        !forceRefresh &&
        cachedCentres &&
        Date.now() - cachedCentres.fetchedAt < CACHE_TTL_MS
      ) {
        res.json({
          source: 'osm_overpass',
          fetchedAt: new Date(cachedCentres.fetchedAt).toISOString(),
          centres: cachedCentres.data,
        });
        return;
      }

      const overpassQuery = `
        [out:json][timeout:14];
        node["shop"~"car_repair|car"](12.24,76.54,13.06,77.75);
        out 40;
      `;
      const json = await fetchOverpass(overpassQuery);
      const centres = (json.elements ?? [])
        .map((el) => {
          const lat = el.lat ?? el.center?.lat;
          const lng = el.lon ?? el.center?.lon;
          const tags = el.tags ?? {};
          if (lat === undefined || lng === undefined || !tags.name) return null;
          const anchor = classifyCorridorAnchor(lat, lng);
          const brandTag = tags.brand || tags.name;
          const brands = ['Tata', 'MG', 'Mahindra', 'Hyundai', 'BYD'].filter((b) =>
            brandTag.toLowerCase().includes(b.toLowerCase())
          );
          return {
            id: `osm_svc_${el.type}_${el.id}`,
            name: tags.name.slice(0, 120),
            brandSupport: brands.length > 0 ? brands : ['Multi-Brand EV & Diagnostics'],
            city: tags['addr:city'] || anchor.corridorSegment,
            corridorSegment: anchor.corridorSegment,
            address:
              [tags['addr:street'], tags['addr:suburb'], tags['addr:city']]
                .filter(Boolean)
                .join(', ') || `${anchor.corridorSegment}, Karnataka`,
            phone: tags.phone || tags['contact:phone'] || 'Phone unlisted on OSM',
            location: { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) },
            evCertifiedBays: Number(tags.capacity || 4) || 4,
            nextSlotLabel: 'Request via booking form',
            servicesOffered: [
              'Diagnostics & Inspection',
              'Thermal & Coolant Check',
              'Tyre, Brake & Alignment',
            ],
            source: 'osm_overpass' as const,
            isDemoData: false,
          };
        })
        .filter((c): c is NonNullable<typeof c> => c !== null)
        .slice(0, 24);

      cachedCentres = { fetchedAt: Date.now(), data: centres };
      res.json({
        source: 'osm_overpass',
        fetchedAt: new Date(cachedCentres.fetchedAt).toISOString(),
        centres,
      });
    } catch (err) {
      res.status(502).json({
        error:
          err instanceof Error
            ? `OpenStreetMap service lookup error: ${err.message}`
            : 'Unable to fetch service centres from OpenStreetMap.',
      });
    }
  });

  // 3. Real Road Routing via Nominatim + OSRM
  app.post('/api/routing/route', async (req: Request, res: Response) => {
    const parsed = RouteRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid route request' });
      return;
    }

    try {
      const [src, dst] = await Promise.all([
        geocodePlace(parsed.data.source),
        geocodePlace(parsed.data.destination),
      ]);

      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${src.lng},${src.lat};${dst.lng},${dst.lat}?overview=full&geometries=geojson&steps=false`;
      const osrmRes = await fetch(osrmUrl, {
        headers: { 'User-Agent': 'ChargeSense-EV-OS/1.0' },
        signal: AbortSignal.timeout(10000),
      });
      if (!osrmRes.ok) {
        throw new Error(`OSRM routing service returned HTTP ${osrmRes.status}`);
      }

      const osrmJson = (await osrmRes.json()) as {
        code: string;
        routes?: Array<{
          distance: number;
          duration: number;
          geometry: { coordinates: [number, number][] };
        }>;
      };

      const route = osrmJson.routes?.[0];
      if (!route || osrmJson.code !== 'Ok') {
        throw new Error('No drivable route found between those locations.');
      }

      const coords = route.geometry.coordinates;
      const geometry: [number, number][] = coords.map(([lng, lat]) => [lat, lng]);
      const distanceKm = Math.round(route.distance / 1000);
      const baseDriveMinutes = Math.round(route.duration / 60);

      // Sample up to 12 evenly spaced waypoints along the real OSRM geometry
      const sampleCount = Math.min(12, Math.max(2, geometry.length));
      const waypoints = Array.from({ length: sampleCount }, (_, idx) => {
        const ptIdx =
          idx === sampleCount - 1
            ? geometry.length - 1
            : Math.floor((idx / (sampleCount - 1)) * (geometry.length - 1));
        const [lat, lng] = geometry[ptIdx];
        const kmFromStart = Math.round((idx / (sampleCount - 1)) * distanceKm);
        const name =
          idx === 0
            ? src.label
            : idx === sampleCount - 1
            ? dst.label
            : `Route km ${kmFromStart}`;
        return { name, kmFromStart, location: { lat, lng } };
      });

      res.json({
        corridor: {
          id: `osrm-${src.label.toLowerCase().replace(/\W+/g, '-')}-${dst.label
            .toLowerCase()
            .replace(/\W+/g, '-')}`,
          source: src.label,
          destination: dst.label,
          distanceKm,
          baseDriveMinutes,
          elevationGainM: 0,
          waypoints,
          geometry,
          providerSource: 'osrm',
        },
      });
    } catch (err) {
      res.status(502).json({
        error:
          err instanceof Error
            ? err.message
            : 'Unable to compute real driving route via OSRM.',
      });
    }
  });

  // 4. Live Ambient Weather along Corridor via Open-Meteo
  app.get('/api/weather', async (req: Request, res: Response) => {
    try {
      const lat = Number(req.query.lat ?? 12.72);
      const lng = Number(req.query.lng ?? 77.28);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        res.status(400).json({ error: 'Invalid lat/lng parameters' });
        return;
      }
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,wind_speed_10m,relative_humidity_2m,weather_code`;
      const wxRes = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!wxRes.ok) {
        throw new Error(`Open-Meteo returned HTTP ${wxRes.status}`);
      }
      const wxJson = (await wxRes.json()) as {
        current?: {
          temperature_2m?: number;
          wind_speed_10m?: number;
          relative_humidity_2m?: number;
          weather_code?: number;
          time?: string;
        };
      };
      res.json({
        temperatureC: Math.round(wxJson.current?.temperature_2m ?? 28),
        windSpeedKmh: Math.round(wxJson.current?.wind_speed_10m ?? 10),
        humidityPercent: Math.round(wxJson.current?.relative_humidity_2m ?? 55),
        weatherCode: wxJson.current?.weather_code ?? 0,
        fetchedAt: new Date().toISOString(),
        source: 'open-meteo',
      });
    } catch (err) {
      res.status(502).json({
        error:
          err instanceof Error
            ? `Weather fetch failed: ${err.message}`
            : 'Unable to fetch live weather.',
      });
    }
  });

  // 5A. Gemini Step 1: Parse natural-language request into structured query schema
  app.post('/api/assistant/parse', async (req: Request, res: Response) => {
    const parsed = AssistantParseSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid query' });
      return;
    }

    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `User message: "${parsed.data.message}"\nCurrent vehicle SoC fallback if unmentioned: ${parsed.data.defaultSocPercent ?? 55}%.`,
        config: {
          systemInstruction:
            'Convert the EV driver query into a structured JSON intent. Never decide station compatibility or range yourself. Use intent="unknown" if the question is unrelated to EV charging, range, trip planning, service, insurance, or passport.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              intent: {
                type: Type.STRING,
                description:
                  'One of: find_charger, range_check, trip_plan, service_or_faq, unknown',
              },
              maxPriceInr: {
                type: Type.NUMBER,
                description: 'Max INR per kWh mentioned, or 0 if not mentioned.',
              },
              minPowerKw: {
                type: Type.NUMBER,
                description: 'Minimum kW power (e.g. 50 for fast charger), or 0 if unmentioned.',
              },
              targetLocation: {
                type: Type.STRING,
                description: 'Destination or corridor town mentioned (e.g. Mysuru, Mandya), or empty string.',
              },
              sourceLocation: {
                type: Type.STRING,
                description: 'Origin city if mentioned, else Bengaluru.',
              },
              socPercent: {
                type: Type.NUMBER,
                description: 'Battery SoC percentage mentioned (0-100), or -1 if unmentioned.',
              },
              preset: {
                type: Type.STRING,
                description: 'One of: balanced, fastest, cheapest, most_reliable',
              },
              keywords: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Search keywords for FAQ or service centre retrieval.',
              },
            },
            required: ['intent', 'keywords'],
          },
        },
      });

      const raw = (response.text ?? '{}').trim();
      const structured = JSON.parse(raw);
      res.json({ structuredQuery: structured });
    } catch (err) {
      res.status(502).json({
        error:
          err instanceof Error
            ? `Gemini query extraction error: ${err.message}`
            : 'Assistant query parsing failed.',
      });
    }
  });

  // 5B. Gemini Step 2: Grounded explanation citing ONLY deterministic engine records
  app.post('/api/assistant/explain', async (req: Request, res: Response) => {
    const parsed = AssistantExplainSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid payload' });
      return;
    }

    try {
      const ai = getGeminiClient();
      const citationsText =
        parsed.data.citations.length > 0
          ? parsed.data.citations
              .map((c) => `- [${c.id}] ${c.title}: ${c.detail}`)
              .join('\n')
          : 'NO MATCHING CITATIONS.';

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `User question: ${parsed.data.message}\n\nParsed intent JSON: ${JSON.stringify(
          parsed.data.structuredQuery
        )}\n\nDeterministic Engine Output:\n${parsed.data.engineSummary}\n\nVerified Records (cite exact IDs in square brackets):\n${citationsText}`,
        config: {
          systemInstruction:
            'You are ChargeSense AI. Explain ONLY the deterministic engine output and verified records provided. Always cite record IDs like [osm_node_123] or [faq-1] when referencing stations, service centres, or rules. Never invent prices, bay counts, distances, or compatibility. If intent is "unknown" or no verified records support the user request, say "I don\'t know" and briefly state what is outside available data.',
        },
      });

      res.json({ reply: (response.text ?? '').trim() });
    } catch (err) {
      res.status(502).json({
        error:
          err instanceof Error
            ? `Gemini explanation error: ${err.message}`
            : 'Assistant explanation failed.',
      });
    }
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(import.meta.dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Production build missing. Run npm run build.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ChargeSense server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
