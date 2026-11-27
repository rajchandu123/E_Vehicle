import React from 'react';

interface SocRingProps {
  socPercent: number;
  likelyKm: number;
  minKm: number;
  maxKm: number;
  size?: number;
}

export function SocRing({
  socPercent,
  likelyKm,
  minKm,
  maxKm,
  size = 188,
}: SocRingProps) {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, socPercent));
  const dashOffset = circumference * (1 - clamped / 100);

  const ringColor =
    clamped <= 15
      ? 'var(--cs-error)'
      : clamped <= 30
      ? 'var(--cs-warning)'
      : 'var(--cs-primary)';

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Battery ${clamped}% state of charge, estimated ${likelyKm} km likely range (${minKm} to ${maxKm} km)`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--cs-surface-3)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-all duration-300"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3">
        <span className="text-xs font-medium text-[var(--cs-muted)]">
          State of Charge
        </span>
        <span className="font-display text-4xl font-bold tracking-tight tabular-nums text-[var(--cs-text)] mt-0.5">
          {clamped}%
        </span>
        <span className="text-xs font-medium tabular-nums text-[var(--cs-primary)] mt-1">
          {likelyKm} km likely
        </span>
        <span className="text-[11px] tabular-nums text-[var(--cs-muted)]">
          {minKm}–{maxKm} km band
        </span>
      </div>
    </div>
  );
}
