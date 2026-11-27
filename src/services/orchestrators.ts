import { repositories } from '../data/mockRepositories';
import { verifyPassportChain } from '../domain/passport';
import { estimateRange } from '../domain/range';
import { recommendStations } from '../domain/recommendation';
import {
  planTrip,
  SimulatedCorridorRoutingProvider,
} from '../domain/tripPlanner';
import {
  FaqEntry,
  GeoPoint,
  PassportEvent,
  PassportEventPayload,
  PassportVerificationResult,
  RangeBand,
  RangeInput,
  RecommendationOptions,
  RecommendationReport,
  ServiceCentre,
  SimulatedVehicleControls,
  Station,
  TripPlan,
  TripPlanRequest,
  Vehicle,
} from '../domain/types';

export const BENGALURU_ORIGIN: GeoPoint = { lat: 12.912, lng: 77.512 };

export class RecommendationService {
  async getRecommendations(
    vehicle: Vehicle,
    rangeInput: RangeInput,
    options: Omit<RecommendationOptions, 'rangeBand'>
  ): Promise<{ rangeBand: RangeBand; report: RecommendationReport }> {
    const stations = await repositories.stations.listStations();
    const rangeBand = estimateRange(vehicle, rangeInput);
    const report = recommendStations(vehicle, stations, {
      ...options,
      rangeBand,
    });
    return { rangeBand, report };
  }
}

export class TripService {
  private readonly routingProvider = new SimulatedCorridorRoutingProvider();

  listRoutes() {
    return this.routingProvider.listAvailableRoutes();
  }

  async planCorridorTrip(
    vehicle: Vehicle,
    request: TripPlanRequest
  ): Promise<TripPlan> {
    const stations = await repositories.stations.listStations();
    return planTrip(request, vehicle, stations, this.routingProvider);
  }
}

export class PassportService {
  async getVerifiedPassport(vehicleId: string): Promise<{
    events: PassportEvent[];
    verification: PassportVerificationResult;
  }> {
    const events = await repositories.passports.getEvents(vehicleId);
    const verification = await verifyPassportChain(events);
    return { events, verification };
  }

  async recordEvent(
    vehicleId: string,
    payload: Omit<PassportEventPayload, 'id' | 'vehicleId'>
  ) {
    const events = await repositories.passports.appendEvent(vehicleId, payload);
    const verification = await verifyPassportChain(events);
    return { events, verification };
  }
}

export interface RetrievalHit {
  kind: 'station' | 'service_centre' | 'faq';
  id: string;
  title: string;
  snippet: string;
  score: number;
}

export class RetrievalService {
  async searchKnowledge(query: string, limit = 6): Promise<RetrievalHit[]> {
    const terms = query
      .toLowerCase()
      .split(/\W+/)
      .filter((t) => t.length >= 2);
    if (terms.length === 0) return [];

    const [stations, centres, faqs] = await Promise.all([
      repositories.stations.listStations(),
      repositories.serviceCentres.listServiceCentres(),
      repositories.faqs.listFaqs(),
    ]);

    const hits: RetrievalHit[] = [];

    for (const s of stations) {
      const hay = `${s.name} ${s.operator} ${s.corridorSegment} ${s.address} ${s.amenities.join(' ')} ${s.connectors.map((c) => c.type).join(' ')}`.toLowerCase();
      const score = terms.reduce((acc, t) => acc + (hay.includes(t) ? 1 : 0), 0);
      if (score > 0) {
        hits.push({
          kind: 'station',
          id: s.id,
          title: s.name,
          snippet: `KM ${s.kmFromBengaluru} (${s.corridorSegment}), ₹${s.pricePerKwhInr}/kWh, status ${s.status}`,
          score,
        });
      }
    }

    for (const c of centres as ServiceCentre[]) {
      const hay = `${c.name} ${c.city} ${c.brandSupport.join(' ')} ${c.servicesOffered.join(' ')}`.toLowerCase();
      const score = terms.reduce((acc, t) => acc + (hay.includes(t) ? 1 : 0), 0);
      if (score > 0) {
        hits.push({
          kind: 'service_centre',
          id: c.id,
          title: c.name,
          snippet: `${c.city} · Brands: ${c.brandSupport.join(', ')} · Next slot: ${c.nextSlotLabel}`,
          score: score + 0.5,
        });
      }
    }

    for (const f of faqs as FaqEntry[]) {
      const hay = `${f.topic} ${f.question} ${f.answer} ${f.keywords.join(' ')}`.toLowerCase();
      const score = terms.reduce((acc, t) => acc + (hay.includes(t) ? 1 : 0), 0);
      if (score > 0) {
        hits.push({
          kind: 'faq',
          id: f.id,
          title: f.question,
          snippet: f.answer,
          score: score + 0.8,
        });
      }
    }

    return hits.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}

export class TelemetrySimulator {
  static createInitialControls(): SimulatedVehicleControls {
    return {
      locked: true,
      climatePreconditioning: false,
      targetCabinTempC: 23,
      valetMode: false,
      geofenceEnabled: true,
      geofenceRadiusKm: 45,
      chargeLimitPercent: 80,
      scheduledChargeWindow: '23:00 – 05:30',
      v2lEnabled: false,
      v2gEnabled: false,
      v2vEnabled: false,
      driveMode: 'city',
      regenLevel: 'high',
      sentryArmed: true,
      otaVersion: 'CS-OS 4.2.1 (Sim)',
      otaStatus: 'up_to_date',
      hornLightsActive: false,
    };
  }

  static transitionControl(
    state: SimulatedVehicleControls,
    action: Partial<SimulatedVehicleControls>
  ): SimulatedVehicleControls {
    const next = { ...state, ...action };
    // Enforce deterministic safety guardrails in the simulated state machine
    if (next.valetMode) {
      next.driveMode = 'eco';
    }
    if (next.v2gEnabled && next.v2lEnabled) {
      next.v2lEnabled = false;
    }
    return next;
  }
}

export const services = {
  recommendation: new RecommendationService(),
  trip: new TripService(),
  passport: new PassportService(),
  retrieval: new RetrievalService(),
};
