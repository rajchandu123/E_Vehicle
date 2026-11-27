import { Bot, Send, Sparkles } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DemoLabel } from '../../components/DemoBadge';
import { RippleButton } from '../../components/RippleButton';
import { TonalCard } from '../../components/TonalCard';
import { SEED_FAQS } from '../../data/seed/records';
import { estimateRange } from '../../domain/range';
import { recommendStations } from '../../domain/recommendation';
import { planTrip, SEEDED_CORRIDORS } from '../../domain/tripPlanner';
import {
  AssistantCitation,
  AssistantStructuredQuery,
  liveApi,
} from '../../services/liveApi';
import { BENGALURU_ORIGIN } from '../../services/orchestrators';
import { useAppStore } from '../../store/useAppStore';

interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  structuredQuery?: AssistantStructuredQuery;
  citations?: AssistantCitation[];
  error?: string;
}

const SAMPLE_PROMPTS = [
  'Find a fast charger on the way to Mysuru under 18 INR/kWh that my car can use.',
  'My battery is 55%, how far can I go right now?',
  'Plan a trip from Bengaluru to Mysuru starting at 55% SoC.',
  'How does ChargeSense calculate station reliability scores?',
];

export function AssistantPage() {
  const navigate = useNavigate();
  const { activeVehicle, stations, serviceCentres, rangeInput, weather } =
    useAppStore();

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Ask about corridor chargers, reachable range, trip stops, or EV policies. Gemini extracts your structured query, ChargeSense runs the deterministic compatibility & range engines on live OpenStreetMap stations, and I cite the exact station IDs used.',
    },
  ]);

  const runAssistant = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || !activeVehicle) return;

    const userTurn: ChatTurn = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };
    setTurns((prev) => [...prev, userTurn]);
    setInput('');
    setSending(true);

    try {
      // Step 1: Server-side Gemini structured query extraction
      const { structuredQuery } = await liveApi.parseAssistantQuery(
        trimmed,
        rangeInput.socPercent
      );

      // Step 2: Deterministic engine execution on live stations & vehicle specs
      const soc =
        structuredQuery.socPercent !== undefined &&
        structuredQuery.socPercent >= 0 &&
        structuredQuery.socPercent <= 100
          ? structuredQuery.socPercent
          : rangeInput.socPercent;

      const evalBand = estimateRange(activeVehicle, {
        ...rangeInput,
        socPercent: soc,
        ambientTempC: weather?.temperatureC ?? rangeInput.ambientTempC,
      });

      const citations: AssistantCitation[] = [];
      let engineSummary = `Vehicle: ${activeVehicle.make} ${activeVehicle.model} (${activeVehicle.connectors.join(
        ', '
      )}, ${activeVehicle.usableKwh} kWh). Range at ${soc}% SoC: ${evalBand.minKm}–${
        evalBand.maxKm
      } km (likely ${evalBand.likelyKm} km). ${evalBand.explanation}`;

      if (structuredQuery.intent === 'find_charger') {
        const recReport = recommendStations(activeVehicle, stations, {
          origin: BENGALURU_ORIGIN,
          rangeBand: evalBand,
          preset: structuredQuery.preset ?? 'balanced',
          maxPriceInr:
            structuredQuery.maxPriceInr && structuredQuery.maxPriceInr > 0
              ? structuredQuery.maxPriceInr
              : undefined,
          minPowerKw:
            structuredQuery.minPowerKw && structuredQuery.minPowerKw > 0
              ? structuredQuery.minPowerKw
              : undefined,
          maxResults: 5,
        });

        engineSummary += `\nStation Engine Summary: ${recReport.summary}`;
        for (const r of recReport.recommendations) {
          citations.push({
            id: r.station.id,
            title: r.station.name,
            detail: `${r.station.corridorSegment}, ${r.distanceKm} km away, ₹${r.station.pricePerKwhInr}/kWh, ${r.effectiveChargeKw} kW max, reliability ${r.reliability.score}/100 (${r.availableCompatibleBays}/${r.totalCompatibleBays} bays). ${r.whyThisOne}`,
          });
        }
      } else if (structuredQuery.intent === 'trip_plan') {
        const src = structuredQuery.sourceLocation || 'Bengaluru';
        const dst = structuredQuery.targetLocation || 'Mysuru';
        let corridor = SEEDED_CORRIDORS[0];
        try {
          const osrmRes = await liveApi.fetchRoute(src, dst);
          corridor = osrmRes.corridor;
        } catch {
          // Use seeded corridor if OSRM unavailable
        }
        const plan = planTrip(
          {
            source: src,
            destination: dst,
            startingSocPercent: soc,
            ambientTempC: weather?.temperatureC ?? rangeInput.ambientTempC,
            preset: structuredQuery.preset ?? 'balanced',
          },
          activeVehicle,
          stations,
          {
            providerName: 'Active Corridor',
            listAvailableRoutes: () => [corridor],
            findRoute: () => corridor,
          }
        );
        engineSummary += `\nTrip Plan: ${plan.narrative}`;
        for (const s of plan.stops) {
          citations.push({
            id: s.station.id,
            title: s.station.name,
            detail: `Stop at km ${s.kmFromStart}, arrive ${s.arrivalSocPercent}% -> depart ${s.departSocPercent}% (${s.chargeDurationMinutes} min, ~₹${s.estimatedCostInr}, reliability ${s.reliabilityScore}/100).`,
          });
        }
      } else if (structuredQuery.intent === 'service_or_faq') {
        const terms = (structuredQuery.keywords || []).map((k) => k.toLowerCase());
        for (const f of SEED_FAQS) {
          const hay = `${f.topic} ${f.question} ${f.answer} ${f.keywords.join(' ')}`.toLowerCase();
          if (terms.some((t) => hay.includes(t)) || terms.length === 0) {
            citations.push({ id: f.id, title: f.question, detail: f.answer });
          }
        }
        for (const c of serviceCentres.slice(0, 4)) {
          citations.push({
            id: c.id,
            title: c.name,
            detail: `${c.city} · ${c.address}`,
          });
        }
      } else if (structuredQuery.intent === 'range_check') {
        citations.push({
          id: activeVehicle.id,
          title: `${activeVehicle.make} ${activeVehicle.model}`,
          detail: evalBand.explanation,
        });
      }

      // Step 3: Server-side Gemini grounded explanation
      const { reply } = await liveApi.explainAssistantResult({
        message: trimmed,
        structuredQuery,
        engineSummary,
        citations,
      });

      setTurns((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: reply,
          structuredQuery,
          citations,
        },
      ]);
    } catch (err) {
      setTurns((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text: 'The AI assistant could not complete this request.',
          error: err instanceof Error ? err.message : 'Assistant request failed.',
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  if (!activeVehicle) {
    return (
      <TonalCard className="max-w-lg space-y-3">
        <h1 className="font-display text-xl font-bold">Add an EV First</h1>
        <RippleButton variant="primary" onClick={() => navigate('/onboarding')}>
          Open Profile &amp; EV Setup
        </RippleButton>
      </TonalCard>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[var(--cs-muted)]">
            <span>Server-Side Gemini AI + Deterministic Engine</span>
            <span aria-hidden="true">·</span>
            <DemoLabel kind="live" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mt-1">
            Grounded EV Intelligence Assistant
          </h1>
        </div>
      </div>

      {/* Quick Prompts */}
      <div className="flex flex-wrap gap-2">
        {SAMPLE_PROMPTS.map((q) => (
          <button
            key={q}
            type="button"
            disabled={sending}
            onClick={() => void runAssistant(q)}
            className="text-left px-3 py-2 rounded-[12px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] hover:border-[var(--cs-primary)] text-xs text-[var(--cs-text)] cursor-pointer"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Conversation */}
      <TonalCard className="space-y-4">
        <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
          {turns.map((turn) => (
            <div
              key={turn.id}
              className={`p-4 rounded-[18px] space-y-2 ${
                turn.role === 'user'
                  ? 'bg-[var(--cs-primary-container)] ml-6 sm:ml-16'
                  : 'bg-[var(--cs-surface-2)] mr-2 sm:mr-10'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-[var(--cs-muted)]">
                <span className="font-semibold text-[var(--cs-text)] flex items-center gap-1.5">
                  {turn.role === 'assistant' ? (
                    <>
                      <Bot className="w-3.5 h-3.5 text-[var(--cs-primary)]" />
                      <span>ChargeSense AI</span>
                    </>
                  ) : (
                    <span>You</span>
                  )}
                </span>
                {turn.structuredQuery && (
                  <span className="font-mono text-[11px] text-[var(--cs-primary)]">
                    intent: {turn.structuredQuery.intent}
                  </span>
                )}
              </div>

              <p className="text-sm text-[var(--cs-text)] whitespace-pre-wrap leading-relaxed">
                {turn.text}
              </p>

              {turn.error && (
                <p className="text-xs text-[var(--cs-error)]">{turn.error}</p>
              )}

              {turn.citations && turn.citations.length > 0 && (
                <div className="pt-2 border-t border-[var(--cs-outline)] space-y-1">
                  <span className="text-[11px] uppercase tracking-wider text-[var(--cs-muted)] flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[var(--cs-primary)]" />
                    Deterministic Citations ({turn.citations.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {turn.citations.slice(0, 4).map((c) => (
                      <div
                        key={c.id}
                        className="p-2.5 rounded-[10px] bg-[var(--cs-surface-1)] text-[11px] text-[var(--cs-muted)]"
                      >
                        <span className="font-mono text-[var(--cs-primary)] block">
                          [{c.id}]
                        </span>
                        <strong className="text-[var(--cs-text)]">{c.title}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void runAssistant(input);
          }}
          className="flex gap-2.5 pt-2 border-t border-[var(--cs-outline)]"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about compatible chargers, tariff caps, Mysuru stops, or range..."
            className="flex-1 min-h-[44px] px-4 rounded-[14px] bg-[var(--cs-surface-2)] border border-[var(--cs-outline)] text-sm text-[var(--cs-text)]"
          />
          <RippleButton
            type="submit"
            variant="primary"
            disabled={sending || !input.trim()}
          >
            <Send className="w-4 h-4" />
            <span>{sending ? 'Thinking...' : 'Ask'}</span>
          </RippleButton>
        </form>
      </TonalCard>
    </div>
  );
}
