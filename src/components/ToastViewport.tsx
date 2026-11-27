import { X } from 'lucide-react';
import React from 'react';
import { useAppStore } from '../store/useAppStore';

export function ToastViewport() {
  const toasts = useAppStore((s) => s.toasts);
  const dismissToast = useAppStore((s) => s.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 md:bottom-5 right-4 z-50 flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)]"
    >
      {toasts.map((toast) => {
        const toneColor =
          toast.tone === 'success'
            ? 'text-[var(--cs-primary)]'
            : toast.tone === 'warning'
            ? 'text-[var(--cs-warning)]'
            : toast.tone === 'error'
            ? 'text-[var(--cs-error)]'
            : 'text-[var(--cs-secondary)]';

        return (
          <div
            key={toast.id}
            role="status"
            className="flex items-start justify-between gap-3 rounded-[18px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline-strong)] px-4 py-3 shadow-lg"
          >
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${toneColor}`}>{toast.title}</p>
              {toast.detail && (
                <p className="text-xs text-[var(--cs-muted)] mt-0.5">
                  {toast.detail}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="min-h-[32px] min-w-[32px] inline-flex items-center justify-center rounded-lg text-[var(--cs-muted)] hover:text-[var(--cs-text)] hover:bg-[var(--cs-surface-3)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
