import {
  AlertTriangle,
  Download,
  FileCheck2,
  Plus,
  Printer,
  ShieldCheck,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DemoLabel } from '../../components/DemoBadge';
import { RippleButton } from '../../components/RippleButton';
import { TonalCard } from '../../components/TonalCard';
import { firestorePassportRepo } from '../../data/firestoreRepositories';
import { verifyPassportChain } from '../../domain/passport';
import {
  PassportEvent,
  PassportEventType,
  PassportVerificationResult,
} from '../../domain/types';
import { auth } from '../../lib/firebase';
import { useAppStore } from '../../store/useAppStore';

export function PassportPage() {
  const navigate = useNavigate();
  const { activeVehicle, activeUser, addToast } = useAppStore();

  const [events, setEvents] = useState<PassportEvent[]>([]);
  const [verification, setVerification] = useState<PassportVerificationResult>({
    valid: true,
    checkedCount: 0,
    brokenAtIndex: null,
    reason: 'No events yet',
  });
  const [tamperPreview, setTamperPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const [type, setType] = useState<PassportEventType>('charging_session');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [odometerKm, setOdometerKm] = useState(activeVehicle?.odometerKm ?? 0);
  const [saving, setSaving] = useState(false);

  const refreshChain = async (list: PassportEvent[]) => {
    setEvents(list);
    const res = await verifyPassportChain(list);
    setVerification(res);
  };

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid || !activeVehicle) {
      setLoading(false);
      return;
    }
    setOdometerKm(activeVehicle.odometerKm);
    setLoading(true);
    firestorePassportRepo
      .getEvents(uid, activeVehicle.id)
      .then((list) => refreshChain(list))
      .finally(() => setLoading(false));
  }, [activeVehicle]);

  const handleAppend = async (e: React.FormEvent) => {
    e.preventDefault();
    const uid = auth.currentUser?.uid;
    if (!uid || !activeVehicle) return;
    setSaving(true);
    try {
      const updated = await firestorePassportRepo.appendEvent(
        uid,
        activeVehicle.id,
        {
          type,
          timestamp: new Date().toISOString(),
          odometerKm: Number(odometerKm),
          title: title.trim(),
          summary: summary.trim(),
          metadata: {
            recordedBy: activeUser?.name ?? 'Driver',
            sohPercent: activeVehicle.sohPercent,
          },
        }
      );
      setTamperPreview(false);
      await refreshChain(updated);
      setTitle('');
      setSummary('');
      setShowAdd(false);
      addToast({
        title: 'SHA-256 record sealed in Cloud Firestore',
        tone: 'success',
      });
    } catch (err) {
      addToast({
        title: 'Unable to append passport record',
        detail: err instanceof Error ? err.message : 'Firestore error',
        tone: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTamperDemo = async () => {
    if (events.length === 0) return;
    if (tamperPreview) {
      setTamperPreview(false);
      await refreshChain(events);
      return;
    }
    const modified = events.map((ev, idx) =>
      idx === 0 ? { ...ev, odometerKm: ev.odometerKm + 10000 } : ev
    );
    const check = await verifyPassportChain(modified);
    setTamperPreview(true);
    setVerification(check);
  };

  const handleExportJson = () => {
    if (!activeVehicle) return;
    const payload = {
      vehicle: activeVehicle,
      verification,
      events,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chargesense-passport-${activeVehicle.registrationNumber}.json`;
    a.click();
    URL.revokeObjectURL(url);
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

  const latestHash =
    events.length > 0 ? events[events.length - 1].hash : '0'.repeat(64);
  const qrPayload = JSON.stringify({
    app: 'ChargeSense',
    reg: activeVehicle.registrationNumber,
    model: `${activeVehicle.make} ${activeVehicle.model}`,
    records: events.length,
    valid: verification.valid,
    rootHash: latestHash.slice(0, 24),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[var(--cs-muted)]">
            <span>{activeVehicle.registrationNumber}</span>
            <span aria-hidden="true">·</span>
            <DemoLabel kind="deterministic" />
            <span aria-hidden="true">·</span>
            <DemoLabel kind="cloud" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mt-1">
            EV Digital Passport (SHA-256 Hash Chain)
          </h1>
        </div>

        <div className="flex flex-wrap gap-2">
          <RippleButton variant="primary" size="sm" onClick={() => setShowAdd((v) => !v)}>
            <Plus className="w-4 h-4" />
            <span>{showAdd ? 'Cancel' : 'Seal New Record'}</span>
          </RippleButton>
          <RippleButton variant="tonal" size="sm" onClick={handleExportJson}>
            <Download className="w-4 h-4" />
            <span>Export JSON</span>
          </RippleButton>
          <RippleButton variant="tonal" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4" />
            <span>Print / PDF</span>
          </RippleButton>
        </div>
      </div>

      {/* Verification Banner + QR Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <TonalCard className="lg:col-span-8 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {verification.valid ? (
                <ShieldCheck className="w-6 h-6 text-[var(--cs-primary)] shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-[var(--cs-error)] shrink-0 mt-0.5" />
              )}
              <div>
                <h2 className="font-display text-lg font-semibold">
                  {verification.valid
                    ? 'Cryptographic Chain Integrity Verified'
                    : 'Tamper Detected in Hash Chain'}
                </h2>
                <p className="text-xs text-[var(--cs-muted)] mt-1">
                  {verification.reason}
                </p>
              </div>
            </div>

            {events.length > 0 && (
              <RippleButton
                variant={tamperPreview ? 'danger' : 'tonal'}
                size="sm"
                onClick={() => void handleToggleTamperDemo()}
              >
                {tamperPreview ? 'Restore Real Chain' : 'Test Tamper Check'}
              </RippleButton>
            )}
          </div>

          <div className="p-3 rounded-[12px] bg-[var(--cs-surface-2)] text-xs font-mono break-all text-[var(--cs-muted)]">
            Chain Tip Hash: <span className="text-[var(--cs-text)]">{latestHash}</span>
          </div>
        </TonalCard>

        <TonalCard className="lg:col-span-4 flex items-center gap-4">
          <div className="p-2.5 rounded-[14px] bg-white shrink-0">
            <QRCodeSVG value={qrPayload} size={92} />
          </div>
          <div className="text-xs space-y-1">
            <p className="font-display font-semibold text-sm text-[var(--cs-text)]">
              Passport QR Seal
            </p>
            <p className="text-[var(--cs-muted)]">
              Encodes registration, record count ({events.length}), and SHA-256 chain tip for resale or insurance audit.
            </p>
          </div>
        </TonalCard>
      </div>

      {showAdd && (
        <TonalCard>
          <form onSubmit={handleAppend} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--cs-muted)] mb-1">
                Event Category
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as PassportEventType)}
                className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-xs"
              >
                <option value="ownership_registered">Ownership Event</option>
                <option value="charging_session">Charging Session</option>
                <option value="service_record">Service Record</option>
                <option value="battery_snapshot">Battery Snapshot</option>
                <option value="insurance_claim">Insurance Claim</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--cs-muted)] mb-1">
                Odometer (km)
              </label>
              <input
                type="number"
                min={0}
                required
                value={odometerKm}
                onChange={(e) => setOdometerKm(Number(e.target.value))}
                className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--cs-muted)] mb-1">
                Record Title
              </label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 20,000 km HV Inspection"
                className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-[var(--cs-muted)] mb-1">
                Summary Details
              </label>
              <textarea
                rows={2}
                required
                minLength={2}
                maxLength={400}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Verified workshop checks, kWh delivered, or diagnostic notes..."
                className="w-full p-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm"
              />
            </div>
            <div className="sm:col-span-3 flex justify-end">
              <RippleButton type="submit" variant="primary" disabled={saving}>
                {saving ? 'Hashing & Sealing...' : 'Append & Seal Record'}
              </RippleButton>
            </div>
          </form>
        </TonalCard>
      )}

      {/* Event Chain */}
      <TonalCard className="space-y-3">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <FileCheck2 className="w-4 h-4 text-[var(--cs-primary)]" />
          <span>Immutable Ledger Entries ({events.length})</span>
        </h2>

        {loading ? (
          <p className="text-xs text-[var(--cs-muted)]">Loading passport ledger...</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-[var(--cs-muted)]">
            No passport events sealed yet. Click &quot;Seal New Record&quot; to anchor your vehicle&apos;s genesis ownership or service event.
          </p>
        ) : (
          <div className="space-y-3">
            {events.map((ev, idx) => (
              <div
                key={ev.id}
                className={`p-4 rounded-[16px] border space-y-2 ${
                  verification.brokenAtIndex === idx
                    ? 'bg-[var(--cs-error-container)] border-[var(--cs-error)]'
                    : 'bg-[var(--cs-surface-2)] border-[var(--cs-outline)]'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-[var(--cs-primary)] uppercase tracking-wider">
                    #{idx + 1} · {ev.type.replaceAll('_', ' ')}
                  </span>
                  <span className="text-[var(--cs-muted)] tabular-nums">
                    {new Date(ev.timestamp).toLocaleString()} · {ev.odometerKm.toLocaleString()} km
                  </span>
                </div>
                <p className="font-display text-base font-semibold text-[var(--cs-text)]">
                  {ev.title}
                </p>
                <p className="text-xs text-[var(--cs-muted)]">{ev.summary}</p>
                <div className="pt-2 border-t border-[var(--cs-outline)] text-[11px] font-mono text-[var(--cs-muted)] truncate">
                  SHA-256: {ev.hash}
                </div>
              </div>
            ))}
          </div>
        )}
      </TonalCard>
    </div>
  );
}
