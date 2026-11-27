import { ConfidenceLevel, ReliabilityResult, Station } from './types';

// Conservative Bayesian Beta prior: alpha=6.5, beta=3.5 => prior mean 65/100, pseudo-N=10.
// Prevents new stations with 1-2 lucky sessions from scoring 98/100.
const PRIOR_ALPHA = 6.5;
const PRIOR_BETA = 3.5;
const CHECKIN_HALF_LIFE_DAYS = 14;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function computeReliability(
  station: Station,
  referenceNow: Date = new Date()
): ReliabilityResult {
  const reasons: string[] = [];

  // 1. Historical session counts (weight 0.6 per session so recent check-ins stay influential)
  const histWeight = 0.6;
  let alpha = PRIOR_ALPHA + station.historicalSuccessCount * histWeight;
  let beta = PRIOR_BETA + station.historicalFailureCount * histWeight;

  // 2. Recency-weighted user check-ins
  let weightedPositiveCheckIns = 0;
  let weightedNegativeCheckIns = 0;
  let recentPositiveCount = 0;
  let recentNegativeCount = 0;

  for (const checkIn of station.checkIns) {
    const checkInDate = new Date(checkIn.timestamp);
    const ageDays = Math.max(
      0,
      (referenceNow.getTime() - checkInDate.getTime()) / MS_PER_DAY
    );
    const recencyWeight = Math.pow(0.5, ageDays / CHECKIN_HALF_LIFE_DAYS);

    if (checkIn.outcome === 'worked') {
      // Recent positive check-in carries 2.4 effective alpha weight
      weightedPositiveCheckIns += 2.4 * recencyWeight;
      if (ageDays <= 14) recentPositiveCount += 1;
    } else {
      // Negative check-in carries stronger 4.0 beta penalty to protect drivers
      weightedNegativeCheckIns += 4.0 * recencyWeight;
      if (ageDays <= 14) recentNegativeCount += 1;
    }
  }

  alpha += weightedPositiveCheckIns;
  beta += weightedNegativeCheckIns;

  const bayesianMean = alpha / (alpha + beta);
  let rawScore = bayesianMean * 100;

  // 3. Downtime penalty (last 30d)
  const downtimePenalty = Math.min(18, station.downtimeHoursLast30d * 0.6);
  rawScore -= downtimePenalty;

  // 4. Status penalty
  if (station.status === 'degraded') {
    rawScore -= 12;
    reasons.push('Station currently reports degraded charger bays (-12 pts)');
  } else if (station.status === 'offline') {
    rawScore = Math.min(rawScore, 20);
    reasons.push('Station is currently offline');
  }

  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  // Effective observations excluding prior
  const effectiveSamples = Math.round(
    (station.historicalSuccessCount + station.historicalFailureCount) * histWeight +
      station.checkIns.length * 2
  );

  let confidence: ConfidenceLevel = 'low';
  if (effectiveSamples >= 30) {
    confidence = 'high';
  } else if (effectiveSamples >= 10) {
    confidence = 'medium';
  }

  // Build plain-language explanations
  const totalHist = station.historicalSuccessCount + station.historicalFailureCount;
  if (totalHist === 0 && station.checkIns.length === 0) {
    reasons.push(
      'New or unverified station — Bayesian prior caps trust at ~65/100 until sessions accumulate'
    );
  } else {
    const histPct =
      totalHist > 0
        ? Math.round((station.historicalSuccessCount / totalHist) * 100)
        : 0;
    if (totalHist > 0) {
      reasons.push(
        `${histPct}% historical session success across ${totalHist} recorded sessions`
      );
    }
    if (totalHist < 12) {
      reasons.push(
        'Limited historical sample — score is conservatively smoothed toward baseline'
      );
    }
  }

  if (recentPositiveCount > 0) {
    reasons.push(
      `${recentPositiveCount} driver check-in${recentPositiveCount > 1 ? 's' : ''} confirmed working in last 14 days`
    );
  }
  if (recentNegativeCount > 0) {
    reasons.push(
      `${recentNegativeCount} driver report${recentNegativeCount > 1 ? 's' : ''} flagged issues in last 14 days`
    );
  }
  if (station.downtimeHoursLast30d > 4) {
    reasons.push(
      `${station.downtimeHoursLast30d}h recorded downtime in the past 30 days`
    );
  } else if (station.downtimeHoursLast30d === 0 && totalHist >= 20) {
    reasons.push('Zero recorded downtime over the past 30 days');
  }

  return {
    score,
    confidence,
    effectiveSamples,
    recentPositiveCount,
    recentNegativeCount,
    reasons,
  };
}
