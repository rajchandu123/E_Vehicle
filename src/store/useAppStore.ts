import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { create } from 'zustand';
import {
  firestoreStationRepo,
  firestoreUserRepo,
  firestoreVehicleRepo,
} from '../data/firestoreRepositories';
import { estimateRange } from '../domain/range';
import {
  DriveMode,
  RangeBand,
  RangeInput,
  RecommendationPreset,
  ServiceCentre,
  SimulatedVehicleControls,
  Station,
  StationCheckIn,
  UserProfile,
  Vehicle,
} from '../domain/types';
import { auth, googleProvider } from '../lib/firebase';
import { liveApi, LiveWeather } from '../services/liveApi';
import { TelemetrySimulator } from '../services/orchestrators';

export type ThemeMode = 'dark' | 'light' | 'system';
export type LayoutMode = 'desktop' | 'mobile' | 'car';

export interface ToastMessage {
  id: string;
  title: string;
  detail?: string;
  tone: 'info' | 'success' | 'warning' | 'error';
}

export interface RegisterPayload {
  name: string;
  email: string;
  city: string;
  preferredSafetyBufferPercent: number;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ProfilePatchPayload {
  name?: string;
  city?: string;
  preferredSafetyBufferPercent?: number;
  preferredPreset?: RecommendationPreset;
  units?: 'metric' | 'imperial';
}

const ADMIN_EMAIL = 'rajchandu1gs@gmail.com';
const PENDING_PROFILE_KEY = 'chargesense_pending_profile_v1';

interface AppState {
  initialized: boolean;
  loading: boolean;
  authChecked: boolean;
  isAuthenticated: boolean;
  needsEmailVerification: boolean;
  isAdmin: boolean;
  firebaseUser: FirebaseUser | null;
  theme: ThemeMode;
  layoutMode: LayoutMode;
  activeUser: UserProfile | null;
  vehicles: Vehicle[];
  activeVehicle: Vehicle | null;
  stations: Station[];
  stationsFetchedAt: string | null;
  stationsError: string | null;
  serviceCentres: ServiceCentre[];
  weather: LiveWeather | null;
  rangeInput: RangeInput;
  rangeBand: RangeBand | null;
  preset: RecommendationPreset;
  controls: SimulatedVehicleControls;
  toasts: ToastMessage[];

  init: () => Promise<void>;
  refreshLiveStations: (force?: boolean) => Promise<void>;
  refreshLiveServiceCentres: (force?: boolean) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  registerAccount: (payload: RegisterPayload) => Promise<{ email: string }>;
  loginAccount: (payload: LoginPayload) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshVerificationStatus: () => Promise<boolean>;
  logoutAccount: () => Promise<void>;
  updateSignedInProfile: (patch: ProfilePatchPayload) => Promise<UserProfile>;
  setTheme: (theme: ThemeMode) => void;
  setLayoutMode: (mode: LayoutMode) => void;
  setActiveVehicle: (vehicleId: string) => void;
  addVehicleAndSelect: (input: Omit<Vehicle, 'id'>) => Promise<Vehicle>;
  updateVehicleSpecs: (
    vehicleId: string,
    patch: Partial<Pick<Vehicle, 'odometerKm' | 'sohPercent' | 'cycleCount' | 'efficiencyWhPerKm' | 'usableKwh'>>
  ) => Promise<void>;
  removeVehicle: (vehicleId: string) => Promise<void>;
  updateRangeInput: (patch: Partial<RangeInput>) => void;
  trigger55PercentDemo: () => void;
  setPreset: (preset: RecommendationPreset) => void;
  updateControl: (patch: Partial<SimulatedVehicleControls>) => void;
  submitStationCheckIn: (
    stationId: string,
    payload: Omit<StationCheckIn, 'id' | 'stationId' | 'timestamp'>
  ) => Promise<Station>;
  updateStationAdmin: (
    stationId: string,
    patch: Partial<Pick<Station, 'status' | 'pricePerKwhInr' | 'downtimeHoursLast30d'>>
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

function mergeStations(liveList: Station[], storedList: Station[]): Station[] {
  const storedMap = new Map(storedList.map((s) => [s.id, s]));
  const merged: Station[] = [];

  for (const live of liveList) {
    const stored = storedMap.get(live.id);
    if (stored) {
      merged.push({
        ...live,
        status: stored.status,
        pricePerKwhInr: stored.pricePerKwhInr,
        downtimeHoursLast30d: stored.downtimeHoursLast30d,
        historicalSuccessCount: stored.historicalSuccessCount,
        historicalFailureCount: stored.historicalFailureCount,
        checkIns: stored.checkIns,
      });
      storedMap.delete(live.id);
    } else {
      merged.push(live);
    }
  }

  for (const leftover of storedMap.values()) {
    merged.push(leftover);
  }

  return merged.sort((a, b) => a.kmFromBengaluru - b.kmFromBengaluru);
}

function formatFirebaseAuthError(err: unknown): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code: unknown }).code)
      : '';
  switch (code) {
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not enabled in Firebase Console yet. Use "Continue with Google" below, or enable Email/Password under Firebase Console → Authentication → Sign-in method.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Switch to Sign In.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters (8+ recommended).';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in popup was closed before finishing.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a minute and try again.';
    default:
      return err instanceof Error ? err.message : 'Authentication request failed.';
  }
}

let authUnsubscribe: (() => void) | null = null;

export const useAppStore = create<AppState>((set, get) => ({
  initialized: false,
  loading: false,
  authChecked: false,
  isAuthenticated: false,
  needsEmailVerification: false,
  isAdmin: false,
  firebaseUser: null,
  theme: readInitialTheme(),
  layoutMode: 'desktop',
  activeUser: null,
  vehicles: [],
  activeVehicle: null,
  stations: [],
  stationsFetchedAt: null,
  stationsError: null,
  serviceCentres: [],
  weather: null,
  rangeInput: DEFAULT_RANGE_INPUT,
  rangeBand: null,
  preset: 'balanced',
  controls: TelemetrySimulator.createInitialControls(),
  toasts: [],

  init: async () => {
    if (get().initialized || authUnsubscribe) return;
    set({ initialized: true, loading: true });

    // Fetch live Open-Meteo ambient weather immediately
    liveApi
      .fetchWeather()
      .then((weather) => {
        const nextInput = {
          ...get().rangeInput,
          ambientTempC: weather.temperatureC,
        };
        const activeVehicle = get().activeVehicle;
        set({
          weather,
          rangeInput: nextInput,
          rangeBand: activeVehicle ? estimateRange(activeVehicle, nextInput) : null,
        });
      })
      .catch(() => {
        // Weather stays null if offline; default temp remains until user adjusts
      });

    authUnsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        set({
          loading: false,
          authChecked: true,
          isAuthenticated: false,
          needsEmailVerification: false,
          isAdmin: false,
          firebaseUser: null,
          activeUser: null,
          vehicles: [],
          activeVehicle: null,
          rangeBand: null,
        });
        return;
      }

      if (!fbUser.emailVerified) {
        set({
          loading: false,
          authChecked: true,
          isAuthenticated: false,
          needsEmailVerification: true,
          isAdmin: false,
          firebaseUser: fbUser,
          activeUser: null,
        });
        return;
      }

      set({ loading: true, firebaseUser: fbUser, needsEmailVerification: false });
      try {
        let profile = await firestoreUserRepo.getProfile(fbUser.uid);
        if (!profile) {
          let pending: {
            name?: string;
            city?: string;
            preferredSafetyBufferPercent?: number;
          } = {};
          try {
            const raw = sessionStorage.getItem(PENDING_PROFILE_KEY);
            if (raw) {
              pending = JSON.parse(raw);
              sessionStorage.removeItem(PENDING_PROFILE_KEY);
            }
          } catch {
            // ignore
          }
          profile = await firestoreUserRepo.createProfile({
            uid: fbUser.uid,
            name: pending.name || fbUser.displayName || 'EV Driver',
            email: fbUser.email || 'driver@chargesense.app',
            city: pending.city || 'Bengaluru',
            preferredSafetyBufferPercent: pending.preferredSafetyBufferPercent ?? 20,
          });
        }

        const [vehicles, storedStations, liveResult] = await Promise.all([
          firestoreVehicleRepo.listVehicles(fbUser.uid),
          firestoreStationRepo.listStoredStations().catch(() => [] as Station[]),
          liveApi
            .fetchLiveStations()
            .then((res) => ({ ok: true as const, ...res }))
            .catch((err) => ({
              ok: false as const,
              error: err instanceof Error ? err.message : 'Overpass unavailable',
            })),
        ]);

        const storedIds = new Set(storedStations.map((s) => s.id));
        let mergedStations: Station[] = storedStations;
        let stationsFetchedAt: string | null = null;
        let stationsError: string | null = null;

        if (liveResult.ok) {
          mergedStations = mergeStations(liveResult.stations, storedStations);
          stationsFetchedAt = liveResult.fetchedAt;
          void firestoreStationRepo
            .syncLiveStationsIfMissing(liveResult.stations, storedIds, true)
            .catch(() => {
              // Non-fatal background sync
            });
        } else {
          stationsError = liveResult.error;
        }

        const storedVehId = readInitialVehicleId();
        const activeVehicle =
          vehicles.find((v) => v.id === storedVehId) ?? vehicles[0] ?? null;

        const nextInput: RangeInput = {
          ...get().rangeInput,
          safetyBufferPercent: profile.preferredSafetyBufferPercent,
        };

        const isAdmin =
          (fbUser.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase();

        set({
          loading: false,
          authChecked: true,
          isAuthenticated: true,
          needsEmailVerification: false,
          isAdmin,
          activeUser: profile,
          vehicles,
          activeVehicle,
          stations: mergedStations,
          stationsFetchedAt,
          stationsError,
          rangeInput: nextInput,
          rangeBand: activeVehicle ? estimateRange(activeVehicle, nextInput) : null,
          preset: profile.preferredPreset,
        });
      } catch (err) {
        set({
          loading: false,
          authChecked: true,
          isAuthenticated: false,
          stationsError:
            err instanceof Error ? err.message : 'Failed to load profile data.',
        });
      }
    });
  },

  refreshLiveStations: async (force = false) => {
    set({ stationsError: null });
    try {
      const [liveRes, storedStations] = await Promise.all([
        liveApi.fetchLiveStations(force),
        get().isAuthenticated
          ? firestoreStationRepo.listStoredStations().catch(() => [] as Station[])
          : Promise.resolve([] as Station[]),
      ]);
      const storedIds = new Set(storedStations.map((s) => s.id));
      const merged = mergeStations(liveRes.stations, storedStations);
      set({
        stations: merged,
        stationsFetchedAt: liveRes.fetchedAt,
        stationsError: null,
      });
      if (get().isAuthenticated) {
        void firestoreStationRepo
          .syncLiveStationsIfMissing(liveRes.stations, storedIds, true)
          .catch(() => {});
      }
    } catch (err) {
      set({
        stationsError:
          err instanceof Error ? err.message : 'Failed to refresh OpenStreetMap stations.',
      });
    }
  },

  refreshLiveServiceCentres: async (force = false) => {
    const res = await liveApi.fetchLiveServiceCentres(force);
    set({ serviceCentres: res.centres });
  },

  loginWithGoogle: async () => {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      get().addToast({
        title: `Signed in as ${cred.user.displayName || cred.user.email}`,
        detail: 'Cloud Firestore workspace active.',
        tone: 'success',
      });
    } catch (err) {
      throw new Error(formatFirebaseAuthError(err));
    }
  },

  registerAccount: async (payload) => {
    try {
      try {
        sessionStorage.setItem(
          PENDING_PROFILE_KEY,
          JSON.stringify({
            name: payload.name,
            city: payload.city,
            preferredSafetyBufferPercent: payload.preferredSafetyBufferPercent,
          })
        );
      } catch {
        // ignore
      }
      const cred = await createUserWithEmailAndPassword(
        auth,
        payload.email.trim().toLowerCase(),
        payload.password
      );
      await updateProfile(cred.user, { displayName: payload.name.trim() });
      await sendEmailVerification(cred.user);
      get().addToast({
        title: 'Verification email sent',
        detail: `Check ${cred.user.email} to verify your account before signing in.`,
        tone: 'info',
      });
      return { email: cred.user.email || payload.email };
    } catch (err) {
      throw new Error(formatFirebaseAuthError(err));
    }
  },

  loginAccount: async (payload) => {
    try {
      const cred = await signInWithEmailAndPassword(
        auth,
        payload.email.trim().toLowerCase(),
        payload.password
      );
      if (!cred.user.emailVerified) {
        set({ needsEmailVerification: true, firebaseUser: cred.user });
        throw new Error(
          'Please verify your email address from the link in your inbox, then click "Check Verification Status".'
        );
      }
    } catch (err) {
      throw new Error(formatFirebaseAuthError(err));
    }
  },

  resendVerificationEmail: async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('No active user to verify.');
    await sendEmailVerification(user);
    get().addToast({
      title: 'Verification email re-sent',
      detail: `Sent to ${user.email}`,
      tone: 'info',
    });
  },

  refreshVerificationStatus: async () => {
    const user = auth.currentUser;
    if (!user) return false;
    await user.reload();
    if (user.emailVerified) {
      // Force auth listener flow by updating token
      await user.getIdToken(true);
      set({ needsEmailVerification: false });
      window.location.reload();
      return true;
    }
    return false;
  },

  logoutAccount: async () => {
    await signOut(auth);
    set({
      isAuthenticated: false,
      needsEmailVerification: false,
      isAdmin: false,
      firebaseUser: null,
      activeUser: null,
      vehicles: [],
      activeVehicle: null,
      layoutMode: 'desktop',
    });
    get().addToast({
      title: 'Signed out',
      detail: 'Your Firebase session has ended.',
      tone: 'info',
    });
  },

  updateSignedInProfile: async (patch) => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Not signed in.');
    const updated = await firestoreUserRepo.updateProfile(uid, patch);
    const rangeInput: RangeInput = {
      ...get().rangeInput,
      safetyBufferPercent: updated.preferredSafetyBufferPercent,
    };
    const activeVehicle = get().activeVehicle;
    set({
      activeUser: updated,
      preset: updated.preferredPreset,
      rangeInput,
      rangeBand: activeVehicle ? estimateRange(activeVehicle, rangeInput) : null,
    });
    get().addToast({
      title: 'Profile saved to Cloud Firestore',
      detail: `${updated.name} · ${updated.city}`,
      tone: 'success',
    });
    return updated;
  },

  setTheme: (theme) => {
    applyThemeToDocument(theme);
    set({ theme });
  },

  setLayoutMode: (layoutMode) => set({ layoutMode }),

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
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Sign in required to save vehicle.');
    const created = await firestoreVehicleRepo.addVehicle(uid, input);
    const vehicles = await firestoreVehicleRepo.listVehicles(uid);
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
      title: `Saved ${created.make} ${created.model}`,
      detail: `${created.usableKwh} kWh usable · ${created.connectors.join(', ')}`,
      tone: 'success',
    });
    return created;
  },

  updateVehicleSpecs: async (vehicleId, patch) => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Sign in required.');
    await firestoreVehicleRepo.updateVehicle(vehicleId, patch);
    const vehicles = await firestoreVehicleRepo.listVehicles(uid);
    const activeVehicle =
      vehicles.find((v) => v.id === get().activeVehicle?.id) ?? vehicles[0] ?? null;
    set({
      vehicles,
      activeVehicle,
      rangeBand: activeVehicle ? estimateRange(activeVehicle, get().rangeInput) : null,
    });
  },

  removeVehicle: async (vehicleId) => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Sign in required.');
    await firestoreVehicleRepo.deleteVehicle(vehicleId);
    const vehicles = await firestoreVehicleRepo.listVehicles(uid);
    const activeVehicle = vehicles[0] ?? null;
    set({
      vehicles,
      activeVehicle,
      rangeBand: activeVehicle ? estimateRange(activeVehicle, get().rangeInput) : null,
    });
    get().addToast({
      title: 'Vehicle removed',
      tone: 'info',
    });
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
      ambientTempC: get().weather?.temperatureC ?? 30,
      passengers: 2,
      cargoKg: 25,
      driveMode: 'city',
      safetyBufferPercent: 20,
    };
    const vehicle = get().activeVehicle;
    const rangeBand = vehicle ? estimateRange(vehicle, nextInput) : null;
    set({ rangeInput: nextInput, rangeBand });
    get().addToast({
      title: '55% Battery Scenario Applied',
      detail: rangeBand
        ? `Estimated ${rangeBand.minKm}–${rangeBand.maxKm} km reachable (likely ${rangeBand.likelyKm} km)`
        : 'Add a vehicle in Profile & EV to compute range.',
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
    const uid = auth.currentUser?.uid;
    const user = get().activeUser;
    const station = get().stations.find((s) => s.id === stationId);
    if (!uid || !user || !station) {
      throw new Error('Must be signed in with a valid station.');
    }
    await firestoreStationRepo.addCheckIn(station, uid, user.name, {
      outcome: payload.outcome,
      issueType: payload.issueType,
      comment: payload.comment,
    });
    const storedStations = await firestoreStationRepo.listStoredStations();
    const merged = mergeStations(get().stations, storedStations);
    set({ stations: merged });
    const updated = merged.find((s) => s.id === stationId) ?? station;
    get().addToast({
      title: `Check-in saved for ${updated.name}`,
      detail: 'Persisted in Cloud Firestore; Bayesian reliability updated.',
      tone: payload.outcome === 'worked' ? 'success' : 'warning',
    });
    return updated;
  },

  updateStationAdmin: async (stationId, patch) => {
    await firestoreStationRepo.updateStationAdmin(stationId, patch);
    const storedStations = await firestoreStationRepo.listStoredStations();
    const merged = mergeStations(get().stations, storedStations);
    set({ stations: merged });
    get().addToast({
      title: 'Station status updated in Firestore',
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
