import { BatteryCharging, Plus, TrendingDown } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DemoLabel } from '../../components/DemoBadge';
import { RippleButton } from '../../components/RippleButton';
import { TonalCard } from '../../components/TonalCard';
import { firestoreBatteryRepo } from '../../data/firestoreRepositories';
import { BatteryHealthSnapshot } from '../../domain/types';
import { auth } from '../../lib/firebase';
import { useAppStore } from '../../store/useAppStore';

export function BatteryHealthPage() {
  const navigate = useNavigate();
  const { activeVehicle, updateVehicleSpecs, addToast } = useAppStore();

  const [snapshots, setSnapshots] = useState<BatteryHealthSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const [month, setMonth] = useState(
    new Date().toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
  );
  const [sohPercent, setSohPercent] = useState(activeVehicle?.sohPercent ?? 98);
  const [dcFastRatio, setDcFastRatio] = useState(25);
  const [avgTempC, setAvgTempC] = useState(29);
  const [cycles, setCycles] = useState(activeVehicle?.cycleCount ?? 100);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid || !activeVehicle) {
      setLoading(false);
      return;
    }
    setLoading(true);
    firestoreBatteryRepo
      .getSnapshots(uid, activeVehicle.id)
      .then((rows) => setSnapshots(rows))
      .finally(() => setLoading(false));
  }, [activeVehicle]);

  useEffect(() => {
    if (activeVehicle) {
      setSohPercent(activeVehicle.sohPercent);
      setCycles(activeVehicle.cycleCount);
    }
  }, [activeVehicle]);

  const handleAddSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    const uid = auth.currentUser?.uid;
    if (!uid || !activeVehicle) return;
    setSaving(true);
    try {
      const created = await firestoreBatteryRepo.addSnapshot(
        uid,
        activeVehicle.id,
        {
          month,
          sohPercent: Number(sohPercent),
          dcFastChargeRatio: Number(dcFastRatio),
          avgTempC: Number(avgTempC),
          cycles: Number(cycles),
        }
      );
      await updateVehicleSpecs(activeVehicle.id, {
        sohPercent: Number(sohPercent),
        cycleCount: Number(cycles),
      });
      setSnapshots((prev) => [...prev, created]);
      setShowAdd(false);
      addToast({
        title: 'Battery snapshot saved to Cloud Firestore',
        detail: `${sohPercent}% SoH · ${cycles} cycles`,
        tone: 'success',
      });
    } catch (err) {
      addToast({
        title: 'Failed to save snapshot',
        detail: err instanceof Error ? err.message : 'Firestore error',
        tone: 'error',
      });
    } finally {
      setSaving(false);
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
            <span>{activeVehicle.make} {activeVehicle.model}</span>
            <span aria-hidden="true">·</span>
            <DemoLabel kind="cloud" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mt-1">
            Battery Health &amp; Degradation
          </h1>
        </div>

        <RippleButton variant="primary" size="sm" onClick={() => setShowAdd((v) => !v)}>
          <Plus className="w-4 h-4" />
          <span>{showAdd ? 'Cancel' : 'Log SoH Snapshot'}</span>
        </RippleButton>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 tabular-nums">
        <TonalCard padding="sm" className="space-y-1">
          <span className="text-xs text-[var(--cs-muted)] flex items-center gap-1.5">
            <BatteryCharging className="w-4 h-4 text-[var(--cs-primary)]" />
            Reported State of Health
          </span>
          <p className="font-display text-3xl font-bold text-[var(--cs-primary)]">
            {activeVehicle.sohPercent}%
          </p>
          <p className="text-xs text-[var(--cs-muted)]">
            {(activeVehicle.usableKwh * (activeVehicle.sohPercent / 100)).toFixed(1)} kWh effective capacity
          </p>
        </TonalCard>

        <TonalCard padding="sm" className="space-y-1">
          <span className="text-xs text-[var(--cs-muted)] flex items-center gap-1.5">
            <TrendingDown className="w-4 h-4 text-[var(--cs-secondary)]" />
            Equivalent Full Cycles
          </span>
          <p className="font-display text-3xl font-bold">
            {activeVehicle.cycleCount}
          </p>
          <p className="text-xs text-[var(--cs-muted)]">
            Odometer: {activeVehicle.odometerKm.toLocaleString()} km
          </p>
        </TonalCard>

        <TonalCard padding="sm" className="space-y-1">
          <span className="text-xs text-[var(--cs-muted)]">Logged Snapshots</span>
          <p className="font-display text-3xl font-bold">{snapshots.length}</p>
          <p className="text-xs text-[var(--cs-muted)]">
            Stored in Cloud Firestore
          </p>
        </TonalCard>
      </div>

      {showAdd && (
        <TonalCard>
          <form
            onSubmit={handleAddSnapshot}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end"
          >
            <div>
              <label className="block text-xs font-medium text-[var(--cs-muted)] mb-1">
                Month Label
              </label>
              <input
                type="text"
                required
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--cs-muted)] mb-1">
                SoH (%)
              </label>
              <input
                type="number"
                step="0.1"
                min={40}
                max={100}
                required
                value={sohPercent}
                onChange={(e) => setSohPercent(Number(e.target.value))}
                className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--cs-muted)] mb-1">
                DC Fast-Charge (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                required
                value={dcFastRatio}
                onChange={(e) => setDcFastRatio(Number(e.target.value))}
                className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--cs-muted)] mb-1">
                Avg Pack Temp (°C)
              </label>
              <input
                type="number"
                min={-10}
                max={65}
                required
                value={avgTempC}
                onChange={(e) => setAvgTempC(Number(e.target.value))}
                className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--cs-muted)] mb-1">
                Total Cycles
              </label>
              <input
                type="number"
                min={0}
                max={10000}
                required
                value={cycles}
                onChange={(e) => setCycles(Number(e.target.value))}
                className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm tabular-nums"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-5 flex justify-end">
              <RippleButton type="submit" variant="primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Snapshot to Firestore'}
              </RippleButton>
            </div>
          </form>
        </TonalCard>
      )}

      {/* Chart */}
      <TonalCard className="space-y-4">
        <h2 className="font-display text-lg font-semibold">
          State-of-Health &amp; DC Fast-Charge History
        </h2>
        {loading ? (
          <p className="text-xs text-[var(--cs-muted)]">Loading snapshots...</p>
        ) : snapshots.length === 0 ? (
          <div className="p-6 rounded-[16px] bg-[var(--cs-surface-2)] text-sm text-[var(--cs-muted)]">
            No calibration snapshots logged yet for this vehicle. Click &quot;Log SoH Snapshot&quot; above to record your first real battery diagnostic check.
          </div>
        ) : (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={snapshots}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} />
                <YAxis domain={[80, 100]} stroke="#94A3B8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#12161C',
                    border: '1px solid rgba(255,255,255,0.14)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="sohPercent"
                  name="SoH %"
                  stroke="#3DEBB0"
                  fill="#3DEBB0"
                  fillOpacity={0.18}
                  strokeWidth={2.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </TonalCard>
    </div>
  );
}
