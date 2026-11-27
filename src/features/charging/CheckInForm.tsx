import { CheckCircle2, AlertCircle } from 'lucide-react';
import React, { useState } from 'react';
import { RippleButton } from '../../components/RippleButton';
import { CheckInInputSchema } from '../../domain/schemas';
import { IssueType } from '../../domain/types';

interface CheckInFormProps {
  stationId: string;
  stationName: string;
  onSubmit: (payload: {
    stationId: string;
    outcome: 'worked' | 'not_working';
    issueType: IssueType;
    comment: string;
  }) => Promise<void>;
}

const ISSUE_OPTIONS: { value: IssueType; label: string }[] = [
  { value: 'charger_offline', label: 'Charger Offline / Blank Screen' },
  { value: 'payment_failed', label: 'App / UPI / RFID Auth Failed' },
  { value: 'slow_speed', label: 'Throttled / Slow Charging Speed' },
  { value: 'connector_damaged', label: 'Connector Gun Damaged / Fault' },
  { value: 'occupied_ice', label: 'Bay Blocked / ICEd' },
];

export function CheckInForm({
  stationId,
  stationName,
  onSubmit,
}: CheckInFormProps) {
  const [outcome, setOutcome] = useState<'worked' | 'not_working'>('worked');
  const [issueType, setIssueType] = useState<IssueType>('none');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const resolvedIssue: IssueType =
      outcome === 'worked'
        ? 'none'
        : issueType === 'none'
        ? 'charger_offline'
        : issueType;

    const parsed = CheckInInputSchema.safeParse({
      stationId,
      outcome,
      issueType: resolvedIssue,
      comment,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid check-in input');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        stationId: parsed.data.stationId,
        outcome: parsed.data.outcome,
        issueType: parsed.data.issueType,
        comment:
          parsed.data.comment ||
          (outcome === 'worked'
            ? 'Session started cleanly and delivered expected output.'
            : 'Reported charging issue at station.'),
      });
      setComment('');
      setIssueType('none');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not submit check-in.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="pt-4 border-t border-[var(--cs-outline)] space-y-3"
    >
      <div>
        <h4 className="text-sm font-semibold text-[var(--cs-text)]">
          Submit Driver Check-In
        </h4>
        <p className="text-xs text-[var(--cs-muted)] mt-0.5">
          Check-ins immediately recalculate Bayesian reliability for {stationName}.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            setOutcome('worked');
            setIssueType('none');
          }}
          className={`min-h-[42px] px-3 rounded-[14px] border text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
            outcome === 'worked'
              ? 'bg-[var(--cs-primary-container)] text-[var(--cs-primary)] border-[var(--cs-primary)]'
              : 'bg-[var(--cs-surface-2)] text-[var(--cs-muted)] border-[var(--cs-outline)]'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Worked</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setOutcome('not_working');
            if (issueType === 'none') setIssueType('charger_offline');
          }}
          className={`min-h-[42px] px-3 rounded-[14px] border text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
            outcome === 'not_working'
              ? 'bg-[var(--cs-error-container)] text-[var(--cs-error)] border-[var(--cs-error)]'
              : 'bg-[var(--cs-surface-2)] text-[var(--cs-muted)] border-[var(--cs-outline)]'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          <span>Not Working</span>
        </button>
      </div>

      {outcome === 'not_working' && (
        <div>
          <label
            htmlFor="checkin-issue"
            className="block text-xs font-medium text-[var(--cs-muted)] mb-1"
          >
            Issue Type
          </label>
          <select
            id="checkin-issue"
            value={issueType === 'none' ? 'charger_offline' : issueType}
            onChange={(e) => setIssueType(e.target.value as IssueType)}
            className="w-full min-h-[40px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-xs text-[var(--cs-text)]"
          >
            {ISSUE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label
          htmlFor="checkin-comment"
          className="block text-xs font-medium text-[var(--cs-muted)] mb-1"
        >
          Observation Note (optional)
        </label>
        <input
          id="checkin-comment"
          type="text"
          maxLength={240}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={
            outcome === 'worked'
              ? 'e.g. Bay 2 delivered 58 kW cleanly via UPI'
              : 'e.g. Connector latch stuck or screen unresponsive'
          }
          className="w-full min-h-[40px] px-3 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-xs text-[var(--cs-text)]"
        />
      </div>

      {error && <p className="text-xs text-[var(--cs-error)]">{error}</p>}

      <RippleButton
        type="submit"
        variant={outcome === 'worked' ? 'primary' : 'danger'}
        size="sm"
        disabled={submitting}
        className="w-full"
      >
        {submitting ? 'Updating Reliability...' : 'Record Check-In'}
      </RippleButton>
    </form>
  );
}
