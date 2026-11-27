export type ConnectorType = 'CCS2' | 'Type 2' | 'CHAdeMO' | 'GB/T';

export type DriveMode = 'eco' | 'city' | 'sport';

export type StationStatus = 'online' | 'degraded' | 'offline';

export type IssueType =
  | 'none'
  | 'charger_offline'
  | 'connector_damaged'
  | 'payment_failed'
  | 'slow_speed'
  | 'occupied_ice';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type RecommendationPreset = 'balanced' | 'fastest' | 'cheapest' | 'most_reliable' | 'custom';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  variant: string;
  year: number;
  registrationNumber: string;
  usableKwh: number;
  nominalKwh: number;
  efficiencyWhPerKm: number; // baseline combined consumption
  connectors: ConnectorType[];
  maxDcChargeKw: number;
  maxAcChargeKw: number;
  odometerKm: number;
  sohPercent: number; // simulated/reported State of Health
  cycleCount: number;
  imageUrl?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  city: string;
  preferredSafetyBufferPercent: number;
  preferredPreset: RecommendationPreset;
  units: 'metric' | 'imperial';
  createdAt: string;
}

export interface StationConnector {
  type: ConnectorType;
  powerKw: number;
  totalBays: number;
  availableBays: number;
}

export interface StationCheckIn {
  id: string;
  stationId: string;
  userId: string;
  userName: string;
  outcome: 'worked' | 'not_working';
  issueType: IssueType;
  comment: string;
  timestamp: string; // ISO string
}

export interface Station {
  id: string;
  name: string;
  operator: string;
  corridorSegment:
    | 'Bengaluru Urban'
    | 'Bidadi'
    | 'Ramanagara'
    | 'Channapatna'
    | 'Maddur'
    | 'Mandya'
    | 'Srirangapatna'
    | 'Mysuru';
  kmFromBengaluru: number;
  address: string;
  location: GeoPoint;
  status: StationStatus;
  connectors: StationConnector[];
  pricePerKwhInr: number;
  amenities: string[];
  open24x7: boolean;
  historicalSuccessCount: number;
  historicalFailureCount: number;
  downtimeHoursLast30d: number;
  checkIns: StationCheckIn[];
  installedAt: string;
  isDemoData: true;
}

export interface RangeInput {
  socPercent: number;
  avgSpeedKmh: number;
  acOn: boolean;
  ambientTempC: number;
  passengers: number;
  cargoKg: number;
  driveMode: DriveMode;
  safetyBufferPercent?: number;
}

export interface RangeFactorImpact {
  label: string;
  impactPercent: number;
  detail: string;
}

export interface RangeBand {
  socPercent: number;
  usableEnergyKwh: number;
  bufferedEnergyKwh: number;
  safetyBufferPercent: number;
  minKm: number;
  likelyKm: number;
  maxKm: number;
  adjustedWhPerKm: number;
  explanation: string;
  factors: RangeFactorImpact[];
}

export interface ReliabilityResult {
  score: number; // 0-100
  confidence: ConfidenceLevel;
  effectiveSamples: number;
  recentPositiveCount: number;
  recentNegativeCount: number;
  reasons: string[];
}

export type ExclusionReason =
  | 'offline'
  | 'incompatible_connector'
  | 'out_of_range'
  | 'price_exceeded'
  | 'power_below_min';

export interface ExcludedStation {
  station: Station;
  reasons: ExclusionReason[];
}

export interface CompatibilityResult {
  compatible: Station[];
  excluded: ExcludedStation[];
}

export interface RecommendationWeights {
  detour: number;
  eta: number;
  price: number;
  speed: number;
  availability: number;
  reliability: number;
}

export interface RecommendationOptions {
  origin: GeoPoint;
  rangeBand: RangeBand;
  preset: RecommendationPreset;
  customWeights?: Partial<RecommendationWeights>;
  maxPriceInr?: number;
  minPowerKw?: number;
  maxResults?: number;
  useMinRangeForSafety?: boolean;
  corridorDirectionKm?: number; // optional target km marker along corridor
  referenceNow?: Date;
}

export interface StationRecommendation {
  station: Station;
  score: number; // 0-100 composite
  reliability: ReliabilityResult;
  distanceKm: number;
  detourKm: number;
  etaMinutes: number;
  effectiveChargeKw: number;
  estimatedCharge20To80Min: number;
  availableCompatibleBays: number;
  totalCompatibleBays: number;
  confidence: ConfidenceLevel;
  whyThisOne: string;
}

export interface RecommendationReport {
  recommendations: StationRecommendation[];
  fallback: StationRecommendation | null;
  excludedCount: number;
  excludedByReason: Record<ExclusionReason, number>;
  computationMs: number;
  summary: string;
}

export interface RouteWaypoint {
  name: string;
  kmFromStart: number;
  location: GeoPoint;
}

export interface RouteCorridor {
  id: string;
  source: string;
  destination: string;
  distanceKm: number;
  baseDriveMinutes: number;
  elevationGainM: number;
  waypoints: RouteWaypoint[];
}

export interface RoutingProvider {
  readonly providerName: string;
  listAvailableRoutes(): RouteCorridor[];
  findRoute(source: string, destination: string): RouteCorridor | null;
}

export interface TripStop {
  station: Station;
  kmFromStart: number;
  arrivalSocPercent: number;
  departSocPercent: number;
  energyAddedKwh: number;
  chargeDurationMinutes: number;
  estimatedCostInr: number;
  reliabilityScore: number;
  reason: string;
}

export interface TripPlanRequest {
  source: string;
  destination: string;
  startingSocPercent: number;
  minArrivalSocPercent?: number;
  driveMode?: DriveMode;
  acOn?: boolean;
  preset?: RecommendationPreset;
}

export interface TripPlan {
  feasible: boolean;
  corridor: RouteCorridor | null;
  startingSocPercent: number;
  finalArrivalSocPercent: number;
  totalDistanceKm: number;
  totalEnergyNeededKwh: number;
  drivingMinutes: number;
  chargingMinutes: number;
  totalMinutes: number;
  totalEstimatedCostInr: number;
  stops: TripStop[];
  narrative: string;
  warnings: string[];
}

export type PassportEventType =
  | 'ownership_registered'
  | 'charging_session'
  | 'service_record'
  | 'battery_snapshot'
  | 'insurance_claim';

export interface PassportEventPayload {
  id: string;
  vehicleId: string;
  type: PassportEventType;
  timestamp: string;
  odometerKm: number;
  title: string;
  summary: string;
  metadata: Record<string, string | number | boolean>;
}

export interface PassportEvent extends PassportEventPayload {
  prevHash: string;
  hash: string;
}

export interface PassportVerificationResult {
  valid: boolean;
  checkedCount: number;
  brokenAtIndex: number | null;
  reason: string;
}

export interface ServiceCentre {
  id: string;
  name: string;
  brandSupport: string[];
  city: string;
  corridorSegment: string;
  address: string;
  phone: string;
  location: GeoPoint;
  evCertifiedBays: number;
  nextSlotLabel: string;
  servicesOffered: string[];
  isDemoData: true;
}

export interface ClaimRecord {
  id: string;
  vehicleId: string;
  policyNumber: string;
  insurerName: string;
  incidentType: 'battery_thermal' | 'charger_surge' | 'collision' | 'roadside_tow' | 'glass_body';
  incidentDate: string;
  description: string;
  estimatedAmountInr: number;
  documents: string[];
  status: 'draft' | 'submitted' | 'survey_assigned' | 'approved' | 'settled';
  timeline: { stage: string; timestamp: string; note: string }[];
}

export interface TripHistoryRecord {
  id: string;
  vehicleId: string;
  date: string;
  origin: string;
  destination: string;
  distanceKm: number;
  energyUsedKwh: number;
  costInr: number;
  avgEfficiencyWhKm: number;
  ecoScore: number;
}

export interface BatteryHealthSnapshot {
  month: string;
  sohPercent: number;
  dcFastChargeRatio: number;
  avgTempC: number;
  cycles: number;
}

export interface FaqEntry {
  id: string;
  topic: string;
  question: string;
  answer: string;
  keywords: string[];
}

export interface SimulatedVehicleControls {
  locked: boolean;
  climatePreconditioning: boolean;
  targetCabinTempC: number;
  valetMode: boolean;
  geofenceEnabled: boolean;
  geofenceRadiusKm: number;
  chargeLimitPercent: number;
  scheduledChargeWindow: string;
  v2lEnabled: boolean;
  v2gEnabled: boolean;
  v2vEnabled: boolean;
  driveMode: DriveMode;
  regenLevel: 'low' | 'medium' | 'high' | 'one_pedal';
  sentryArmed: boolean;
  otaVersion: string;
  otaStatus: 'up_to_date' | 'update_available';
  hornLightsActive: boolean;
}
