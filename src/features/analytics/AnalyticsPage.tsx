import { Plus, Trash2, TrendingUp } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DemoLabel } from '../../components/DemoBadge';
import { RippleButton } from '../../components/RippleButton';
import { TonalCard } from '../../components/TonalCard';
import { firestoreTripRepo } from '../../data/firestoreRepositories';
import { TripHistoryRecord } from '../../domain/types';
import { auth } from '../../lib/firebase';
import { useAppStore } from '../../store/useAppStore';

export function AnalyticsPage() {
  const navigate = useNavigate();
  const { activeVehicle, addToast } = useAppStore();

  const [trips, setTrips] = useState<TripHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const [origin, setOrigin] = useState('Bengaluru');
  const [destination, setDestination] = useState('Mysuru');
  const [distanceKm, setDistanceKm] = useState(143);
  const [energyUsedKwh, setEnergyUsedKwh] = useState(20.5);
  const [costInr, setCostInr] = useState(280);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid || !activeVehicle) {
      setLoading(false);
      return;
    }
    setLoading(true);
    firestoreTripRepo
      .listTrips(uid, activeVehicle.id)
      .then(setTrips)
      .finally(() => setLoading(false));
  }, [activeVehicle]);

  const stats = useMemo(() => {
    const totalKm = trips.reduce((a, t) => a + t.distanceKm, 0);
    const totalKwh = trips.reduce((a, t) => a + t.energyUsedKwh, 0);
    const totalCost = trips.reduce((a, t) => a + t.costInr, 0);
    const avgCostPerKm = totalKm > 0 ? (totalCost / totalKm).toFixed(2) : '0.00';
    const avgEco =
      trips.length > 0
        ? Math.round(trips.reduce((a, t) => a + t.ecoScore, 0) / trips.length)
        : 0;
    return { totalKm, totalKwh: totalKwh.toFixed(1), totalCost, avgCostPerKm, avgEco };
  }, [trips]);

  const handleLogTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    const uid = auth.currentUser?.uid;
    if (!uid || !activeVehicle) return;
    setSaving(true);
    try {
      const avgEff = Math.max(
        60,
        Math.min(480, Math.round((energyUsedKwh * 1000) / Math.max(1, distanceKm)))
      );
      const ecoScore = Math.max(
        50,
        Math.min(99, Math.round(105 - (avgEff - 115) * 0.45))
      );
      const created = await firestoreTripRepo.logTrip(uid, {
        vehicleId: activeVehicle.id,
        date: new Date().toISOString().slice(0, 10),
        origin,
        destination,
        distanceKm: Number(distanceKm),
        energyUsedKwh: Number(energyUsedKwh),
        costInr: Number(costInr),
        avgEfficiencyWhKm: avgEff,
        ecoScore,
      });
      setTrips((prev) => [created, ...prev]);
      setShowAdd(false);
      addToast({ title: 'Trip logged to Cloud Firestore', tone: 'success' });
    } catch (err) {
      addToast({
        title: 'Unable to log trip',
        detail: err instanceof Error ? err.message : 'Firestore error',
        tone: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await firestoreTripRepo.deleteTrip(id);
    setTrips((prev) => prev.filter((t) => t.id !== id));
    addToast({ title: 'Trip removed', tone: 'info' });
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
            Trips &amp; Efficiency Analytics
          </h1>
        </div>

        <RippleButton variant="primary" size="sm" onClick={() => setShowAdd((v) => !v)}>
          <Plus className="w-4 h-4" />
          <span>{showAdd ? 'Cancel' : 'Log Real Trip'}</span>
        </RippleButton>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 tabular-nums">
        <TonalCard padding="sm">
          <span className="text-xs text-[var(--cs-muted)]">Total Distance</span>
          <p className="font-display text-2xl font-bold mt-1">{stats.totalKm} km</p>
        </TonalCard>
        <TonalCard padding="sm">
          <span className="text-xs text-[var(--cs-muted)]">Total Energy</span>
          <p className="font-display text-2xl font-bold mt-1">{stats.totalKwh} kWh</p>
        </TonalCard>
        <TonalCard padding="sm">
          <span className="text-xs text-[var(--cs-muted)]">Running Cost / km</span>
          <p className="font-display text-2xl font-bold text-[var(--cs-primary)] mt-1">
            ₹{stats.avgCostPerKm}
          </p>
        </TonalCard>
        <TonalCard padding="sm">
          <span className="text-xs text-[var(--cs-muted)]">Average Eco Score</span>
          <p className="font-display text-2xl font-bold mt-1">{stats.avgEco}/100</p>
        </TonalCard>
      </div>

      {showAdd && (
        <TonalCard>
          <form onSubmit={handleLogTrip} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-[var(--cs-muted)] mb-1">
                Origin
              </label>
              <input
                type="text"
                required
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--cs-muted)] mb-1">
                Destination
              </label>
              <input
                type="text"
                required
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--cs-muted)] mb-1">
                Distance (km)
              </label>
              <input
                type="number"
                min={1}
                required
                value={distanceKm}
                onChange={(e) => setDistanceKm(Number(e.target.value))}
                className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--cs-muted)] mb-1">
                Energy (kWh)
              </label>
              <input
                type="number"
                step="0.1"
                min={0.5}
                required
                value={energyUsedKwh}
                onChange={(e) => setEnergyUsedKwh(Number(e.target.value))}
                className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--cs-muted)] mb-1">
                Charging Cost (INR)
              </label>
              <input
                type="number"
                min={0}
                required
                value={costInr}
                onChange={(e) => setCostInr(Number(e.target.value))}
                className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm tabular-nums"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-5 flex justify-end">
              <RippleButton type="submit" variant="primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Trip'}
              </RippleButton>
            </div>
          </form>
        </TonalCard>
      )}

      {/* Chart */}
      <TonalCard className="space-y-4">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[var(--cs-primary)]" />
          <span>Trip Efficiency (Wh/km)</span>
        </h2>

        {loading ? (
          <p className="text-xs text-[var(--cs-muted)]">Loading trips...</p>
        ) : trips.length === 0 ? (
          <p className="text-sm text-[var(--cs-muted)]">
            No trips logged yet. Save a planned trip from Trip Planner or click &quot;Log Real Trip&quot; above.
          </p>
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...trips].reverse()}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                <XAxis dataKey="destination" stroke="#94A3B8" fontSize={12} />
                <YAxis stroke="#94A3B8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#12161C',
                    border: '1px solid rgba(255,255,255,0.14)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Bar
                  dataKey="avgEfficiencyWhKm"
                  name="Efficiency (Wh/km)"
                  fill="#8DA6FF"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </TonalCard>

      {/* Trip Table */}
      {trips.length > 0 && (
        <TonalCard className="space-y-3">
          <h3 className="font-display text-base font-semibold">Logged Journeys</h3>
          <div className="divide-y divide-[var(--cs-outline)]">
            {trips.map((t) => (
              <div
                key={t.id}
                className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs tabular-nums"
              >
                <div>
                  <p className="font-semibold text-sm text-[var(--cs-text)]">
                    {t.origin} → {t.destination}
                  </p>
                  <p className="text-[var(--cs-muted)]">{t.date}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span>{t.distanceKm} km</span>
                  <span>{t.energyUsedKwh} kWh</span>
                  <span>₹{t.costInr}</span>
                  <span className="text-[var(--cs-primary)] font-semibold">
                    Eco {t.ecoScore}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleDelete(t.id)}
                    aria-label="Delete trip"
                    className="text-[var(--cs-muted)] hover:text-[var(--cs-error)] cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </TonalCard>
      )}
    </div>
  );
}
