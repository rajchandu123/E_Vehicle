import { Check, LogOut, Pencil, Plus, Trash2, UserCheck } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DemoLabel } from '../../components/DemoBadge';
import { RippleButton } from '../../components/RippleButton';
import { TonalCard } from '../../components/TonalCard';
import { SEED_VEHICLES } from '../../data/seed/vehicles';
import { ProfileUpdateSchema, VehicleInputSchema } from '../../domain/schemas';
import { ConnectorType } from '../../domain/types';
import { useAppStore } from '../../store/useAppStore';

const ALL_CONNECTORS: ConnectorType[] = ['CCS2', 'Type 2', 'CHAdeMO', 'GB/T'];

export function OnboardingPage() {
  const navigate = useNavigate();
  const {
    activeUser,
    updateSignedInProfile,
    logoutAccount,
    vehicles,
    activeVehicle,
    setActiveVehicle,
    addVehicleAndSelect,
    removeVehicle,
  } = useAppStore();

  const [editingProfile, setEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(activeUser?.name ?? '');
  const [profileCity, setProfileCity] = useState(activeUser?.city ?? 'Bengaluru');
  const [safetyBuffer, setSafetyBuffer] = useState(
    activeUser?.preferredSafetyBufferPercent ?? 20
  );
  const [profileError, setProfileError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (activeUser) {
      setProfileName(activeUser.name);
      setProfileCity(activeUser.city);
      setSafetyBuffer(activeUser.preferredSafetyBufferPercent);
    }
  }, [activeUser]);

  const [showNewVehicle, setShowNewVehicle] = useState(false);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [variant, setVariant] = useState('');
  const [year, setYear] = useState(2025);
  const [regNo, setRegNo] = useState('KA-01-EV-');
  const [usableKwh, setUsableKwh] = useState(45);
  const [efficiencyWhPerKm, setEfficiencyWhPerKm] = useState(140);
  const [maxDcKw, setMaxDcKw] = useState(60);
  const [maxAcKw, setMaxAcKw] = useState(7.2);
  const [connectors, setConnectors] = useState<ConnectorType[]>(['CCS2', 'Type 2']);
  const [vehError, setVehError] = useState<string | null>(null);
  const [savingVeh, setSavingVeh] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    const parsed = ProfileUpdateSchema.safeParse({
      name: profileName,
      city: profileCity,
      preferredSafetyBufferPercent: Number(safetyBuffer),
    });
    if (!parsed.success) {
      setProfileError(parsed.error.issues[0]?.message ?? 'Invalid profile fields');
      return;
    }
    setSavingProfile(true);
    try {
      await updateSignedInProfile(parsed.data);
      setEditingProfile(false);
    } catch (err) {
      setProfileError(
        err instanceof Error ? err.message : 'Unable to save profile.'
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    await logoutAccount();
    navigate('/auth?mode=login', { replace: true });
  };

  const toggleConnector = (conn: ConnectorType) => {
    setConnectors((prev) =>
      prev.includes(conn) ? prev.filter((c) => c !== conn) : [...prev, conn]
    );
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setVehError(null);
    const parsed = VehicleInputSchema.safeParse({
      make,
      model,
      variant,
      year: Number(year),
      registrationNumber: regNo,
      usableKwh: Number(usableKwh),
      efficiencyWhPerKm: Number(efficiencyWhPerKm),
      connectors,
      maxDcChargeKw: Number(maxDcKw),
      maxAcChargeKw: Number(maxAcKw),
    });
    if (!parsed.success) {
      setVehError(parsed.error.issues[0]?.message ?? 'Check vehicle specifications');
      return;
    }
    setSavingVeh(true);
    try {
      await addVehicleAndSelect({
        ...parsed.data,
        nominalKwh: Number((parsed.data.usableKwh * 1.05).toFixed(1)),
        odometerKm: 500,
        sohPercent: 99.5,
        cycleCount: 8,
      });
      setShowNewVehicle(false);
      setMake('');
      setModel('');
      setVariant('');
    } catch (err) {
      setVehError(err instanceof Error ? err.message : 'Failed to save vehicle.');
    } finally {
      setSavingVeh(false);
    }
  };

  const handleAddTemplate = async (tplIndex: number) => {
    const tpl = SEED_VEHICLES[tplIndex];
    if (!tpl) return;
    setSavingVeh(true);
    try {
      const { id: _ignored, ...rest } = tpl;
      await addVehicleAndSelect(rest);
    } finally {
      setSavingVeh(false);
    }
  };

  const initials = (activeUser?.name ?? 'EV')
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[var(--cs-muted)]">
            <span>Profile &amp; Garage Setup</span>
            <span aria-hidden="true">·</span>
            <DemoLabel kind="cloud" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mt-1">
            Driver Profile &amp; Active EV
          </h1>
          <p className="text-sm text-[var(--cs-muted)] mt-1">
            Your account profile and electric vehicles are persisted per user in Cloud Firestore.
          </p>
        </div>

        <RippleButton variant="primary" onClick={() => navigate('/app')}>
          Continue to Overview
        </RippleButton>
      </div>

      {/* Signed-In Account & Profile Section */}
      <TonalCard className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-[var(--cs-primary-container)] text-[var(--cs-primary)] font-display font-bold text-base flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[var(--cs-primary)]" />
                <h2 className="font-display text-lg font-semibold">
                  01. Account Profile
                </h2>
              </div>
              <p className="text-xs text-[var(--cs-muted)] mt-0.5">
                Signed in as{' '}
                <strong className="text-[var(--cs-text)] font-medium">
                  {activeUser?.email}
                </strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <RippleButton
              variant="tonal"
              size="sm"
              onClick={() => setEditingProfile((v) => !v)}
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>{editingProfile ? 'Cancel Edit' : 'Edit Profile'}</span>
            </RippleButton>
            <RippleButton variant="danger" size="sm" onClick={handleLogout}>
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </RippleButton>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-[var(--cs-outline)] text-xs tabular-nums">
          <div className="p-3.5 rounded-[14px] bg-[var(--cs-surface-2)]">
            <span className="text-[var(--cs-muted)] block">Driver Name</span>
            <span className="text-sm font-semibold text-[var(--cs-text)] mt-0.5 block">
              {activeUser?.name ?? '--'}
            </span>
          </div>
          <div className="p-3.5 rounded-[14px] bg-[var(--cs-surface-2)]">
            <span className="text-[var(--cs-muted)] block">Home City</span>
            <span className="text-sm font-semibold text-[var(--cs-text)] mt-0.5 block">
              {activeUser?.city ?? '--'}
            </span>
          </div>
          <div className="p-3.5 rounded-[14px] bg-[var(--cs-surface-2)]">
            <span className="text-[var(--cs-muted)] block">Safety Reserve</span>
            <span className="text-sm font-semibold text-[var(--cs-primary)] mt-0.5 block">
              {activeUser?.preferredSafetyBufferPercent ?? 20}% SoC
            </span>
          </div>
          <div className="p-3.5 rounded-[14px] bg-[var(--cs-surface-2)]">
            <span className="text-[var(--cs-muted)] block">Member Since</span>
            <span className="text-sm font-semibold text-[var(--cs-text)] mt-0.5 block">
              {activeUser?.createdAt
                ? new Date(activeUser.createdAt).toLocaleDateString()
                : '--'}
            </span>
          </div>
        </div>

        {editingProfile && (
          <form
            onSubmit={handleSaveProfile}
            className="pt-4 border-t border-[var(--cs-outline)] grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            <div>
              <label
                htmlFor="edit-profile-name"
                className="block text-xs font-medium text-[var(--cs-muted)] mb-1"
              >
                Full Name
              </label>
              <input
                id="edit-profile-name"
                type="text"
                required
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm text-[var(--cs-text)]"
              />
            </div>
            <div>
              <label
                htmlFor="edit-profile-city"
                className="block text-xs font-medium text-[var(--cs-muted)] mb-1"
              >
                Home City
              </label>
              <input
                id="edit-profile-city"
                type="text"
                required
                value={profileCity}
                onChange={(e) => setProfileCity(e.target.value)}
                className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm text-[var(--cs-text)]"
              />
            </div>
            <div>
              <label
                htmlFor="edit-profile-buffer"
                className="block text-xs font-medium text-[var(--cs-muted)] mb-1"
              >
                Safety Buffer ({safetyBuffer}%)
              </label>
              <input
                id="edit-profile-buffer"
                type="number"
                min={5}
                max={40}
                value={safetyBuffer}
                onChange={(e) => setSafetyBuffer(Number(e.target.value))}
                className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm tabular-nums text-[var(--cs-text)]"
              />
            </div>

            {profileError && (
              <p className="sm:col-span-3 text-xs text-[var(--cs-error)]">
                {profileError}
              </p>
            )}
            <div className="sm:col-span-3 flex justify-end">
              <RippleButton
                type="submit"
                variant="primary"
                disabled={savingProfile}
              >
                {savingProfile ? 'Saving...' : 'Save Changes'}
              </RippleButton>
            </div>
          </form>
        )}
      </TonalCard>

      {/* Vehicles */}
      <TonalCard className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-display text-lg font-semibold">
            02. Your Cloud Garage ({vehicles.length})
          </h2>
          <RippleButton
            variant="tonal"
            size="sm"
            onClick={() => setShowNewVehicle((v) => !v)}
          >
            <Plus className="w-4 h-4" />
            <span>{showNewVehicle ? 'Cancel' : 'Add Custom EV'}</span>
          </RippleButton>
        </div>

        {vehicles.length === 0 ? (
          <div className="p-5 rounded-[18px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] space-y-4">
            <p className="text-sm text-[var(--cs-text)] font-medium">
              No vehicles registered in your garage yet. Add a custom EV or start from an Indian EV spec template:
            </p>
            <div className="flex flex-wrap gap-2">
              {SEED_VEHICLES.map((tpl, idx) => (
                <RippleButton
                  key={tpl.id}
                  variant="tonal"
                  size="sm"
                  disabled={savingVeh}
                  onClick={() => void handleAddTemplate(idx)}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>
                    {tpl.make} {tpl.model} ({tpl.usableKwh} kWh)
                  </span>
                </RippleButton>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vehicles.map((veh) => {
                const isSelected = activeVehicle?.id === veh.id;
                return (
                  <div
                    key={veh.id}
                    className={`p-4 rounded-[18px] border transition-colors space-y-2 ${
                      isSelected
                        ? 'bg-[var(--cs-primary-container)] border-[var(--cs-primary)]'
                        : 'bg-[var(--cs-surface-2)] border-[var(--cs-outline)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveVehicle(veh.id)}
                        className="text-left flex-1 cursor-pointer"
                      >
                        <p className="font-display text-base font-semibold text-[var(--cs-text)]">
                          {veh.make} {veh.model}
                        </p>
                        <p className="text-xs text-[var(--cs-muted)]">
                          {veh.variant} · {veh.registrationNumber}
                        </p>
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        {isSelected && (
                          <Check className="w-4 h-4 text-[var(--cs-primary)]" />
                        )}
                        <button
                          type="button"
                          onClick={() => void removeVehicle(veh.id)}
                          aria-label={`Delete ${veh.make} ${veh.model}`}
                          className="min-h-[30px] min-w-[30px] inline-flex items-center justify-center rounded-[8px] text-[var(--cs-muted)] hover:text-[var(--cs-error)] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveVehicle(veh.id)}
                      className="w-full text-left pt-2 border-t border-[var(--cs-outline)] grid grid-cols-2 gap-2 text-xs tabular-nums cursor-pointer"
                    >
                      <div>
                        <span className="text-[var(--cs-muted)] block">Usable Pack</span>
                        <span className="font-medium text-[var(--cs-text)]">
                          {veh.usableKwh} kWh
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--cs-muted)] block">Efficiency</span>
                        <span className="font-medium text-[var(--cs-text)]">
                          {veh.efficiencyWhPerKm} Wh/km
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--cs-muted)] block">Connectors</span>
                        <span className="font-medium text-[var(--cs-text)]">
                          {veh.connectors.join(', ')}
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--cs-muted)] block">Max DC / AC</span>
                        <span className="font-medium text-[var(--cs-text)]">
                          {veh.maxDcChargeKw} / {veh.maxAcChargeKw} kW
                        </span>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--cs-muted)]">
              <span>Quick-add Indian EV preset:</span>
              {SEED_VEHICLES.map((tpl, idx) => (
                <button
                  key={tpl.id}
                  type="button"
                  disabled={savingVeh}
                  onClick={() => void handleAddTemplate(idx)}
                  className="px-2.5 py-1.5 rounded-[10px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] hover:border-[var(--cs-primary)] text-[var(--cs-text)] cursor-pointer"
                >
                  + {tpl.make} {tpl.model}
                </button>
              ))}
            </div>
          </div>
        )}

        {showNewVehicle && (
          <form
            onSubmit={handleAddVehicle}
            className="pt-4 border-t border-[var(--cs-outline)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            <div>
              <label className="block text-xs font-medium text-[var(--cs-muted)] mb-1">
                Make
              </label>
              <input
                type="text"
                required
                value={make}
                onChange={(e) => setMake(e.target.value)}
                placeholder="e.g. Tata"
                className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--cs-muted)] mb-1">
                Model
              </label>
              <input
                type="text"
                required
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. Curvv.ev"
                className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--cs-muted)] mb-1">
                Variant
              </label>
              <input
                type="text"
                required
                value={variant}
                onChange={(e) => setVariant(e.target.value)}
                placeholder="e.g. Accomplished 55"
                className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--cs-muted)] mb-1">
                Registration Number
              </label>
              <input
                type="text"
                required
                value={regNo}
                onChange={(e) => setRegNo(e.target.value)}
                className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--cs-muted)] mb-1">
                Usable Battery (kWh)
              </label>
              <input
                type="number"
                step="0.1"
                required
                value={usableKwh}
                onChange={(e) => setUsableKwh(Number(e.target.value))}
                className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--cs-muted)] mb-1">
                Baseline Efficiency (Wh/km)
              </label>
              <input
                type="number"
                required
                value={efficiencyWhPerKm}
                onChange={(e) => setEfficiencyWhPerKm(Number(e.target.value))}
                className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--cs-muted)] mb-1">
                Max DC Power (kW)
              </label>
              <input
                type="number"
                step="0.5"
                required
                value={maxDcKw}
                onChange={(e) => setMaxDcKw(Number(e.target.value))}
                className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--cs-muted)] mb-1">
                Max AC Power (kW)
              </label>
              <input
                type="number"
                step="0.1"
                required
                value={maxAcKw}
                onChange={(e) => setMaxAcKw(Number(e.target.value))}
                className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--cs-muted)] mb-1">
                Model Year
              </label>
              <input
                type="number"
                required
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm tabular-nums"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <span className="block text-xs font-medium text-[var(--cs-muted)] mb-2">
                Supported Connectors
              </span>
              <div className="flex flex-wrap gap-2">
                {ALL_CONNECTORS.map((conn) => {
                  const active = connectors.includes(conn);
                  return (
                    <button
                      key={conn}
                      type="button"
                      onClick={() => toggleConnector(conn)}
                      className={`min-h-[40px] px-4 rounded-[12px] text-xs font-medium border cursor-pointer transition-colors ${
                        active
                          ? 'bg-[var(--cs-primary)] text-[var(--cs-primary-ink)] border-[var(--cs-primary)]'
                          : 'bg-[var(--cs-surface-2)] text-[var(--cs-muted)] border-[var(--cs-outline)]'
                      }`}
                    >
                      {conn}
                    </button>
                  );
                })}
              </div>
            </div>

            {vehError && (
              <p className="sm:col-span-2 lg:col-span-3 text-xs text-[var(--cs-error)]">
                {vehError}
              </p>
            )}

            <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
              <RippleButton type="submit" variant="primary" disabled={savingVeh}>
                {savingVeh ? 'Saving...' : 'Save & Activate Vehicle'}
              </RippleButton>
            </div>
          </form>
        )}
      </TonalCard>
    </div>
  );
}
