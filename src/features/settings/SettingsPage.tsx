import { LogOut, Moon, Settings as SettingsIcon, Sun } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DemoLabel } from '../../components/DemoBadge';
import { RippleButton } from '../../components/RippleButton';
import { TonalCard } from '../../components/TonalCard';
import { RecommendationPreset } from '../../domain/types';
import { ThemeMode, useAppStore } from '../../store/useAppStore';

export function SettingsPage() {
  const navigate = useNavigate();
  const {
    theme,
    setTheme,
    activeUser,
    updateSignedInProfile,
    logoutAccount,
    addToast,
  } = useAppStore();

  const [buffer, setBuffer] = useState(
    activeUser?.preferredSafetyBufferPercent ?? 20
  );
  const [preset, setPreset] = useState<RecommendationPreset>(
    activeUser?.preferredPreset ?? 'balanced'
  );
  const [units, setUnits] = useState<'metric' | 'imperial'>(
    activeUser?.units ?? 'metric'
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activeUser) {
      setBuffer(activeUser.preferredSafetyBufferPercent);
      setPreset(activeUser.preferredPreset);
      setUnits(activeUser.units);
    }
  }, [activeUser]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSignedInProfile({
        preferredSafetyBufferPercent: Number(buffer),
        preferredPreset: preset,
        units,
      });
    } catch (err) {
      addToast({
        title: 'Failed to save preferences',
        detail: err instanceof Error ? err.message : 'Error',
        tone: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logoutAccount();
    navigate('/auth?mode=login', { replace: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-[var(--cs-muted)]">
          <span>Workspace &amp; Account Preferences</span>
          <span aria-hidden="true">·</span>
          <DemoLabel kind="cloud" />
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mt-1">
          Settings &amp; Privacy
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TonalCard className="space-y-5">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <SettingsIcon className="w-4 h-4 text-[var(--cs-primary)]" />
            <span>Driver Defaults (Cloud Firestore)</span>
          </h2>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--cs-muted)] mb-1">
                Default Safety Reserve ({buffer}%)
              </label>
              <input
                type="range"
                min={5}
                max={40}
                value={buffer}
                onChange={(e) => setBuffer(Number(e.target.value))}
                className="w-full accent-[var(--cs-primary)] cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--cs-muted)] mb-1">
                Default Charger Ranking Preset
              </label>
              <select
                value={preset}
                onChange={(e) =>
                  setPreset(e.target.value as RecommendationPreset)
                }
                className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm"
              >
                <option value="balanced">Balanced</option>
                <option value="fastest">Fastest</option>
                <option value="cheapest">Cheapest</option>
                <option value="most_reliable">Most Reliable</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--cs-muted)] mb-1">
                Distance Units
              </label>
              <select
                value={units}
                onChange={(e) =>
                  setUnits(e.target.value as 'metric' | 'imperial')
                }
                className="w-full min-h-[42px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm"
              >
                <option value="metric">Metric (km, kWh, °C)</option>
                <option value="imperial">Imperial (mi, kWh, °C)</option>
              </select>
            </div>

            <RippleButton type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Cloud Preferences'}
            </RippleButton>
          </form>
        </TonalCard>

        <TonalCard className="space-y-5">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            {theme === 'dark' ? (
              <Moon className="w-4 h-4 text-[var(--cs-primary)]" />
            ) : (
              <Sun className="w-4 h-4 text-[var(--cs-primary)]" />
            )}
            <span>Appearance &amp; Session</span>
          </h2>

          <div>
            <span className="block text-xs font-medium text-[var(--cs-muted)] mb-2">
              Theme Mode
            </span>
            <div className="grid grid-cols-3 gap-2 p-1 rounded-[14px] bg-[var(--cs-surface-2)]">
              {(['dark', 'light', 'system'] as ThemeMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTheme(mode)}
                  className={`min-h-[38px] rounded-[10px] text-xs font-medium capitalize cursor-pointer ${
                    theme === mode
                      ? 'bg-[var(--cs-primary)] text-[var(--cs-primary-ink)]'
                      : 'text-[var(--cs-muted)]'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--cs-outline)] space-y-3">
            <p className="text-xs text-[var(--cs-muted)]">
              Signed in as <strong className="text-[var(--cs-text)]">{activeUser?.email}</strong>. All vehicle, trip, claim, and passport records are isolated to your Firebase UID.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <RippleButton
                variant="tonal"
                size="sm"
                onClick={() => navigate('/app/profile')}
              >
                Open Profile &amp; Garage
              </RippleButton>
              <RippleButton
                variant="danger"
                size="sm"
                onClick={() => void handleLogout()}
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </RippleButton>
            </div>
          </div>
        </TonalCard>
      </div>
    </div>
  );
}
