import { ShieldAlert, Wrench } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { DemoLabel } from '../../components/DemoBadge';
import { RippleButton } from '../../components/RippleButton';
import { TonalCard } from '../../components/TonalCard';
import { computeReliability } from '../../domain/reliability';
import { Station } from '../../domain/types';
import { useAppStore } from '../../store/useAppStore';

export function AdminPage() {
  const { stations, isAdmin, activeUser, updateStationAdmin, addToast } =
    useAppStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState<Station['status']>('online');
  const [price, setPrice] = useState<number>(16);
  const [downtime, setDowntime] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  const summary = useMemo(() => {
    const online = stations.filter((s) => s.status === 'online').length;
    const degraded = stations.filter((s) => s.status === 'degraded').length;
    const offline = stations.filter((s) => s.status === 'offline').length;
    const totalCheckIns = stations.reduce((acc, s) => acc + s.checkIns.length, 0);
    return { online, degraded, offline, totalCheckIns };
  }, [stations]);

  const startEdit = (s: Station) => {
    setEditingId(s.id);
    setStatus(s.status);
    setPrice(s.pricePerKwhInr);
    setDowntime(s.downtimeHoursLast30d);
  };

  const handleSave = async (stationId: string) => {
    setSaving(true);
    try {
      await updateStationAdmin(stationId, {
        status,
        pricePerKwhInr: Number(price),
        downtimeHoursLast30d: Number(downtime),
      });
      setEditingId(null);
    } catch (err) {
      addToast({
        title: 'Admin update rejected by Firestore rules',
        detail: err instanceof Error ? err.message : 'Insufficient permissions',
        tone: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-[var(--cs-muted)]">
          <span>Corridor Network Operations</span>
          <span aria-hidden="true">·</span>
          <DemoLabel kind="cloud" />
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mt-1">
          Corridor Station Operations &amp; Reliability Audit
        </h1>
      </div>

      {!isAdmin && (
        <div className="p-4 rounded-[16px] bg-[var(--cs-warning-container)] text-xs text-[var(--cs-warning)] flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Signed in as <strong>{activeUser?.email}</strong>. Firestore security rules restrict station status and tariff overrides to designated network admins. You can inspect live reliability metrics in read-only mode.
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 tabular-nums">
        <TonalCard padding="sm">
          <span className="text-xs text-[var(--cs-muted)]">Online Hubs</span>
          <p className="font-display text-2xl font-bold text-[var(--cs-primary)] mt-1">
            {summary.online}
          </p>
        </TonalCard>
        <TonalCard padding="sm">
          <span className="text-xs text-[var(--cs-muted)]">Degraded Hubs</span>
          <p className="font-display text-2xl font-bold text-[var(--cs-warning)] mt-1">
            {summary.degraded}
          </p>
        </TonalCard>
        <TonalCard padding="sm">
          <span className="text-xs text-[var(--cs-muted)]">Offline Hubs</span>
          <p className="font-display text-2xl font-bold text-[var(--cs-error)] mt-1">
            {summary.offline}
          </p>
        </TonalCard>
        <TonalCard padding="sm">
          <span className="text-xs text-[var(--cs-muted)]">Firestore Check-Ins</span>
          <p className="font-display text-2xl font-bold mt-1">
            {summary.totalCheckIns}
          </p>
        </TonalCard>
      </div>

      <TonalCard className="space-y-3">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <Wrench className="w-4 h-4 text-[var(--cs-primary)]" />
          <span>Live Corridor Stations ({stations.length})</span>
        </h2>

        <div className="divide-y divide-[var(--cs-outline)]">
          {stations.slice(0, 30).map((s) => {
            const rel = computeReliability(s);
            const editing = editingId === s.id;
            return (
              <div key={s.id} className="py-3.5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-[var(--cs-text)] truncate">
                      {s.name}
                    </p>
                    <p className="text-[var(--cs-muted)] tabular-nums">
                      {s.corridorSegment} · {s.operator} · ₹{s.pricePerKwhInr}/kWh ·{' '}
                      <span className="capitalize">{s.status}</span> · Reliability {rel.score}/100 ({s.checkIns.length} check-ins)
                    </p>
                  </div>
                  {isAdmin && (
                    <RippleButton
                      variant="tonal"
                      size="sm"
                      onClick={() => (editing ? setEditingId(null) : startEdit(s))}
                    >
                      {editing ? 'Cancel' : 'Edit Status'}
                    </RippleButton>
                  )}
                </div>

                {editing && isAdmin && (
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end pt-2">
                    <div>
                      <label className="block text-[11px] text-[var(--cs-muted)] mb-1">
                        Status
                      </label>
                      <select
                        value={status}
                        onChange={(e) =>
                          setStatus(e.target.value as Station['status'])
                        }
                        className="w-full min-h-[38px] px-2.5 rounded-[10px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-xs"
                      >
                        <option value="online">Online</option>
                        <option value="degraded">Degraded</option>
                        <option value="offline">Offline</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-[var(--cs-muted)] mb-1">
                        Tariff (INR/kWh)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min={0}
                        max={100}
                        value={price}
                        onChange={(e) => setPrice(Number(e.target.value))}
                        className="w-full min-h-[38px] px-2.5 rounded-[10px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-xs tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[var(--cs-muted)] mb-1">
                        30d Downtime (hrs)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min={0}
                        value={downtime}
                        onChange={(e) => setDowntime(Number(e.target.value))}
                        className="w-full min-h-[38px] px-2.5 rounded-[10px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-xs tabular-nums"
                      />
                    </div>
                    <RippleButton
                      variant="primary"
                      size="sm"
                      disabled={saving}
                      onClick={() => void handleSave(s.id)}
                    >
                      {saving ? 'Saving...' : 'Save Override'}
                    </RippleButton>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </TonalCard>
    </div>
  );
}
