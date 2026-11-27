import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { appendPassportEvent } from '../domain/passport';
import {
  BatteryHealthSnapshot,
  ClaimRecord,
  PassportEvent,
  PassportEventPayload,
  RecommendationPreset,
  ServiceBookingRecord,
  Station,
  StationCheckIn,
  TripHistoryRecord,
  UserProfile,
  Vehicle,
} from '../domain/types';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

const DEFAULT_VEHICLE_IMAGE =
  '/src/assets/images/vehicle_studio_profile_1795544359107.jpg';

function toIsoString(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string' && val.length > 0) {
    return val;
  }
  return new Date().toISOString();
}

function makeValidDocId(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replaceAll('-', '').slice(0, 12)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}_${rand}`;
}

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
  return cleaned || makeValidDocId('id');
}

// ---------------- USER PROFILES ----------------

export const firestoreUserRepo = {
  async getProfile(uid: string): Promise<UserProfile | null> {
    const path = `users/${uid}`;
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (!snap.exists()) return null;
      const d = snap.data();
      return {
        id: d.uid ?? uid,
        name: String(d.name ?? 'Driver'),
        email: String(d.email ?? ''),
        city: String(d.city ?? 'Bengaluru'),
        preferredSafetyBufferPercent: Number(d.preferredSafetyBufferPercent ?? 20),
        preferredPreset: (d.preferredPreset as RecommendationPreset) ?? 'balanced',
        units: d.units === 'imperial' ? 'imperial' : 'metric',
        createdAt: toIsoString(d.createdAt),
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  async createProfile(input: {
    uid: string;
    name: string;
    email: string;
    city: string;
    preferredSafetyBufferPercent: number;
    preferredPreset?: RecommendationPreset;
    units?: 'metric' | 'imperial';
  }): Promise<UserProfile> {
    const path = `users/${input.uid}`;
    try {
      const ref = doc(db, 'users', input.uid);
      const payload = {
        uid: input.uid,
        name: input.name.trim().slice(0, 60),
        email: input.email.trim().toLowerCase().slice(0, 120),
        city: input.city.trim().slice(0, 50),
        preferredSafetyBufferPercent: Math.min(
          40,
          Math.max(5, Math.round(input.preferredSafetyBufferPercent))
        ),
        preferredPreset: input.preferredPreset ?? 'balanced',
        units: input.units ?? 'metric',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(ref, payload);
      return {
        id: payload.uid,
        name: payload.name,
        email: payload.email,
        city: payload.city,
        preferredSafetyBufferPercent: payload.preferredSafetyBufferPercent,
        preferredPreset: payload.preferredPreset,
        units: payload.units,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async updateProfile(
    uid: string,
    patch: Partial<{
      name: string;
      city: string;
      preferredSafetyBufferPercent: number;
      preferredPreset: RecommendationPreset;
      units: 'metric' | 'imperial';
    }>
  ): Promise<UserProfile> {
    const path = `users/${uid}`;
    try {
      const ref = doc(db, 'users', uid);
      const updatePayload: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
      };
      if (patch.name !== undefined) {
        updatePayload.name = patch.name.trim().slice(0, 60);
      }
      if (patch.city !== undefined) {
        updatePayload.city = patch.city.trim().slice(0, 50);
      }
      if (patch.preferredSafetyBufferPercent !== undefined) {
        updatePayload.preferredSafetyBufferPercent = Math.min(
          40,
          Math.max(5, Number(patch.preferredSafetyBufferPercent))
        );
      }
      if (patch.preferredPreset !== undefined) {
        updatePayload.preferredPreset = patch.preferredPreset;
      }
      if (patch.units !== undefined) {
        updatePayload.units = patch.units;
      }
      await updateDoc(ref, updatePayload);
      const updated = await this.getProfile(uid);
      if (!updated) throw new Error('Profile not found after update');
      return updated;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },
};

// ---------------- VEHICLES ----------------

export const firestoreVehicleRepo = {
  async listVehicles(uid: string): Promise<Vehicle[]> {
    const path = 'vehicles';
    try {
      const q = query(collection(db, path), where('ownerId', '==', uid));
      const snap = await getDocs(q);
      return snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          make: String(d.make),
          model: String(d.model),
          variant: String(d.variant),
          year: Number(d.year),
          registrationNumber: String(d.registrationNumber),
          usableKwh: Number(d.usableKwh),
          nominalKwh: Number(d.nominalKwh),
          efficiencyWhPerKm: Number(d.efficiencyWhPerKm),
          connectors: Array.isArray(d.connectors) ? d.connectors : ['CCS2'],
          maxDcChargeKw: Number(d.maxDcChargeKw),
          maxAcChargeKw: Number(d.maxAcChargeKw),
          odometerKm: Number(d.odometerKm),
          sohPercent: Number(d.sohPercent),
          cycleCount: Number(d.cycleCount),
          imageUrl: DEFAULT_VEHICLE_IMAGE,
        };
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async addVehicle(uid: string, input: Omit<Vehicle, 'id'>): Promise<Vehicle> {
    const vehicleId = makeValidDocId('veh');
    const path = `vehicles/${vehicleId}`;
    try {
      const docPayload = {
        ownerId: uid,
        make: input.make.trim().slice(0, 40),
        model: input.model.trim().slice(0, 50),
        variant: input.variant.trim().slice(0, 60),
        year: Math.min(2028, Math.max(2015, Math.round(input.year))),
        registrationNumber: input.registrationNumber.trim().toUpperCase().slice(0, 24),
        usableKwh: Math.min(200, Math.max(10, Number(input.usableKwh))),
        nominalKwh: Math.min(220, Math.max(10, Number(input.nominalKwh))),
        efficiencyWhPerKm: Math.min(400, Math.max(80, Number(input.efficiencyWhPerKm))),
        connectors: input.connectors.slice(0, 4),
        maxDcChargeKw: Math.min(400, Math.max(3, Number(input.maxDcChargeKw))),
        maxAcChargeKw: Math.min(44, Math.max(3, Number(input.maxAcChargeKw))),
        odometerKm: Math.max(0, Number(input.odometerKm ?? 0)),
        sohPercent: Math.min(100, Math.max(40, Number(input.sohPercent ?? 100))),
        cycleCount: Math.max(0, Math.round(input.cycleCount ?? 0)),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'vehicles', vehicleId), docPayload);
      return {
        id: vehicleId,
        ...input,
        imageUrl: input.imageUrl ?? DEFAULT_VEHICLE_IMAGE,
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async updateVehicle(
    vehicleId: string,
    patch: Partial<
      Pick<
        Vehicle,
        'odometerKm' | 'sohPercent' | 'cycleCount' | 'efficiencyWhPerKm' | 'usableKwh'
      >
    >
  ): Promise<void> {
    const path = `vehicles/${vehicleId}`;
    try {
      const updatePayload: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
      };
      if (patch.odometerKm !== undefined) updatePayload.odometerKm = Number(patch.odometerKm);
      if (patch.sohPercent !== undefined) updatePayload.sohPercent = Number(patch.sohPercent);
      if (patch.cycleCount !== undefined) updatePayload.cycleCount = Math.round(patch.cycleCount);
      if (patch.efficiencyWhPerKm !== undefined) {
        updatePayload.efficiencyWhPerKm = Number(patch.efficiencyWhPerKm);
      }
      if (patch.usableKwh !== undefined) updatePayload.usableKwh = Number(patch.usableKwh);
      await updateDoc(doc(db, 'vehicles', vehicleId), updatePayload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteVehicle(vehicleId: string): Promise<void> {
    const path = `vehicles/${vehicleId}`;
    try {
      await deleteDoc(doc(db, 'vehicles', vehicleId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
};

// ---------------- STATIONS & CHECK-INS ----------------

function stationToFirestorePayload(station: Station) {
  return {
    name: station.name.slice(0, 140),
    operator: station.operator.slice(0, 80),
    corridorSegment: station.corridorSegment.slice(0, 40),
    kmFromBengaluru: Math.min(500, Math.max(0, Number(station.kmFromBengaluru))),
    address: station.address.slice(0, 240),
    lat: Number(station.location.lat),
    lng: Number(station.location.lng),
    status: station.status,
    connectors: station.connectors.slice(0, 6),
    pricePerKwhInr: Math.min(100, Math.max(0, Number(station.pricePerKwhInr))),
    amenities: station.amenities.slice(0, 10),
    open24x7: Boolean(station.open24x7),
    historicalSuccessCount: Math.max(0, Math.round(station.historicalSuccessCount)),
    historicalFailureCount: Math.max(0, Math.round(station.historicalFailureCount)),
    downtimeHoursLast30d: Math.max(0, Number(station.downtimeHoursLast30d)),
    source: station.source === 'community_verified' ? 'community_verified' : 'osm_overpass',
    installedAt: station.installedAt,
    updatedAt: serverTimestamp(),
  };
}

export const firestoreStationRepo = {
  async listStoredStations(): Promise<Station[]> {
    const path = 'stations';
    try {
      const snap = await getDocs(collection(db, path));
      const stations: Station[] = [];
      for (const docSnap of snap.docs) {
        const d = docSnap.data();
        const checkInSnap = await getDocs(
          query(
            collection(db, `stations/${docSnap.id}/checkIns`),
            orderBy('createdAt', 'desc')
          )
        ).catch(() => null);

        const checkIns: StationCheckIn[] = checkInSnap
          ? checkInSnap.docs.map((c) => {
              const cd = c.data();
              return {
                id: c.id,
                stationId: docSnap.id,
                userId: String(cd.userId),
                userName: String(cd.userName),
                outcome: cd.outcome === 'not_working' ? 'not_working' : 'worked',
                issueType: cd.issueType ?? 'none',
                comment: String(cd.comment ?? ''),
                timestamp: toIsoString(cd.createdAt),
              };
            })
          : [];

        stations.push({
          id: docSnap.id,
          name: String(d.name),
          operator: String(d.operator),
          corridorSegment: d.corridorSegment,
          kmFromBengaluru: Number(d.kmFromBengaluru ?? 0),
          address: String(d.address ?? ''),
          location: { lat: Number(d.lat), lng: Number(d.lng) },
          status: d.status ?? 'online',
          connectors: Array.isArray(d.connectors) ? d.connectors : [],
          pricePerKwhInr: Number(d.pricePerKwhInr ?? 16),
          amenities: Array.isArray(d.amenities) ? d.amenities : [],
          open24x7: Boolean(d.open24x7),
          historicalSuccessCount: Number(d.historicalSuccessCount ?? 0),
          historicalFailureCount: Number(d.historicalFailureCount ?? 0),
          downtimeHoursLast30d: Number(d.downtimeHoursLast30d ?? 0),
          checkIns,
          installedAt: String(d.installedAt ?? '2025-01-01'),
          source: d.source ?? 'osm_overpass',
          isDemoData: false,
        });
      }
      return stations;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async syncLiveStationsIfMissing(
    liveStations: Station[],
    existingIds: Set<string>,
    canWrite: boolean
  ): Promise<void> {
    if (!canWrite) return;
    const toCreate = liveStations.filter((s) => !existingIds.has(s.id)).slice(0, 40);
    if (toCreate.length === 0) return;
    const path = 'stations';
    try {
      const batch = writeBatch(db);
      for (const s of toCreate) {
        const cleanId = sanitizeId(s.id);
        batch.set(doc(db, 'stations', cleanId), stationToFirestorePayload(s));
      }
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async addCheckIn(
    station: Station,
    userId: string,
    userName: string,
    payload: Omit<StationCheckIn, 'id' | 'stationId' | 'timestamp' | 'userId' | 'userName'>
  ): Promise<void> {
    const cleanStationId = sanitizeId(station.id);
    const stationPath = `stations/${cleanStationId}`;
    try {
      const stRef = doc(db, 'stations', cleanStationId);
      const stSnap = await getDoc(stRef);
      if (!stSnap.exists()) {
        await setDoc(stRef, stationToFirestorePayload(station));
      }
      const checkInId = makeValidDocId('chk');
      const checkInPath = `stations/${cleanStationId}/checkIns/${checkInId}`;
      await setDoc(doc(db, checkInPath), {
        stationId: cleanStationId,
        userId,
        userName: userName.trim().slice(0, 60) || 'Driver',
        outcome: payload.outcome,
        issueType: payload.issueType,
        comment: payload.comment.trim().slice(0, 240),
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, stationPath);
    }
  },

  async updateStationAdmin(
    stationId: string,
    patch: Partial<Pick<Station, 'status' | 'pricePerKwhInr' | 'downtimeHoursLast30d'>>
  ): Promise<void> {
    const cleanId = sanitizeId(stationId);
    const path = `stations/${cleanId}`;
    try {
      const updatePayload: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
      };
      if (patch.status !== undefined) updatePayload.status = patch.status;
      if (patch.pricePerKwhInr !== undefined) {
        updatePayload.pricePerKwhInr = Number(patch.pricePerKwhInr);
      }
      if (patch.downtimeHoursLast30d !== undefined) {
        updatePayload.downtimeHoursLast30d = Number(patch.downtimeHoursLast30d);
      }
      await updateDoc(doc(db, 'stations', cleanId), updatePayload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },
};

// ---------------- TRIPS ----------------

export const firestoreTripRepo = {
  async listTrips(uid: string, vehicleId?: string): Promise<TripHistoryRecord[]> {
    const path = 'trips';
    try {
      const q = query(collection(db, path), where('ownerId', '==', uid));
      const snap = await getDocs(q);
      const rows = snap.docs
        .map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            vehicleId: String(d.vehicleId),
            date: String(d.date),
            origin: String(d.origin),
            destination: String(d.destination),
            distanceKm: Number(d.distanceKm),
            energyUsedKwh: Number(d.energyUsedKwh),
            costInr: Number(d.costInr),
            avgEfficiencyWhKm: Number(d.avgEfficiencyWhKm),
            ecoScore: Number(d.ecoScore),
          };
        })
        .filter((r) => !vehicleId || r.vehicleId === vehicleId)
        .sort((a, b) => b.date.localeCompare(a.date));
      return rows;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async logTrip(
    uid: string,
    input: Omit<TripHistoryRecord, 'id'>
  ): Promise<TripHistoryRecord> {
    const tripId = makeValidDocId('trp');
    const path = `trips/${tripId}`;
    try {
      await setDoc(doc(db, 'trips', tripId), {
        ownerId: uid,
        vehicleId: sanitizeId(input.vehicleId),
        date: input.date.slice(0, 24),
        origin: input.origin.trim().slice(0, 100),
        destination: input.destination.trim().slice(0, 100),
        distanceKm: Number(input.distanceKm),
        energyUsedKwh: Number(input.energyUsedKwh),
        costInr: Number(input.costInr),
        avgEfficiencyWhKm: Number(input.avgEfficiencyWhKm),
        ecoScore: Math.min(100, Math.max(0, Math.round(input.ecoScore))),
        createdAt: serverTimestamp(),
      });
      return { id: tripId, ...input };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async deleteTrip(tripId: string): Promise<void> {
    const path = `trips/${tripId}`;
    try {
      await deleteDoc(doc(db, 'trips', tripId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
};

// ---------------- SERVICE BOOKINGS ----------------

export const firestoreServiceBookingRepo = {
  async listBookings(uid: string): Promise<ServiceBookingRecord[]> {
    const path = 'serviceBookings';
    try {
      const q = query(collection(db, path), where('ownerId', '==', uid));
      const snap = await getDocs(q);
      return snap.docs
        .map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            ownerId: String(d.ownerId),
            vehicleId: String(d.vehicleId),
            centreId: String(d.centreId),
            centreName: String(d.centreName),
            serviceType: String(d.serviceType),
            preferredDate: String(d.preferredDate),
            notes: String(d.notes ?? ''),
            isEmergency: Boolean(d.isEmergency),
            status: d.status,
            createdAt: toIsoString(d.createdAt),
          };
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async createBooking(
    uid: string,
    input: {
      vehicleId: string;
      centreId: string;
      centreName: string;
      serviceType: string;
      preferredDate: string;
      notes: string;
      isEmergency: boolean;
    }
  ): Promise<ServiceBookingRecord> {
    const bookingId = makeValidDocId('bkg');
    const path = `serviceBookings/${bookingId}`;
    try {
      const cleanCentreId = sanitizeId(input.centreId);
      const cleanVehicleId = sanitizeId(input.vehicleId);
      await setDoc(doc(db, 'serviceBookings', bookingId), {
        ownerId: uid,
        vehicleId: cleanVehicleId,
        centreId: cleanCentreId,
        centreName: input.centreName.trim().slice(0, 140),
        serviceType: input.serviceType.trim().slice(0, 100),
        preferredDate: input.preferredDate.trim().slice(0, 32),
        notes: input.notes.trim().slice(0, 400),
        isEmergency: Boolean(input.isEmergency),
        status: 'requested',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return {
        id: bookingId,
        ownerId: uid,
        vehicleId: cleanVehicleId,
        centreId: cleanCentreId,
        centreName: input.centreName.trim().slice(0, 140),
        serviceType: input.serviceType.trim().slice(0, 100),
        preferredDate: input.preferredDate.trim().slice(0, 32),
        notes: input.notes.trim().slice(0, 400),
        isEmergency: Boolean(input.isEmergency),
        status: 'requested',
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async cancelBooking(bookingId: string): Promise<void> {
    const path = `serviceBookings/${bookingId}`;
    try {
      await updateDoc(doc(db, 'serviceBookings', bookingId), {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },
};

// ---------------- INSURANCE CLAIMS ----------------

export const firestoreClaimRepo = {
  async listClaims(uid: string, vehicleId?: string): Promise<ClaimRecord[]> {
    const path = 'claims';
    try {
      const q = query(collection(db, path), where('ownerId', '==', uid));
      const snap = await getDocs(q);
      return snap.docs
        .map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            vehicleId: String(d.vehicleId),
            policyNumber: String(d.policyNumber),
            insurerName: String(d.insurerName),
            incidentType: d.incidentType,
            incidentDate: String(d.incidentDate),
            description: String(d.description),
            estimatedAmountInr: Number(d.estimatedAmountInr),
            documents: Array.isArray(d.documents) ? d.documents : [],
            status: d.status,
            timeline: Array.isArray(d.timeline) ? d.timeline : [],
          };
        })
        .filter((c) => !vehicleId || c.vehicleId === vehicleId)
        .sort((a, b) => b.incidentDate.localeCompare(a.incidentDate));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async createClaim(
    uid: string,
    input: Omit<ClaimRecord, 'id' | 'status' | 'timeline'>
  ): Promise<ClaimRecord> {
    const claimId = makeValidDocId('clm');
    const path = `claims/${claimId}`;
    const nowIso = new Date().toISOString();
    const timeline = [
      {
        stage: 'Claim Submitted',
        timestamp: nowIso,
        note: 'First Notice of Loss submitted to Cloud Firestore ledger.',
      },
    ];
    try {
      await setDoc(doc(db, 'claims', claimId), {
        ownerId: uid,
        vehicleId: sanitizeId(input.vehicleId),
        policyNumber: input.policyNumber.trim().slice(0, 40),
        insurerName: input.insurerName.trim().slice(0, 80),
        incidentType: input.incidentType,
        incidentDate: input.incidentDate.slice(0, 24),
        description: input.description.trim().slice(0, 600),
        estimatedAmountInr: Number(input.estimatedAmountInr),
        documents: input.documents.slice(0, 10),
        status: 'submitted',
        timeline,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return {
        id: claimId,
        ...input,
        status: 'submitted',
        timeline,
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },
};

// ---------------- EV DIGITAL PASSPORT ----------------

export const firestorePassportRepo = {
  async getEvents(uid: string, vehicleId: string): Promise<PassportEvent[]> {
    const path = 'passportEvents';
    try {
      const q = query(collection(db, path), where('ownerId', '==', uid));
      const snap = await getDocs(q);
      return snap.docs
        .map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            vehicleId: String(d.vehicleId),
            type: d.type,
            timestamp: String(d.timestamp),
            odometerKm: Number(d.odometerKm),
            title: String(d.title),
            summary: String(d.summary),
            metadata: (d.metadata as Record<string, string | number | boolean>) ?? {},
            prevHash: String(d.prevHash),
            hash: String(d.hash),
          };
        })
        .filter((e) => e.vehicleId === vehicleId)
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async appendEvent(
    uid: string,
    vehicleId: string,
    payload: Omit<PassportEventPayload, 'id' | 'vehicleId'>
  ): Promise<PassportEvent[]> {
    const existing = await this.getEvents(uid, vehicleId);
    const eventId = makeValidDocId('evt');
    const extended = await appendPassportEvent(existing, {
      ...payload,
      id: eventId,
      vehicleId,
      title: payload.title.trim().slice(0, 120),
      summary: payload.summary.trim().slice(0, 400),
    });
    const newest = extended[extended.length - 1];
    const path = `passportEvents/${eventId}`;
    try {
      await setDoc(doc(db, 'passportEvents', eventId), {
        ownerId: uid,
        vehicleId: sanitizeId(vehicleId),
        type: newest.type,
        timestamp: newest.timestamp,
        odometerKm: Number(newest.odometerKm),
        title: newest.title,
        summary: newest.summary,
        metadata: newest.metadata,
        prevHash: newest.prevHash,
        hash: newest.hash,
        createdAt: serverTimestamp(),
      });
      return extended;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },
};

// ---------------- BATTERY HEALTH SNAPSHOTS ----------------

export const firestoreBatteryRepo = {
  async getSnapshots(
    uid: string,
    vehicleId: string
  ): Promise<BatteryHealthSnapshot[]> {
    const path = 'batterySnapshots';
    try {
      const q = query(collection(db, path), where('ownerId', '==', uid));
      const snap = await getDocs(q);
      return snap.docs
        .map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            vehicleId: String(d.vehicleId),
            month: String(d.month),
            sohPercent: Number(d.sohPercent),
            dcFastChargeRatio: Number(d.dcFastChargeRatio),
            avgTempC: Number(d.avgTempC),
            cycles: Number(d.cycles),
            createdIso: toIsoString(d.createdAt),
          };
        })
        .filter((s) => s.vehicleId === vehicleId)
        .sort((a, b) => a.createdIso.localeCompare(b.createdIso))
        .map(({ createdIso: _ignored, vehicleId: _vid, ...rest }) => rest);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async addSnapshot(
    uid: string,
    vehicleId: string,
    input: Omit<BatteryHealthSnapshot, 'id'>
  ): Promise<BatteryHealthSnapshot> {
    const snapshotId = makeValidDocId('bat');
    const path = `batterySnapshots/${snapshotId}`;
    try {
      await setDoc(doc(db, 'batterySnapshots', snapshotId), {
        ownerId: uid,
        vehicleId: sanitizeId(vehicleId),
        month: input.month.trim().slice(0, 20),
        sohPercent: Math.min(100, Math.max(40, Number(input.sohPercent))),
        dcFastChargeRatio: Math.min(100, Math.max(0, Number(input.dcFastChargeRatio))),
        avgTempC: Math.min(65, Math.max(-10, Number(input.avgTempC))),
        cycles: Math.max(0, Math.round(input.cycles)),
        createdAt: serverTimestamp(),
      });
      return { id: snapshotId, ...input };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },
};
