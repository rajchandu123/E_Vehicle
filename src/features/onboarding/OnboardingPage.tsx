import { Check, Plus, UserCheck } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DemoLabel } from '../../components/DemoBadge';
import { RippleButton } from '../../components/RippleButton';
import { TonalCard } from '../../components/TonalCard';
import { UserProfileInputSchema, VehicleInputSchema } from '../../domain/schemas';
import { ConnectorType } from '../../domain/types';
import { useAppStore } from '../../store/useAppStore';

const ALL_CONNECTORS: ConnectorType[] = ['CCS2', 'Type 2', 'CHAdeMO', 'GB/T'];

export function OnboardingPage() {
  const navigate = useNavigate();
  const {
    users,
    activeUser,
    setActiveUser,
    createUserAndSetActive,
    vehicles,
    activeVehicle,
    setActiveVehicle,
    addVehicleAndSelect,
  } = useAppStore();

  const [showNewUser, setShowNewUser] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userCity, setUserCity] = useState('Bengaluru');
  const [safetyBuffer, setSafetyBuffer] = useState(20);
  const [userError, setUserError] = useState<string | null>(null);

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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError(null);
    const parsed = UserProfileInputSchema.safeParse({
      name: userName,
      email: userEmail,
      city: userCity,
      preferredSafetyBufferPercent: Number(safetyBuffer),
    });
    if (!parsed.success) {
      setUserError(parsed.error.issues[0]?.message ?? 'Invalid profile fields');
      return;
    }
    await createUserAndSetActive({
      ...parsed.data,
      preferredPreset: 'balanced',
      units: 'metric',
    });
    setShowNewUser(false);
    setUserName('');
    setUserEmail('');
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
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[var(--cs-muted)]">
            <span>Profile &amp; Garage Setup</span>
            <span aria-hidden="true">·</span>
            <DemoLabel kind="demo" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mt-1">
            Driver Profile &amp; Active EV
          </h1>
          <p className="text-sm text-[var(--cs-muted)] mt-1">
            Select a seeded demo profile or add your own vehicle specs to drive
            range bands and connector compatibility.
          </p>
        </div>

        <RippleButton variant="primary" onClick={() => navigate('/app')}>
          Continue to Overview
        </RippleButton>
      </div>

      {/* Driver Profiles */}
      <TonalCard className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <UserCheck className="w-5 h-5 text-[var(--cs-primary)]" />
            <h2 className="font-display text-lg font-semibold">
              01. Driver Profile
            </h2>
          </div>
          <RippleButton
            variant="tonal"
            size="sm"
            onClick={() => setShowNewUser((v) => !v)}
          >
            <Plus className="w-4 h-4" />
            <span>{showNewUser ? 'Cancel' : 'Create Profile'}</span>
          </RippleButton>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {users.map((u) => {
            const isSelected = activeUser?.id === u.id;
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => setActiveUser(u.id)}
                className={`text-left p-4 rounded-[16px] border transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--cs-primary-container)] border-[var(--cs-primary)]'
                    : 'bg-[var(--cs-surface-2)] border-[var(--cs-outline)] hover:border-[var(--cs-outline-strong)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm text-[var(--cs-text)]">
                    {u.name}
                  </span>
                  {isSelected && (
                    <Check className="w-4 h-4 text-[var(--cs-primary)] shrink-0" />
                  )}
                </div>
                <p className="text-xs text-[var(--cs-muted)] mt-1">
                  {u.city} · {u.preferredSafetyBufferPercent}% reserve
                </p>
                <p className="text-xs text-[var(--cs-muted)] truncate mt-0.5">
                  {u.email}
                </p>
              </button>
            );
          })}
        </div>

        {showNewUser && (
          <form
            onSubmit={handleCreateUser}
            className="pt-4 border-t border-[var(--cs-outline)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <div>
              <label className="block text-xs font-medium text-[var(--cs-muted)] mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="e.g. Rohan Kulkarni"
                className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm text-[var(--cs-text)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--cs-muted)] mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="rohan@example.in"
                className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm text-[var(--cs-text)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--cs-muted)] mb-1">
                Home City
              </label>
              <input
                type="text"
                required
                value={userCity}
                onChange={(e) => setUserCity(e.target.value)}
                className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm text-[var(--cs-text)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--cs-muted)] mb-1">
                Safety Buffer ({safetyBuffer}%)
              </label>
              <input
                type="number"
                min={5}
                max={40}
                value={safetyBuffer}
                onChange={(e) => setSafetyBuffer(Number(e.target.value))}
                className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm tabular-nums text-[var(--cs-text)]"
              />
            </div>

            {userError && (
              <p className="sm:col-span-2 lg:col-span-4 text-xs text-[var(--cs-error)]">
                {userError}
              </p>
            )}
            <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
              <RippleButton type="submit" variant="primary">
                Save Profile
              </RippleButton>
            </div>
          </form>
        )}
      </TonalCard>

      {/* Vehicles */}
      <TonalCard className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-lg font-semibold">
            02. Select or Add Electric Vehicle
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((veh) => {
            const isSelected = activeVehicle?.id === veh.id;
            return (
              <button
                key={veh.id}
                type="button"
                onClick={() => setActiveVehicle(veh.id)}
                className={`text-left p-4 rounded-[18px] border transition-colors cursor-pointer space-y-2 ${
                  isSelected
                    ? 'bg-[var(--cs-primary-container)] border-[var(--cs-primary)]'
                    : 'bg-[var(--cs-surface-2)] border-[var(--cs-outline)] hover:border-[var(--cs-outline-strong)]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-base font-semibold text-[var(--cs-text)]">
                      {veh.make} {veh.model}
                    </p>
                    <p className="text-xs text-[var(--cs-muted)]">
                      {veh.variant}
                    </p>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-[var(--cs-primary)] shrink-0 mt-1" />
                  )}
                </div>

                <div className="pt-2 border-t border-[var(--cs-outline)] grid grid-cols-2 gap-2 text-xs tabular-nums">
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
                </div>
              </button>
            );
          })}
        </div>

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
              <RippleButton type="submit" variant="primary">
                Save &amp; Activate Vehicle
              </RippleButton>
            </div>
          </form>
        )}
      </TonalCard>
    </div>
  );
}
