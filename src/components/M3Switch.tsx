import React from 'react';

interface M3SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  id?: string;
}

export function M3Switch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  id,
}: M3SwitchProps) {
  const switchId = id ?? `switch-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="flex items-center justify-between gap-4 min-h-[44px]">
      <div className="min-w-0">
        <label
          htmlFor={switchId}
          className="block text-sm font-medium text-[var(--cs-text)] cursor-pointer"
        >
          {label}
        </label>
        {description && (
          <p className="text-xs text-[var(--cs-muted)] mt-0.5">{description}</p>
        )}
      </div>

      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-8 w-[52px] shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors duration-150 disabled:opacity-45 disabled:pointer-events-none ${
          checked
            ? 'bg-[var(--cs-primary)] border-[var(--cs-primary)]'
            : 'bg-[var(--cs-surface-3)] border-[var(--cs-outline-strong)]'
        }`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block rounded-full transition-transform duration-150 ${
            checked
              ? 'h-6 w-6 translate-x-[22px] bg-[var(--cs-primary-ink)]'
              : 'h-4 w-4 translate-x-1 bg-[var(--cs-muted)]'
          }`}
        />
      </button>
    </div>
  );
}
