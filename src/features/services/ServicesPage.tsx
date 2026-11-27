import {
  AlertOctagon,
  CalendarCheck,
  MapPin,
  Phone,
  RefreshCw,
  Wrench,
  XCircle,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DemoLabel } from '../../components/DemoBadge';
import { M3Switch } from '../../components/M3Switch';
import { RippleButton } from '../../components/RippleButton';
import { TonalCard } from '../../components/TonalCard';
import { firestoreServiceBookingRepo } from '../../data/firestoreRepositories';
import { ServiceBookingRecord, ServiceCentre } from '../../domain/types';
import { auth } from '../../lib/firebase';
import { useAppStore } from '../../store/useAppStore';

export function ServicesPage() {
  const navigate = useNavigate();
  const {
    activeVehicle,
    serviceCentres,
    refreshLiveServiceCentres,
    addToast,
  } = useAppStore();

  const [loadingCentres, setLoadingCentres] = useState(false);
  const [centresError, setCentresError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<ServiceBookingRecord[]>([]);
  const [selectedCentre, setSelectedCentre] = useState<ServiceCentre | null>(null);

  const [serviceType, setServiceType] = useState('HV Battery SoH & Coolant Inspection');
  const [preferredDate, setPreferredDate] = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState('');
  const [isEmergency, setIsEmergency] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadCentres = async (force = false) => {
    setLoadingCentres(true);
    setCentresError(null);
    try {
      await refreshLiveServiceCentres(force);
    } catch (err) {
      setCentresError(
        err instanceof Error ? err.message : 'Unable to fetch OSM workshops.'
      );
    } finally {
      setLoadingCentres(false);
    }
  };

  useEffect(() => {
    if (serviceCentres.length === 0) {
      void loadCentres(false);
    }
    const uid = auth.currentUser?.uid;
    if (uid) {
      void firestoreServiceBookingRepo.listBookings(uid).then(setBookings);
    }
  }, []);

  useEffect(() => {
    if (!selectedCentre && serviceCentres.length > 0) {
      setSelectedCentre(serviceCentres[0]);
    }
  }, [serviceCentres, selectedCentre]);

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    const uid = auth.currentUser?.uid;
    if (!uid || !activeVehicle || !selectedCentre) return;
    setSubmitting(true);
    try {
      const created = await firestoreServiceBookingRepo.createBooking(uid, {
        vehicleId: activeVehicle.id,
        centreId: selectedCentre.id,
        centreName: selectedCentre.name,
        serviceType,
        preferredDate,
        notes,
        isEmergency,
      });
      setBookings((prev) => [created, ...prev]);
      setNotes('');
      addToast({
        title: isEmergency
          ? 'Roadside dispatch request logged'
          : 'Service appointment requested',
        detail: `${selectedCentre.name} · ${preferredDate}`,
        tone: isEmergency ? 'warning' : 'success',
      });
    } catch (err) {
      addToast({
        title: 'Booking failed',
        detail: err instanceof Error ? err.message : 'Firestore error',
        tone: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    await firestoreServiceBookingRepo.cancelBooking(id);
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: 'cancelled' } : b))
    );
    addToast({ title: 'Booking cancelled', tone: 'info' });
  };

  if (!activeVehicle) {
    return (
      <TonalCard className="max-w-lg space-y-3">
        <h1 className="font-display text-xl font-bold">Add an EV First</h1>
        <RippleButton variant="primary" onClick={() => navigate('/onboarding')}>
          Open Profile &amp; EV Setup
        </RippleButton>
      </TonalCard>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[var(--cs-muted)]">
            <span>OpenStreetMap Workshops + Cloud Firestore Bookings</span>
            <span aria-hidden="true">·</span>
            <DemoLabel kind="live" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mt-1">
            EV Service Centres &amp; Roadside Request
          </h1>
        </div>

        <RippleButton
          variant="tonal"
          size="sm"
          disabled={loadingCentres}
          onClick={() => void loadCentres(true)}
        >
          <RefreshCw className={`w-4 h-4 ${loadingCentres ? 'animate-spin' : ''}`} />
          <span>Refresh Workshops</span>
        </RippleButton>
      </div>

      {centresError && (
        <div
          role="alert"
          className="p-4 rounded-[14px] bg-[var(--cs-error-container)] text-xs text-[var(--cs-error)]"
        >
          {centresError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Live OSM Workshops List */}
        <TonalCard className="lg:col-span-6 space-y-4">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <Wrench className="w-4 h-4 text-[var(--cs-primary)]" />
            <span>Corridor Workshops ({serviceCentres.length})</span>
          </h2>

          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
            {serviceCentres.map((centre) => {
              const active = selectedCentre?.id === centre.id;
              return (
                <button
                  key={centre.id}
                  type="button"
                  onClick={() => setSelectedCentre(centre)}
                  className={`w-full text-left p-4 rounded-[16px] border cursor-pointer transition-colors space-y-1.5 ${
                    active
                      ? 'bg-[var(--cs-primary-container)] border-[var(--cs-primary)]'
                      : 'bg-[var(--cs-surface-2)] border-[var(--cs-outline)] hover:border-[var(--cs-outline-strong)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-sm font-semibold text-[var(--cs-text)]">
                      {centre.name}
                    </span>
                    <span className="text-[11px] text-[var(--cs-primary)]">
                      {centre.corridorSegment}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--cs-muted)] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>{centre.address}</span>
                  </p>
                  <p className="text-xs text-[var(--cs-muted)] flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span>{centre.phone}</span>
                  </p>
                </button>
              );
            })}
            {!loadingCentres && serviceCentres.length === 0 && (
              <p className="text-xs text-[var(--cs-muted)]">
                No workshops loaded yet. Click Refresh Workshops to query OpenStreetMap.
              </p>
            )}
          </div>
        </TonalCard>

        {/* Booking Form + Active Bookings */}
        <div className="lg:col-span-6 space-y-5">
          <TonalCard className="space-y-4">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-[var(--cs-primary)]" />
              <span>Book Workshop or Roadside Dispatch</span>
            </h2>

            <form onSubmit={handleCreateBooking} className="space-y-4">
              <div className="p-3 rounded-[12px] bg-[var(--cs-surface-2)] text-xs">
                <span className="text-[var(--cs-muted)] block">Selected Centre</span>
                <span className="font-semibold text-[var(--cs-text)]">
                  {selectedCentre?.name ?? 'Select a centre from the list'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--cs-muted)] mb-1">
                    Service Type
                  </label>
                  <select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-xs"
                  >
                    <option value="HV Battery SoH & Coolant Inspection">
                      HV Battery SoH &amp; Coolant Inspection
                    </option>
                    <option value="CCS2 / OBC Diagnostics">
                      CCS2 / OBC Diagnostics
                    </option>
                    <option value="Scheduled Periodic Service">
                      Scheduled Periodic Service
                    </option>
                    <option value="Flatbed Tow / 12V Jumpstart">
                      Flatbed Tow / 12V Jumpstart
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--cs-muted)] mb-1">
                    Preferred Date
                  </label>
                  <input
                    type="date"
                    required
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-xs"
                  />
                </div>
              </div>

              <M3Switch
                checked={isEmergency}
                onChange={setIsEmergency}
                label="Emergency Roadside Priority"
                description="Flag request as stranded / mobile flatbed needed"
              />

              <div>
                <label className="block text-xs font-medium text-[var(--cs-muted)] mb-1">
                  Symptom / Highway Location Notes
                </label>
                <textarea
                  rows={2}
                  maxLength={400}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe fault codes, charger error, or km marker..."
                  className="w-full p-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-xs"
                />
              </div>

              <RippleButton
                type="submit"
                variant={isEmergency ? 'danger' : 'primary'}
                disabled={submitting || !selectedCentre}
                className="w-full"
              >
                {isEmergency && <AlertOctagon className="w-4 h-4" />}
                <span>
                  {submitting
                    ? 'Submitting...'
                    : isEmergency
                    ? 'Request Emergency Dispatch'
                    : 'Submit Service Request'}
                </span>
              </RippleButton>
            </form>
          </TonalCard>

          <TonalCard className="space-y-3">
            <h3 className="font-display text-base font-semibold">
              Your Cloud Bookings ({bookings.length})
            </h3>
            {bookings.length === 0 ? (
              <p className="text-xs text-[var(--cs-muted)]">
                No service requests submitted yet.
              </p>
            ) : (
              <div className="space-y-2.5">
                {bookings.map((b) => (
                  <div
                    key={b.id}
                    className="p-3.5 rounded-[14px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] flex items-start justify-between gap-3"
                  >
                    <div className="space-y-0.5 text-xs">
                      <p className="font-semibold text-[var(--cs-text)]">
                        {b.centreName}
                      </p>
                      <p className="text-[var(--cs-muted)]">
                        {b.serviceType} · {b.preferredDate} ·{' '}
                        <span className="capitalize font-medium text-[var(--cs-primary)]">
                          {b.status}
                        </span>
                      </p>
                      {b.notes && (
                        <p className="text-[var(--cs-muted)]">{b.notes}</p>
                      )}
                    </div>
                    {b.status === 'requested' && (
                      <button
                        type="button"
                        onClick={() => void handleCancel(b.id)}
                        aria-label="Cancel booking"
                        className="text-xs text-[var(--cs-error)] hover:underline inline-flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Cancel
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TonalCard>
        </div>
      </div>
    </div>
  );
}
