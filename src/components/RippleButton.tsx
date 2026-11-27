import React, { useState } from 'react';

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
}

interface RippleButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tonal' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'car';
  children: React.ReactNode;
}

export function RippleButton({
  variant = 'primary',
  size = 'md',
  className = '',
  onClick,
  children,
  disabled,
  type = 'button',
  ...rest
}: RippleButtonProps) {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const sizePx = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - sizePx / 2;
    const y = e.clientY - rect.top - sizePx / 2;
    const id = Date.now() + Math.random();
    setRipples((prev) => [...prev, { id, x, y, size: sizePx }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 500);
    onClick?.(e);
  };

  const variantClasses = {
    primary:
      'bg-[var(--cs-primary)] text-[var(--cs-primary-ink)] hover:brightness-105',
    secondary:
      'bg-[var(--cs-secondary-container)] text-[var(--cs-secondary)] border border-[var(--cs-outline)] hover:brightness-110',
    tonal:
      'bg-[var(--cs-surface-2)] text-[var(--cs-text)] border border-[var(--cs-outline)] hover:bg-[var(--cs-surface-3)]',
    ghost:
      'bg-transparent text-[var(--cs-muted)] hover:text-[var(--cs-text)] hover:bg-[var(--cs-surface-2)]',
    danger:
      'bg-[var(--cs-error-container)] text-[var(--cs-error)] border border-[var(--cs-outline)] hover:brightness-110',
  };

  const sizeClasses = {
    sm: 'min-h-[40px] px-3.5 py-1.5 text-xs rounded-[14px]',
    md: 'min-h-[42px] px-4 py-2 text-sm rounded-[16px]',
    lg: 'min-h-[48px] px-6 py-2.5 text-sm rounded-[18px]',
    car: 'min-h-[56px] px-7 py-3.5 text-base rounded-[20px]',
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={handleClick}
      className={`relative overflow-hidden inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap shrink-0 cursor-pointer select-none transition-all duration-150 active:scale-[0.98] disabled:opacity-45 disabled:pointer-events-none ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...rest}
    >
      {ripples.map((r) => (
        <span
          key={r.id}
          aria-hidden="true"
          className="cs-ripple-circle"
          style={{
            width: r.size,
            height: r.size,
            left: r.x,
            top: r.y,
          }}
        />
      ))}
      <span className="relative z-10 inline-flex items-center gap-2">
        {children}
      </span>
    </button>
  );
}
