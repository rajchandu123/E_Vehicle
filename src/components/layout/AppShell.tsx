import {
  BatteryCharging,
  Car,
  Compass,
  FileCheck2,
  HeartPulse,
  Home,
  Info,
  LogOut,
  MessageSquare,
  Monitor,
  Moon,
  Route,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sun,
  TrendingUp,
  Wrench,
  Zap,
} from 'lucide-react';
import React from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutMode, useAppStore } from '../../store/useAppStore';
import { DemoLabel } from '../DemoBadge';
import { RippleButton } from '../RippleButton';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  phase: 1 | 2;
}

const PRIMARY_NAV: NavItem[] = [
  { to: '/app', label: 'Home', icon: Home, phase: 1 },
  { to: '/app/charging', label: 'Charging', icon: Zap, phase: 1 },
  { to: '/app/trips', label: 'Trips', icon: Route, phase: 2 },
  { to: '/app/control', label: 'Control', icon: Car, phase: 2 },
  { to: '/app/health', label: 'Battery', icon: HeartPulse, phase: 2 },
  { to: '/app/services', label: 'Services', icon: Wrench, phase: 2 },
  { to: '/app/insurance', label: 'Claims', icon: ShieldCheck, phase: 2 },
  { to: '/app/passport', label: 'Passport', icon: FileCheck2, phase: 2 },
  { to: '/app/analytics', label: 'Analytics', icon: TrendingUp, phase: 2 },
  { to: '/app/assistant', label: 'Assistant', icon: MessageSquare, phase: 2 },
];

const SECONDARY_NAV: NavItem[] = [
  { to: '/onboarding', label: 'Profile & EV', icon: BatteryCharging, phase: 1 },
  { to: '/about', label: 'About & Limits', icon: Info, phase: 1 },
  { to: '/app/settings', label: 'Settings', icon: Settings, phase: 2 },
  { to: '/app/admin', label: 'Admin', icon: ShieldAlert, phase: 2 },
];

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    theme,
    setTheme,
    layoutMode,
    setLayoutMode,
    activeUser,
    activeVehicle,
    rangeInput,
    rangeBand,
    trigger55PercentDemo,
    logoutAccount,
  } = useAppStore();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const cycleLayout = (mode: LayoutMode) => {
    setLayoutMode(mode);
  };

  const handleLogout = async () => {
    await logoutAccount();
    navigate('/auth?mode=login', { replace: true });
  };

  const userInitials = (activeUser?.name ?? 'EV')
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // In-Vehicle Car Mode: landscape cockpit layout with oversized touch targets & minimal text
  if (layoutMode === 'car') {
    const carNav = [
      { to: '/app', label: 'Overview', icon: Home },
      { to: '/app/charging', label: 'Chargers', icon: Zap },
      { to: '/app/trips', label: 'Mysuru Route', icon: Compass },
      { to: '/app/control', label: 'Vehicle', icon: Car },
      { to: '/app/assistant', label: 'Assistant', icon: MessageSquare },
    ];

    return (
      <div className="min-h-screen bg-[var(--cs-surface)] text-[var(--cs-text)] flex flex-col">
        <header className="flex items-center justify-between gap-4 px-6 py-3.5 border-b border-[var(--cs-outline)] bg-[var(--cs-surface-1)]">
          <div className="flex items-center gap-4 min-w-0">
            <span className="font-display text-xl font-bold tracking-tight whitespace-nowrap shrink-0">
              ChargeSense
            </span>
            <span className="text-sm text-[var(--cs-muted)] truncate">
              {activeVehicle
                ? `${activeVehicle.make} ${activeVehicle.model}`
                : 'No EV selected'}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-[16px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] font-display tabular-nums">
              <span className="text-lg font-bold text-[var(--cs-primary)]">
                {rangeInput.socPercent}%
              </span>
              <span className="text-sm text-[var(--cs-muted)]">
                {rangeBand ? `${rangeBand.minKm}–${rangeBand.maxKm} km` : '--'}
              </span>
            </div>
            <RippleButton
              variant="tonal"
              size="car"
              onClick={() => cycleLayout('desktop')}
              aria-label="Exit Car Mode"
            >
              <Monitor className="w-5 h-5" />
              <span>Exit Car Mode</span>
            </RippleButton>
            <RippleButton
              variant="danger"
              size="car"
              onClick={handleLogout}
              aria-label="Sign out"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </RippleButton>
          </div>
        </header>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[240px_1fr]">
          <nav
            aria-label="Car mode navigation"
            className="p-4 border-b lg:border-b-0 lg:border-r border-[var(--cs-outline)] bg-[var(--cs-surface-1)] flex lg:flex-col gap-3 overflow-x-auto"
          >
            {carNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/app'}
                  className={({ isActive }) =>
                    `min-h-[58px] px-5 rounded-[20px] flex items-center gap-3.5 text-base font-semibold whitespace-nowrap shrink-0 transition-colors ${
                      isActive
                        ? 'bg-[var(--cs-primary)] text-[var(--cs-primary-ink)]'
                        : 'bg-[var(--cs-surface-2)] text-[var(--cs-text)] hover:bg-[var(--cs-surface-3)]'
                    }`
                  }
                >
                  <Icon className="w-6 h-6 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
            <RippleButton
              variant="secondary"
              size="car"
              className="lg:mt-auto"
              onClick={trigger55PercentDemo}
            >
              <span>55% Demo</span>
            </RippleButton>
          </nav>

          <main className="p-5 sm:p-8 max-w-6xl w-full mx-auto cs-page-enter">
            <Outlet />
          </main>
        </div>
      </div>
    );
  }

  // Mobile preview shell (forced mobile or <768px viewport)
  const isForcedMobile = layoutMode === 'mobile';

  return (
    <div
      className={`min-h-screen bg-[var(--cs-surface)] text-[var(--cs-text)] flex ${
        isForcedMobile ? 'justify-center bg-[var(--cs-surface-2)] py-4' : ''
      }`}
    >
      <div
        className={`flex flex-1 min-h-screen bg-[var(--cs-surface)] ${
          isForcedMobile
            ? 'max-w-[420px] rounded-[28px] border border-[var(--cs-outline-strong)] overflow-hidden shadow-2xl relative flex-col'
            : ''
        }`}
      >
        {/* Desktop Material 3 Navigation Rail + Expandable Sidebar */}
        {!isForcedMobile && (
          <aside
            aria-label="Primary navigation rail"
            className="hidden md:flex flex-col w-[248px] shrink-0 border-r border-[var(--cs-outline)] bg-[var(--cs-surface-1)] px-3 py-4 sticky top-0 h-screen"
          >
            <div className="px-3 pb-4 mb-2 border-b border-[var(--cs-outline)] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="font-display text-lg font-bold tracking-tight text-[var(--cs-text)] hover:text-[var(--cs-primary)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                ChargeSense
              </button>
              <DemoLabel kind="live" />
            </div>

            <nav className="flex-1 overflow-y-auto space-y-1 pr-1">
              {PRIMARY_NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/app'}
                    className={({ isActive }) =>
                      `group flex items-center justify-between gap-2.5 min-h-[42px] px-3.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                        isActive
                          ? 'bg-[var(--cs-primary-container)] text-[var(--cs-primary)]'
                          : 'text-[var(--cs-muted)] hover:text-[var(--cs-text)] hover:bg-[var(--cs-surface-2)]'
                      }`
                    }
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <Icon className="w-[18px] h-[18px] shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </span>
                  </NavLink>
                );
              })}

              <div className="my-3 border-t border-[var(--cs-outline)]" />

              {SECONDARY_NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center justify-between gap-2.5 min-h-[40px] px-3.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                        isActive
                          ? 'bg-[var(--cs-primary-container)] text-[var(--cs-primary)]'
                          : 'text-[var(--cs-muted)] hover:text-[var(--cs-text)] hover:bg-[var(--cs-surface-2)]'
                      }`
                    }
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <Icon className="w-[18px] h-[18px] shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </span>
                  </NavLink>
                );
              })}
            </nav>

            <div className="pt-3 mt-2 border-t border-[var(--cs-outline)] space-y-2.5">
              {/* Profile Section with Sign Out */}
              <div className="p-2.5 rounded-[16px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/app/profile')}
                  className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-full bg-[var(--cs-primary-container)] text-[var(--cs-primary)] font-display text-xs font-bold flex items-center justify-center shrink-0">
                    {userInitials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[var(--cs-text)] truncate group-hover:text-[var(--cs-primary)]">
                      {activeUser?.name ?? 'Driver'}
                    </p>
                    <p className="text-[11px] text-[var(--cs-muted)] truncate">
                      {activeUser?.email ?? 'Profile'}
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sign out"
                  aria-label="Sign out"
                  className="min-h-[34px] min-w-[34px] inline-flex items-center justify-center rounded-[10px] text-[var(--cs-muted)] hover:text-[var(--cs-error)] hover:bg-[var(--cs-error-container)] transition-colors cursor-pointer shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between gap-1 bg-[var(--cs-surface-2)] p-1 rounded-[14px]">
                <button
                  type="button"
                  onClick={() => cycleLayout('desktop')}
                  aria-label="Desktop view"
                  className={`flex-1 min-h-[34px] rounded-[10px] inline-flex items-center justify-center gap-1.5 text-xs font-medium cursor-pointer ${
                    layoutMode === 'desktop'
                      ? 'bg-[var(--cs-surface-1)] text-[var(--cs-text)]'
                      : 'text-[var(--cs-muted)]'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Desk</span>
                </button>
                <button
                  type="button"
                  onClick={() => cycleLayout('mobile')}
                  aria-label="Mobile layout preview"
                  className="flex-1 min-h-[34px] rounded-[10px] inline-flex items-center justify-center gap-1.5 text-xs font-medium text-[var(--cs-muted)] hover:text-[var(--cs-text)] cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Mobile</span>
                </button>
                <button
                  type="button"
                  onClick={() => cycleLayout('car')}
                  aria-label="Car mode layout"
                  className="flex-1 min-h-[34px] rounded-[10px] inline-flex items-center justify-center gap-1.5 text-xs font-medium text-[var(--cs-muted)] hover:text-[var(--cs-text)] cursor-pointer"
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>Car</span>
                </button>
              </div>
            </div>
          </aside>
        )}

        {/* Main Column */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Compact Top Bar (3 zones: context, quick mode/theme controls, 1 primary CTA) */}
          <header className="sticky top-0 z-30 h-[54px] px-4 sm:px-6 border-b border-[var(--cs-outline)] bg-[var(--cs-surface-1)]/90 backdrop-blur-md flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="md:hidden font-display text-base font-bold whitespace-nowrap shrink-0">
                ChargeSense
              </span>
              <span className="hidden md:inline text-sm text-[var(--cs-muted)] truncate">
                {activeVehicle
                  ? `${activeVehicle.make} ${activeVehicle.model} · ${activeVehicle.connectors.join(' / ')}`
                  : 'Bengaluru–Mysuru Pilot'}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isForcedMobile && (
                <button
                  type="button"
                  onClick={() => cycleLayout('desktop')}
                  className="min-h-[36px] px-2.5 rounded-[12px] text-xs font-medium bg-[var(--cs-surface-2)] text-[var(--cs-text)] whitespace-nowrap cursor-pointer"
                >
                  Desktop
                </button>
              )}
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
                className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-[12px] text-[var(--cs-muted)] hover:text-[var(--cs-text)] hover:bg-[var(--cs-surface-2)] cursor-pointer"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </button>

              <RippleButton
                variant="primary"
                size="sm"
                onClick={() => {
                  trigger55PercentDemo();
                  if (!location.pathname.startsWith('/app')) {
                    navigate('/app');
                  }
                }}
              >
                55% Demo
              </RippleButton>
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Sign out"
                title="Sign out"
                className="md:hidden min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-[12px] text-[var(--cs-muted)] hover:text-[var(--cs-error)] hover:bg-[var(--cs-error-container)] cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Content */}
          <main
            className={`flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto cs-page-enter ${
              isForcedMobile ? 'pb-24' : 'pb-24 md:pb-10'
            }`}
          >
            <Outlet />
          </main>

          {/* Mobile Bottom Navigation Bar (<=64px height to honor 15% sticky surface cap) */}
          <nav
            aria-label="Mobile bottom navigation"
            className={`${
              isForcedMobile ? 'sticky bottom-0' : 'md:hidden fixed bottom-0 left-0 right-0'
            } z-40 h-16 bg-[var(--cs-surface-1)]/95 backdrop-blur-md border-t border-[var(--cs-outline)] grid grid-cols-5 items-center px-1`}
          >
            {[
              { to: '/app', label: 'Home', icon: Home },
              { to: '/app/charging', label: 'Charging', icon: Zap },
              { to: '/app/trips', label: 'Trips', icon: Route },
              { to: '/onboarding', label: 'Vehicle', icon: Car },
              { to: '/about', label: 'Limits', icon: Info },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  end={tab.to === '/app'}
                  className={({ isActive }) =>
                    `min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-[14px] text-[10px] font-medium transition-colors ${
                      isActive
                        ? 'text-[var(--cs-primary)]'
                        : 'text-[var(--cs-muted)]'
                    }`
                  }
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
