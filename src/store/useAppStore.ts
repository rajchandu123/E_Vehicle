import { create } from 'zustand';
import { repositories } from '../data/mockRepositories';
import { estimateRange } from '../domain/range';
import {
  DriveMode,
  RangeBand,
  RangeInput,
  RecommendationPreset,
  SimulatedVehicleControls,
  Station,
  StationCheckIn,
  UserProfile,
  Vehicle,
} from '../domain/types';
import { TelemetrySimulator } from '../services/orchestrators';

export type ThemeMode = 'dark' | 'light' | 'system';
export type LayoutMode = 'desktop' | 'mobile' | 'car';

export interface ToastMessage {
  id: string;
  title: string;
  detail?: string;
  tone: 'info' | 'success' | 'warning' | 'error';
}

interface AppState {
  initialized: boolean;
  loading: boolean;
  theme: ThemeMode;
  layoutMode: LayoutMode;
  users: UserProfile[];
  activeUser: UserProfile | null;
  vehicles: Vehicle[];
  activeVehicle: Vehicle | null;
  stations: Station[];
  rangeInput: RangeInput;
  rangeBand: RangeBand | null;
  preset: RecommendationPreset;
  controls: SimulatedVehicleControls;
  toasts: ToastMessage[];

  init: () => Promise<void>;
  setTheme: (theme: ThemeMode) => void;
  setLayoutMode: (mode: LayoutMode) => void;
  setActiveUser: (userId: string) => Promise<void>;
  createUserAndSetActive: (
    input: Omit<UserProfile, 'id' | 'createdAt'>
  ) => Promise<UserProfile>;
  setActiveVehicle: (vehicleId: string) => void;
  addVehicleAndSelect: (input: Omit<Vehicle, 'id'>) => Promise<Vehicle>;
  updateRangeInput: (patch: Partial<RangeInput>) => void;
  trigger55PercentDemo: () => void;
  setPreset: (preset: RecommendationPreset) => void;
  updateControl: (patch: Partial<SimulatedVehicleControls>) => void;
  submitStationCheckIn: (
    stationId: string,
    payload: Omit<StationCheckIn, 'id' | 'stationId' | 'timestamp'>
  ) => Promise<void>;
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
}

const DEFAULT_RANGE_INPUT: RangeInput = {
  socPercent: 68,
  avgSpeedKmh: 76,
  acOn: true,
  ambientTempC: 29,
  passengers: 2,
  cargoKg: 20,
  driveMode: 'city',
  safetyBufferPercent: 20,
};

function applyThemeToDocument(theme: ThemeMode): void {
  try {
    localStorage.setItem('chargesense_theme', theme);
    const useDark =
      theme === 'dark' ||
      (theme === 'system' &&
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', useDark);
  } catch {
    // ignore in non-browser tests
  }
}

function readInitialTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem('chargesense_theme');
    if (stored === 'dark' || stored === 'light' || stored === 'system') {
      return stored;
    }
  } catch {
    // ignore
  }
  return 'dark';
}

function readInitialVehicleId(): string | null {
  try {
    return localStorage.getItem('chargesense_active_vehicle_v1');
  } catch {
    return null;
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  initialized: false,
  loading: false,
  theme: readInitialTheme(),
  layoutMode: 'desktop',
  users: [],
  activeUser: null,
  vehicles: [],
  activeVehicle: null,
  stations: [],
  rangeInput: DEFAULT_RANGE_INPUT,
  rangeBand: null,
  preset: 'balanced',
  controls: TelemetrySimulator.createInitialControls(),
  toasts: [],

  init: async () => {
    if (get().initialized || get().loading) return;
    set({ loading: true });
    try {
      const [users, activeUser, vehicles, stations] = await Promise.all([
        repositories.users.listUsers(),
        repositories.users.getActiveUser(),
        repositories.vehicles.listVehicles(),
        repositories.stations.listStations(),
      ]);

      const storedVehId = readInitialVehicleId();
      const activeVehicle =
        vehicles.find((v) => v.id === storedVehId) ?? vehicles[0] ?? null;

      const initialRangeInput: RangeInput = {
        ...DEFAULT_RANGE_INPUT,
        safetyBufferPercent: activeUser?.preferredSafetyBufferPercent ?? 20,
      };
      const rangeBand = activeVehicle
        ? estimateRange(activeVehicle, initialRangeInput)
        : null;

      set({
        initialized: true,
        loading: false,
        users,
        activeUser,
        vehicles,
        activeVehicle,
        stations,
        rangeInput: initialRangeInput,
        rangeBand,
        preset: activeUser?.preferredPreset ?? 'balanced',
      });
    } catch {
      set({ loading: false });
    }
  },

  setTheme: (theme) => {
    applyThemeToDocument(theme);
    set({ theme });
  },

  setLayoutMode: (layoutMode) => set({ layoutMode }),

  setActiveUser: async (userId) => {
    const activeUser = await repositories.users.setActiveUser(userId);
    const rangeInput = {
      ...get().rangeInput,
      safetyBufferPercent: activeUser.preferredSafetyBufferPercent,
    };
    const activeVehicle = get().activeVehicle;
    set({
      activeUser,
      preset: activeUser.preferredPreset,
      rangeInput,
      rangeBand: activeVehicle ? estimateRange(activeVehicle, rangeInput) : null,
    });
    get().addToast({
      title: `Switched profile to ${activeUser.name}`,
      tone: 'info',
    });
  },

  createUserAndSetActive: async (input) => {
    const created = await repositories.users.createUser(input);
    const users = await repositories.users.listUsers();
    const rangeInput = {
      ...get().rangeInput,
      safetyBufferPercent: created.preferredSafetyBufferPercent,
    };
    const activeVehicle = get().activeVehicle;
    set({
      users,
      activeUser: created,
      rangeInput,
      rangeBand: activeVehicle ? estimateRange(activeVehicle, rangeInput) : null,
    });
    get().addToast({
      title: `Profile created for ${created.name}`,
      tone: 'success',
    });
    return created;
  },

  setActiveVehicle: (vehicleId) => {
    const found = get().vehicles.find((v) => v.id === vehicleId) ?? null;
    if (!found) return;
    try {
      localStorage.setItem('chargesense_active_vehicle_v1', found.id);
    } catch {
      // ignore
    }
    const rangeBand = estimateRange(found, get().rangeInput);
    set({ activeVehicle: found, rangeBand });
  },

  addVehicleAndSelect: async (input) => {
    const created = await repositories.vehicles.addVehicle(input);
    const vehicles = await repositories.vehicles.listVehicles();
    try {
      localStorage.setItem('chargesense_active_vehicle_v1', created.id);
    } catch {
      // ignore
    }
    const rangeBand = estimateRange(created, get().rangeInput);
    set({
      vehicles,
      activeVehicle: created,
      rangeBand,
    });
    get().addToast({
      title: `Added ${created.make} ${created.model}`,
      detail: `${created.usableKwh} kWh usable · ${created.connectors.join(', ')}`,
      tone: 'success',
    });
    return created;
  },

  updateRangeInput: (patch) => {
    const nextInput = { ...get().rangeInput, ...patch };
    const vehicle = get().activeVehicle;
    const rangeBand = vehicle ? estimateRange(vehicle, nextInput) : null;
    const controls =
      patch.driveMode !== undefined
        ? TelemetrySimulator.transitionControl(get().controls, {
            driveMode: patch.driveMode as DriveMode,
          })
        : get().controls;
    set({ rangeInput: nextInput, rangeBand, controls });
  },

  trigger55PercentDemo: () => {
    const nextInput: RangeInput = {
      ...get().rangeInput,
      socPercent: 55,
      avgSpeedKmh: 78,
      acOn: true,
      ambientTempC: 30,
      passengers: 2,
      cargoKg: 25,
      driveMode: 'city',
      safetyBufferPercent: 20,
    };
    const vehicle = get().activeVehicle;
    const rangeBand = vehicle ? estimateRange(vehicle, nextInput) : null;
    set({ rangeInput: nextInput, rangeBand });
    get().addToast({
      title: '55% Battery Demo Loaded',
      detail: rangeBand
        ? `Estimated ${rangeBand.minKm}–${rangeBand.maxKm} km reachable (likely ${rangeBand.likelyKm} km)`
        : undefined,
      tone: 'info',
    });
  },

  setPreset: (preset) => set({ preset }),

  updateControl: (patch) => {
    const nextControls = TelemetrySimulator.transitionControl(
      get().controls,
      patch
    );
    set({ controls: nextControls });
    if (patch.driveMode) {
      get().updateRangeInput({ driveMode: patch.driveMode });
    }
  },

  submitStationCheckIn: async (stationId, payload) => {
    await repositories.stations.addCheckIn(stationId, payload);
    const stations = await repositories.stations.listStations();
    set({ stations });
    get().addToast({
      title: 'Station check-in recorded',
      detail: 'Reliability score updated using Bayesian recency weighting.',
      tone: 'success',
    });
  },

  addToast: (toast) => {
    const id = `tst-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 6)}`;
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    setTimeout(() => {
      get().dismissToast(id);
    }, 4200);
  },

  dismissToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));
