import {
  BatteryCharging,
  BellRing,
  Car,
  Lock,
  ShieldAlert,
  Thermometer,
  Unlock,
  Zap,
} from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DemoLabel } from '../../components/DemoBadge';
import { M3Switch } from '../../components/M3Switch';
import { RippleButton } from '../../components/RippleButton';
import { TonalCard } from '../../components/TonalCard';
import { DriveMode, SimulatedVehicleControls } from '../../domain/types';
import { useAppStore } from '../../store/useAppStore';

export function VehicleControlPage() {
  const navigate = useNavigate();
  const { activeVehicle, controls, updateControl, addToast } = useAppStore();

  const triggerHornLights = () => {
    updateControl({ hornLightsActive: true });
    addToast({
      title: 'Simulated horn & hazard flash triggered',
      detail: 'Hardware telemetry is simulated in the browser.',
      tone: 'info',
    });
    setTimeout(() => {
      updateControl({ hornLightsActive: false });
    }, 2000);
  };

  if (!activeVehicle) {
    return (
      <TonalCard className="max-w-lg space-y-3">
        <h1 className="font-display text-xl font-bold">No Active EV Selected</h1>
        <p className="text-sm text-[var(--cs-muted)]">
          Add a vehicle in Profile &amp; EV Setup to preview the simulated cockpit controls.
        </p>
        <RippleButton variant="primary" onClick={() => navigate('/onboarding')}>
          Go to Profile &amp; EV Setup
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
            <DemoLabel kind="simulated" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mt-1">
            Vehicle Control Cockpit (Simulated Hardware)
          </h1>
          <p className="text-sm text-[var(--cs-muted)] mt-1 max-w-2xl">
            Browsers cannot connect directly to an OEM CAN-bus or V2G inverter. All toggles below run on ChargeSense&apos;s deterministic state machine with safety guardrails.
          </p>
        </div>

        <RippleButton variant="tonal" onClick={() => navigate('/about')}>
          Why Simulated?
        </RippleButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Access & Security */}
        <TonalCard className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold flex items-center gap-2">
              {controls.locked ? (
                <Lock className="w-4 h-4 text-[var(--cs-primary)]" />
              ) : (
                <Unlock className="w-4 h-4 text-[var(--cs-warning)]" />
              )}
              <span>Access &amp; Sentry</span>
            </h2>
            <DemoLabel kind="simulated" />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <RippleButton
              variant={controls.locked ? 'primary' : 'tonal'}
              onClick={() => updateControl({ locked: true })}
            >
              Lock Doors
            </RippleButton>
            <RippleButton
              variant={!controls.locked ? 'secondary' : 'tonal'}
              onClick={() => updateControl({ locked: false })}
            >
              Unlock Doors
            </RippleButton>
          </div>

          <M3Switch
            checked={controls.sentryArmed}
            onChange={(checked) => updateControl({ sentryArmed: checked })}
            label="Sentry Camera Perimeter"
            description="Simulated guard state"
          />

          <M3Switch
            checked={controls.valetMode}
            onChange={(checked) => updateControl({ valetMode: checked })}
            label="Valet Speed Cap Mode"
            description="Guardrail: forces Eco drive mode"
          />

          <RippleButton
            variant="tonal"
            className="w-full"
            onClick={triggerHornLights}
          >
            <BellRing className="w-4 h-4" />
            <span>
              {controls.hornLightsActive ? 'Flashing Hazards...' : 'Flash Lights & Chime'}
            </span>
          </RippleButton>
        </TonalCard>

        {/* Climate & Drive Dynamics */}
        <TonalCard className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-[var(--cs-primary)]" />
              <span>Cabin &amp; Drivetrain</span>
            </h2>
            <DemoLabel kind="simulated" />
          </div>

          <M3Switch
            checked={controls.climatePreconditioning}
            onChange={(checked) =>
              updateControl({ climatePreconditioning: checked })
            }
            label="Cabin Pre-Conditioning"
            description={`Target ${controls.targetCabinTempC}°C`}
          />

          <div>
            <div className="flex justify-between text-xs mb-1 tabular-nums">
              <span className="text-[var(--cs-muted)]">Target Cabin Temp</span>
              <span className="font-semibold">{controls.targetCabinTempC}°C</span>
            </div>
            <input
              type="range"
              min={18}
              max={28}
              value={controls.targetCabinTempC}
              onChange={(e) =>
                updateControl({ targetCabinTempC: Number(e.target.value) })
              }
              className="w-full accent-[var(--cs-primary)] cursor-pointer"
            />
          </div>

          <div>
            <span className="block text-xs text-[var(--cs-muted)] mb-1.5">
              Drive Mode {controls.valetMode ? '(Locked to Eco by Valet)' : ''}
            </span>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-[14px] bg-[var(--cs-surface-2)]">
              {(['eco', 'city', 'sport'] as DriveMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  disabled={controls.valetMode && mode !== 'eco'}
                  onClick={() => updateControl({ driveMode: mode })}
                  className={`min-h-[36px] rounded-[10px] text-xs font-medium capitalize cursor-pointer disabled:opacity-40 ${
                    controls.driveMode === mode
                      ? 'bg-[var(--cs-primary)] text-[var(--cs-primary-ink)]'
                      : 'text-[var(--cs-muted)]'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="block text-xs text-[var(--cs-muted)] mb-1.5">
              Regenerative Braking
            </span>
            <select
              value={controls.regenLevel}
              onChange={(e) =>
                updateControl({
                  regenLevel: e.target.value as SimulatedVehicleControls['regenLevel'],
                })
              }
              className="w-full min-h-[40px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-xs"
            >
              <option value="low">Low (Coasting)</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="one_pedal">One-Pedal Drive</option>
            </select>
          </div>
        </TonalCard>

        {/* Charging Limit, Geofence & Bidirectional V2L/V2G */}
        <TonalCard className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold flex items-center gap-2">
              <BatteryCharging className="w-4 h-4 text-[var(--cs-primary)]" />
              <span>Energy &amp; V2X Hardware</span>
            </h2>
            <DemoLabel kind="simulated" />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1 tabular-nums">
              <span className="text-[var(--cs-muted)]">AC/DC Charge Limit</span>
              <span className="font-semibold text-[var(--cs-primary)]">
                {controls.chargeLimitPercent}%
              </span>
            </div>
            <input
              type="range"
              min={50}
              max={100}
              step={5}
              value={controls.chargeLimitPercent}
              onChange={(e) =>
                updateControl({ chargeLimitPercent: Number(e.target.value) })
              }
              className="w-full accent-[var(--cs-primary)] cursor-pointer"
            />
          </div>

          <M3Switch
            checked={controls.geofenceEnabled}
            onChange={(checked) => updateControl({ geofenceEnabled: checked })}
            label="Corridor Geofence Alert"
            description={`${controls.geofenceRadiusKm} km radius`}
          />

          <M3Switch
            checked={controls.v2lEnabled}
            onChange={(checked) => updateControl({ v2lEnabled: checked })}
            label="Vehicle-to-Load (V2L 3.3 kW)"
            description="Mutually exclusive with V2G"
          />

          <M3Switch
            checked={controls.v2gEnabled}
            onChange={(checked) => updateControl({ v2gEnabled: checked })}
            label="Vehicle-to-Grid (V2G)"
            description="Automatically disables V2L"
          />

          <div className="p-3 rounded-[14px] bg-[var(--cs-surface-2)] text-xs text-[var(--cs-muted)] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5" />
              Firmware
            </span>
            <span className="font-mono text-[var(--cs-text)]">{controls.otaVersion}</span>
          </div>
        </TonalCard>
      </div>

      <TonalCard tone="surface-2" padding="sm" className="flex items-start gap-3 text-xs text-[var(--cs-muted)]">
        <ShieldAlert className="w-4 h-4 text-[var(--cs-secondary)] shrink-0 mt-0.5" />
        <span>
          <strong className="text-[var(--cs-text)]">Honest Hardware Boundary:</strong>{' '}
          Physical door actuators, HVAC compressors, BMS charge relays, and V2G inverters require OEM telematics APIs. Changing Drive Mode above also updates your live Range Estimator calculations.
        </span>
      </TonalCard>
    </div>
  );
}
