import { FileUp, Plus, ShieldCheck } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DemoLabel } from '../../components/DemoBadge';
import { RippleButton } from '../../components/RippleButton';
import { TonalCard } from '../../components/TonalCard';
import { firestoreClaimRepo } from '../../data/firestoreRepositories';
import { ClaimInputSchema } from '../../domain/schemas';
import { ClaimRecord } from '../../domain/types';
import { auth } from '../../lib/firebase';
import { useAppStore } from '../../store/useAppStore';

export function InsurancePage() {
  const navigate = useNavigate();
  const { activeVehicle, addToast } = useAppStore();

  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [policyNumber, setPolicyNumber] = useState('EV-KA-2026-884920');
  const [insurerName, setInsurerName] = useState('Tata AIG EV Protect');
  const [incidentType, setIncidentType] =
    useState<ClaimRecord['incidentType']>('charger_surge');
  const [incidentDate, setIncidentDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [estimatedAmount, setEstimatedAmount] = useState(15000);
  const [description, setDescription] = useState('');
  const [docNames, setDocNames] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid || !activeVehicle) {
      setLoading(false);
      return;
    }
    setLoading(true);
    firestoreClaimRepo
      .listClaims(uid, activeVehicle.id)
      .then(setClaims)
      .finally(() => setLoading(false));
  }, [activeVehicle]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const names = Array.from(files)
      .map((f) => f.name)
      .slice(0, 5);
    setDocNames((prev) => [...new Set([...prev, ...names])].slice(0, 10));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const uid = auth.currentUser?.uid;
    if (!uid || !activeVehicle) return;

    const parsed = ClaimInputSchema.safeParse({
      vehicleId: activeVehicle.id,
      policyNumber,
      insurerName,
      incidentType,
      incidentDate,
      description,
      estimatedAmountInr: Number(estimatedAmount),
      documents: docNames,
    });

    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Check claim details.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await firestoreClaimRepo.createClaim(uid, {
        vehicleId: parsed.data.vehicleId,
        policyNumber: parsed.data.policyNumber,
        insurerName: parsed.data.insurerName,
        incidentType: parsed.data.incidentType,
        incidentDate: parsed.data.incidentDate,
        description: parsed.data.description,
        estimatedAmountInr: parsed.data.estimatedAmountInr,
        documents: parsed.data.documents,
      });
      setClaims((prev) => [created, ...prev]);
      setDescription('');
      setDocNames([]);
      setShowForm(false);
      addToast({
        title: 'Claim submitted to Cloud Firestore',
        detail: `${created.insurerName} · ₹${created.estimatedAmountInr.toLocaleString()}`,
        tone: 'success',
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to submit claim.');
    } finally {
      setSubmitting(false);
    }
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
            <span>{activeVehicle.registrationNumber}</span>
            <span aria-hidden="true">·</span>
            <DemoLabel kind="cloud" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mt-1">
            Insurance &amp; FNOL Claims Tracker
          </h1>
        </div>

        <RippleButton variant="primary" size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="w-4 h-4" />
          <span>{showForm ? 'Cancel' : 'File New Claim (FNOL)'}</span>
        </RippleButton>
      </div>

      {showForm && (
        <TonalCard>
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="font-display text-lg font-semibold">
              First Notice of Loss (FNOL)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--cs-muted)] mb-1">
                  Policy Number
                </label>
                <input
                  type="text"
                  required
                  value={policyNumber}
                  onChange={(e) => setPolicyNumber(e.target.value)}
                  className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--cs-muted)] mb-1">
                  Insurer
                </label>
                <input
                  type="text"
                  required
                  value={insurerName}
                  onChange={(e) => setInsurerName(e.target.value)}
                  className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--cs-muted)] mb-1">
                  Incident Type
                </label>
                <select
                  value={incidentType}
                  onChange={(e) =>
                    setIncidentType(e.target.value as ClaimRecord['incidentType'])
                  }
                  className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-xs"
                >
                  <option value="charger_surge">Charger Surge / OBC</option>
                  <option value="battery_thermal">Battery / Thermal Event</option>
                  <option value="collision">Collision / Body</option>
                  <option value="roadside_tow">Roadside Tow</option>
                  <option value="glass_body">Glass / Windshield</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--cs-muted)] mb-1">
                  Estimated Repair (INR)
                </label>
                <input
                  type="number"
                  min={500}
                  max={5000000}
                  required
                  value={estimatedAmount}
                  onChange={(e) => setEstimatedAmount(Number(e.target.value))}
                  className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm tabular-nums"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--cs-muted)] mb-1">
                  Incident Date
                </label>
                <input
                  type="date"
                  required
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                  className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[var(--cs-muted)] mb-1">
                  Evidence Documents (filenames logged to claim)
                </label>
                <label className="flex items-center gap-2 min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-xs text-[var(--cs-muted)] cursor-pointer">
                  <FileUp className="w-4 h-4 text-[var(--cs-primary)]" />
                  <span>
                    {docNames.length > 0
                      ? docNames.join(', ')
                      : 'Attach photos / diagnostic report PDF'}
                  </span>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--cs-muted)] mb-1">
                Incident Description (min 10 chars)
              </label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what happened, station ID if charger-related, and visible fault codes..."
                className="w-full p-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm"
              />
            </div>

            {formError && (
              <p className="text-xs text-[var(--cs-error)]">{formError}</p>
            )}

            <div className="flex justify-end">
              <RippleButton type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Claim'}
              </RippleButton>
            </div>
          </form>
        </TonalCard>
      )}

      {/* Claims List */}
      <TonalCard className="space-y-4">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[var(--cs-primary)]" />
          <span>Active &amp; Past Claims ({claims.length})</span>
        </h2>

        {loading ? (
          <p className="text-xs text-[var(--cs-muted)]">Loading claims...</p>
        ) : claims.length === 0 ? (
          <div className="p-6 rounded-[16px] bg-[var(--cs-surface-2)] text-sm text-[var(--cs-muted)]">
            No insurance claims recorded for {activeVehicle.make} {activeVehicle.model}. Use &quot;File New Claim (FNOL)&quot; to submit a claim directly to your Cloud Firestore ledger.
          </div>
        ) : (
          <div className="space-y-4">
            {claims.map((clm) => (
              <div
                key={clm.id}
                className="p-4 rounded-[16px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-xs text-[var(--cs-muted)] tabular-nums">
                      {clm.insurerName} · Policy {clm.policyNumber} · {clm.incidentDate}
                    </div>
                    <h3 className="font-display text-base font-semibold capitalize mt-0.5">
                      {clm.incidentType.replaceAll('_', ' ')}
                    </h3>
                  </div>
                  <div className="text-right tabular-nums">
                    <span className="font-display text-lg font-bold text-[var(--cs-primary)]">
                      ₹{clm.estimatedAmountInr.toLocaleString()}
                    </span>
                    <span className="block text-xs uppercase tracking-wider text-[var(--cs-secondary)] font-semibold">
                      {clm.status.replaceAll('_', ' ')}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-[var(--cs-muted)]">{clm.description}</p>
                {clm.timeline.length > 0 && (
                  <div className="pt-2 border-t border-[var(--cs-outline)] space-y-1 text-xs">
                    {clm.timeline.map((t, i) => (
                      <div key={i} className="flex items-center justify-between text-[var(--cs-muted)]">
                        <span className="font-medium text-[var(--cs-text)]">{t.stage}</span>
                        <span>{new Date(t.timestamp).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </TonalCard>
    </div>
  );
}
