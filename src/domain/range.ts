import { RangeBand, RangeFactorImpact, RangeInput, Vehicle } from './types';

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

/**
 * Deterministic EV range estimator.
 * Formula:
 *   usableEnergy = vehicle.usableKwh * (soc / 100)
 *   bufferedEnergy = usableEnergy * (1 - safetyBuffer / 100)
 *   adjustedWhPerKm = baselineWhPerKm * modeFactor * speedFactor * climateFactor * loadFactor * tempFactor
 *   likelyKm = (bufferedEnergy * 1000) / adjustedWhPerKm
 */
export function estimateRange(vehicle: Vehicle, input: RangeInput): RangeBand {
  const soc = clamp(input.socPercent, 0, 100);
  const safetyBufferPercent = clamp(input.safetyBufferPercent ?? 20, 0, 45);
  const usableEnergyKwh = Number(((vehicle.usableKwh * soc) / 100).toFixed(2));
  const bufferedEnergyKwh = Number(
    (usableEnergyKwh * (1 - safetyBufferPercent / 100)).toFixed(2)
  );

  if (soc <= 0 || usableEnergyKwh <= 0) {
    return {
      socPercent: 0,
      usableEnergyKwh: 0,
      bufferedEnergyKwh: 0,
      safetyBufferPercent,
      minKm: 0,
      likelyKm: 0,
      maxKm: 0,
      adjustedWhPerKm: vehicle.efficiencyWhPerKm,
      explanation:
        'Battery is at 0% SoC (0.0 kWh usable). Immediate stationary charging or flatbed roadside assistance is required.',
      factors: [],
    };
  }

  const factors: RangeFactorImpact[] = [];

  // 1. Drive mode multiplier
  const modeMap = {
    eco: { mult: 0.91, label: 'Eco drive mode', detail: 'Softens throttle & increases regen (-9% draw)' },
    city: { mult: 1.0, label: 'City drive mode', detail: 'Baseline balanced calibration (0%)' },
    sport: { mult: 1.15, label: 'Sport drive mode', detail: 'Sharper torque curve (+15% draw)' },
  } as const;
  const modeInfo = modeMap[input.driveMode];
  factors.push({
    label: modeInfo.label,
    impactPercent: Math.round((modeInfo.mult - 1) * 100),
    detail: modeInfo.detail,
  });

  // 2. Speed aerodynamic drag factor (optimal highway cruise ~65-75 km/h)
  const speed = clamp(input.avgSpeedKmh, 20, 140);
  let speedMult = 1.0;
  if (speed > 75) {
    // Aerodynamic drag rises quadratically above 75 km/h
    speedMult = 1 + ((speed - 75) / 100) * 0.55;
  } else if (speed < 45) {
    // Slow urban crawl has slightly higher auxiliary/stop-go overhead
    speedMult = 1 + ((45 - speed) / 100) * 0.12;
  } else {
    speedMult = 0.96;
  }
  factors.push({
    label: `Cruise speed (${Math.round(speed)} km/h)`,
    impactPercent: Math.round((speedMult - 1) * 100),
    detail:
      speed > 85
        ? 'Expressway speeds increase aerodynamic drag'
        : 'Steady moderate speed favors efficiency',
  });

  // 3. Climate / AC load
  let climateMult = 1.0;
  if (input.acOn) {
    const tempDelta = Math.max(0, input.ambientTempC - 26);
    climateMult = 1.06 + Math.min(0.08, tempDelta * 0.006);
  }
  factors.push({
    label: input.acOn ? `Cabin AC on (${input.ambientTempC}°C)` : 'Cabin AC off',
    impactPercent: Math.round((climateMult - 1) * 100),
    detail: input.acOn
      ? 'Compressor & blower draw continuous auxiliary kW'
      : 'No HVAC compressor load',
  });

  // 4. Payload (passengers + cargo above driver-only baseline)
  const extraPassengers = Math.max(0, input.passengers - 1);
  const extraMassKg = extraPassengers * 70 + Math.max(0, input.cargoKg);
  const loadMult = 1 + Math.min(0.14, (extraMassKg / 100) * 0.025);
  factors.push({
    label: `Payload (${input.passengers} pax, ${input.cargoKg} kg)`,
    impactPercent: Math.round((loadMult - 1) * 100),
    detail:
      extraMassKg > 120
        ? 'Higher curb weight increases rolling & climb energy'
        : 'Light passenger and luggage load',
  });

  // 5. Ambient temperature effect on battery internal resistance / thermal management
  let tempMult = 1.0;
  if (input.ambientTempC > 35) {
    tempMult = 1 + (input.ambientTempC - 35) * 0.008;
  } else if (input.ambientTempC < 16) {
    tempMult = 1 + (16 - input.ambientTempC) * 0.012;
  }
  if (tempMult !== 1.0) {
    factors.push({
      label: `Ambient temp (${input.ambientTempC}°C)`,
      impactPercent: Math.round((tempMult - 1) * 100),
      detail: 'Battery thermal conditioning active outside 16–35°C band',
    });
  }

  const combinedMult = modeInfo.mult * speedMult * climateMult * loadMult * tempMult;
  const adjustedWhPerKm = Math.round(vehicle.efficiencyWhPerKm * combinedMult);

  const likelyKm = Math.max(0, Math.round((bufferedEnergyKwh * 1000) / adjustedWhPerKm));
  // Conservative lower bound (+12% headwind/elevation/traffic margin)
  const minKm = Math.max(0, Math.round(likelyKm * 0.88));
  // Optimistic upper bound (-10% gentler throttle/tailwind, still keeping safety buffer intact)
  const maxKm = Math.max(likelyKm, Math.round(likelyKm * 1.1));

  const explanation = `At ${soc}% SoC (${usableEnergyKwh} kWh usable), reserving a ${safetyBufferPercent}% safety buffer leaves ${bufferedEnergyKwh} kWh for driving. At ${adjustedWhPerKm} Wh/km (${input.driveMode} mode, ${Math.round(
    speed
  )} km/h, AC ${input.acOn ? 'on' : 'off'}), expect ${likelyKm} km (band ${minKm}–${maxKm} km).`;

  return {
    socPercent: soc,
    usableEnergyKwh,
    bufferedEnergyKwh,
    safetyBufferPercent,
    minKm,
    likelyKm,
    maxKm,
    adjustedWhPerKm,
    explanation,
    factors,
  };
}
