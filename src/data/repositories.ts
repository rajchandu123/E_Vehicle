import {
  BatteryHealthSnapshot,
  ClaimRecord,
  FaqEntry,
  PassportEvent,
  PassportEventPayload,
  ServiceCentre,
  Station,
  StationCheckIn,
  TripHistoryRecord,
  UserProfile,
  Vehicle,
} from '../domain/types';

export interface UserRepo {
  listUsers(): Promise<UserProfile[]>;
  getActiveUser(): Promise<UserProfile>;
  setActiveUser(userId: string): Promise<UserProfile>;
  createUser(
    input: Omit<UserProfile, 'id' | 'createdAt'>
  ): Promise<UserProfile>;
  updateUser(
    userId: string,
    patch: Partial<UserProfile>
  ): Promise<UserProfile>;
}

export interface VehicleRepo {
  listVehicles(): Promise<Vehicle[]>;
  getVehicleById(id: string): Promise<Vehicle | null>;
  addVehicle(input: Omit<Vehicle, 'id'>): Promise<Vehicle>;
  updateVehicle(id: string, patch: Partial<Vehicle>): Promise<Vehicle>;
}

export interface StationRepo {
  listStations(): Promise<Station[]>;
  getStationById(id: string): Promise<Station | null>;
  addCheckIn(
    stationId: string,
    checkIn: Omit<StationCheckIn, 'id' | 'stationId' | 'timestamp'>
  ): Promise<Station>;
  updateStationStatus(
    stationId: string,
    status: Station['status']
  ): Promise<Station>;
}

export interface TripRepo {
  listTripHistory(vehicleId: string): Promise<TripHistoryRecord[]>;
  logTrip(trip: Omit<TripHistoryRecord, 'id'>): Promise<TripHistoryRecord>;
}

export interface ClaimRepo {
  listClaims(vehicleId?: string): Promise<ClaimRecord[]>;
  createClaim(
    input: Omit<ClaimRecord, 'id' | 'status' | 'timeline'>
  ): Promise<ClaimRecord>;
}

export interface ServiceCentreRepo {
  listServiceCentres(): Promise<ServiceCentre[]>;
}

export interface PassportRepo {
  getEvents(vehicleId: string): Promise<PassportEvent[]>;
  appendEvent(
    vehicleId: string,
    payload: Omit<PassportEventPayload, 'id' | 'vehicleId'>
  ): Promise<PassportEvent[]>;
}

export interface BatteryHealthRepo {
  getSnapshots(vehicleId: string): Promise<BatteryHealthSnapshot[]>;
}

export interface FaqRepo {
  listFaqs(): Promise<FaqEntry[]>;
}
