import { appendPassportEvent, buildPassportChain } from '../domain/passport';
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
import {
  BatteryHealthRepo,
  ClaimRepo,
  FaqRepo,
  PassportRepo,
  ServiceCentreRepo,
  StationRepo,
  TripRepo,
  UserRepo,
  VehicleRepo,
} from './repositories';
import {
  SEED_BATTERY_HEALTH,
  SEED_CLAIMS,
  SEED_FAQS,
  SEED_PASSPORT_PAYLOADS,
  SEED_SERVICE_CENTRES,
  SEED_TRIPS,
} from './seed/records';
import { SEED_STATIONS } from './seed/stations';
import { SEED_USERS, SEED_VEHICLES } from './seed/vehicles';

const STORAGE_KEYS = {
  users: 'chargesense_demo_users_v1',
  activeUserId: 'chargesense_demo_active_user_v1',
  vehicles: 'chargesense_demo_vehicles_v1',
  stations: 'chargesense_demo_stations_v1',
  trips: 'chargesense_demo_trips_v1',
  claims: 'chargesense_demo_claims_v1',
  passports: 'chargesense_demo_passports_v1',
};

function readStorage<T>(key: string, fallback: T): T {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors in sandboxed frames
  }
}

export class MockUserRepo implements UserRepo {
  async listUsers(): Promise<UserProfile[]> {
    return readStorage<UserProfile[]>(STORAGE_KEYS.users, SEED_USERS);
  }

  async getActiveUser(): Promise<UserProfile> {
    const users = await this.listUsers();
    const activeId = readStorage<string>(
      STORAGE_KEYS.activeUserId,
      users[0]?.id ?? 'usr-ananya'
    );
    return users.find((u) => u.id === activeId) ?? users[0];
  }

  async setActiveUser(userId: string): Promise<UserProfile> {
    const users = await this.listUsers();
    const found = users.find((u) => u.id === userId) ?? users[0];
    writeStorage(STORAGE_KEYS.activeUserId, found.id);
    return found;
  }

  async createUser(
    input: Omit<UserProfile, 'id' | 'createdAt'>
  ): Promise<UserProfile> {
    const users = await this.listUsers();
    const created: UserProfile = {
      ...input,
      id: `usr-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
    };
    const next = [...users, created];
    writeStorage(STORAGE_KEYS.users, next);
    writeStorage(STORAGE_KEYS.activeUserId, created.id);
    return created;
  }

  async updateUser(
    userId: string,
    patch: Partial<UserProfile>
  ): Promise<UserProfile> {
    const users = await this.listUsers();
    const next = users.map((u) => (u.id === userId ? { ...u, ...patch } : u));
    writeStorage(STORAGE_KEYS.users, next);
    return next.find((u) => u.id === userId) ?? users[0];
  }
}

export class MockVehicleRepo implements VehicleRepo {
  async listVehicles(): Promise<Vehicle[]> {
    return readStorage<Vehicle[]>(STORAGE_KEYS.vehicles, SEED_VEHICLES);
  }

  async getVehicleById(id: string): Promise<Vehicle | null> {
    const list = await this.listVehicles();
    return list.find((v) => v.id === id) ?? null;
  }

  async addVehicle(input: Omit<Vehicle, 'id'>): Promise<Vehicle> {
    const list = await this.listVehicles();
    const created: Vehicle = {
      ...input,
      id: `veh-${Date.now().toString(36)}`,
    };
    writeStorage(STORAGE_KEYS.vehicles, [created, ...list]);
    return created;
  }

  async updateVehicle(id: string, patch: Partial<Vehicle>): Promise<Vehicle> {
    const list = await this.listVehicles();
    const next = list.map((v) => (v.id === id ? { ...v, ...patch } : v));
    writeStorage(STORAGE_KEYS.vehicles, next);
    return next.find((v) => v.id === id) ?? list[0];
  }
}

export class MockStationRepo implements StationRepo {
  async listStations(): Promise<Station[]> {
    return readStorage<Station[]>(STORAGE_KEYS.stations, SEED_STATIONS);
  }

  async getStationById(id: string): Promise<Station | null> {
    const list = await this.listStations();
    return list.find((s) => s.id === id) ?? null;
  }

  async addCheckIn(
    stationId: string,
    checkIn: Omit<StationCheckIn, 'id' | 'stationId' | 'timestamp'>
  ): Promise<Station> {
    const list = await this.listStations();
    const record: StationCheckIn = {
      ...checkIn,
      id: `chk-${Date.now().toString(36)}`,
      stationId,
      timestamp: new Date().toISOString(),
    };
    const next = list.map((s) =>
      s.id === stationId
        ? { ...s, checkIns: [record, ...s.checkIns] }
        : s
    );
    writeStorage(STORAGE_KEYS.stations, next);
    const updated = next.find((s) => s.id === stationId);
    if (!updated) throw new Error(`Station ${stationId} not found`);
    return updated;
  }

  async updateStationStatus(
    stationId: string,
    status: Station['status']
  ): Promise<Station> {
    const list = await this.listStations();
    const next = list.map((s) => (s.id === stationId ? { ...s, status } : s));
    writeStorage(STORAGE_KEYS.stations, next);
    const updated = next.find((s) => s.id === stationId);
    if (!updated) throw new Error(`Station ${stationId} not found`);
    return updated;
  }
}

export class MockTripRepo implements TripRepo {
  async listTripHistory(vehicleId: string): Promise<TripHistoryRecord[]> {
    const list = readStorage<TripHistoryRecord[]>(
      STORAGE_KEYS.trips,
      SEED_TRIPS
    );
    return list.filter((t) => t.vehicleId === vehicleId);
  }

  async logTrip(
    trip: Omit<TripHistoryRecord, 'id'>
  ): Promise<TripHistoryRecord> {
    const list = readStorage<TripHistoryRecord[]>(
      STORAGE_KEYS.trips,
      SEED_TRIPS
    );
    const created: TripHistoryRecord = {
      ...trip,
      id: `trp-${Date.now().toString(36)}`,
    };
    writeStorage(STORAGE_KEYS.trips, [created, ...list]);
    return created;
  }
}

export class MockClaimRepo implements ClaimRepo {
  async listClaims(vehicleId?: string): Promise<ClaimRecord[]> {
    const list = readStorage<ClaimRecord[]>(STORAGE_KEYS.claims, SEED_CLAIMS);
    return vehicleId ? list.filter((c) => c.vehicleId === vehicleId) : list;
  }

  async createClaim(
    input: Omit<ClaimRecord, 'id' | 'status' | 'timeline'>
  ): Promise<ClaimRecord> {
    const list = readStorage<ClaimRecord[]>(STORAGE_KEYS.claims, SEED_CLAIMS);
    const created: ClaimRecord = {
      ...input,
      id: `clm-${Date.now().toString(36)}`,
      status: 'submitted',
      timeline: [
        {
          stage: 'Claim Submitted',
          timestamp: new Date().toISOString(),
          note: 'Submitted via ChargeSense demo portal; awaiting surveyor assignment.',
        },
      ],
    };
    writeStorage(STORAGE_KEYS.claims, [created, ...list]);
    return created;
  }
}

export class MockServiceCentreRepo implements ServiceCentreRepo {
  async listServiceCentres(): Promise<ServiceCentre[]> {
    return SEED_SERVICE_CENTRES;
  }
}

export class MockPassportRepo implements PassportRepo {
  async getEvents(vehicleId: string): Promise<PassportEvent[]> {
    const store = readStorage<Record<string, PassportEvent[]>>(
      STORAGE_KEYS.passports,
      {}
    );
    if (store[vehicleId] && store[vehicleId].length > 0) {
      return store[vehicleId];
    }
    const seedPayloads = SEED_PASSPORT_PAYLOADS[vehicleId] ?? [
      {
        id: `evt-gen-${vehicleId}`,
        vehicleId,
        type: 'ownership_registered' as const,
        timestamp: new Date().toISOString(),
        odometerKm: 0,
        title: 'EV Passport Genesis',
        summary: 'Vehicle added to ChargeSense Digital Passport ledger.',
        metadata: { source: 'demo_onboarding' },
      },
    ];
    const chain = await buildPassportChain(seedPayloads);
    writeStorage(STORAGE_KEYS.passports, { ...store, [vehicleId]: chain });
    return chain;
  }

  async appendEvent(
    vehicleId: string,
    payload: Omit<PassportEventPayload, 'id' | 'vehicleId'>
  ): Promise<PassportEvent[]> {
    const existing = await this.getEvents(vehicleId);
    const next = await appendPassportEvent(existing, {
      ...payload,
      id: `evt-${Date.now().toString(36)}`,
      vehicleId,
    });
    const store = readStorage<Record<string, PassportEvent[]>>(
      STORAGE_KEYS.passports,
      {}
    );
    writeStorage(STORAGE_KEYS.passports, { ...store, [vehicleId]: next });
    return next;
  }
}

export class MockBatteryHealthRepo implements BatteryHealthRepo {
  async getSnapshots(vehicleId: string): Promise<BatteryHealthSnapshot[]> {
    return (
      SEED_BATTERY_HEALTH[vehicleId] ?? SEED_BATTERY_HEALTH['veh-nexon-lr']
    );
  }
}

export class MockFaqRepo implements FaqRepo {
  async listFaqs(): Promise<FaqEntry[]> {
    return SEED_FAQS;
  }
}

export function resetDemoStorage(): void {
  Object.values(STORAGE_KEYS).forEach((k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      // ignore
    }
  });
}

export const repositories = {
  users: new MockUserRepo(),
  vehicles: new MockVehicleRepo(),
  stations: new MockStationRepo(),
  trips: new MockTripRepo(),
  claims: new MockClaimRepo(),
  serviceCentres: new MockServiceCentreRepo(),
  passports: new MockPassportRepo(),
  batteryHealth: new MockBatteryHealthRepo(),
  faqs: new MockFaqRepo(),
};
