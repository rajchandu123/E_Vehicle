import {
  PassportEvent,
  PassportEventPayload,
  PassportVerificationResult,
} from './types';

export const GENESIS_PREV_HASH =
  '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Canonical JSON serialization with sorted keys for deterministic SHA-256 hashing.
 */
export function canonicalizeEventPayload(
  payload: PassportEventPayload,
  prevHash: string
): string {
  const sortedMetadataKeys = Object.keys(payload.metadata).sort();
  const normalizedMeta: Record<string, string | number | boolean> = {};
  for (const key of sortedMetadataKeys) {
    normalizedMeta[key] = payload.metadata[key];
  }

  return JSON.stringify({
    id: payload.id,
    vehicleId: payload.vehicleId,
    type: payload.type,
    timestamp: payload.timestamp,
    odometerKm: payload.odometerKm,
    title: payload.title,
    summary: payload.summary,
    metadata: normalizedMeta,
    prevHash,
  });
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function computeEventHash(
  payload: PassportEventPayload,
  prevHash: string
): Promise<string> {
  const canonical = canonicalizeEventPayload(payload, prevHash);
  return sha256Hex(canonical);
}

export async function appendPassportEvent(
  chain: PassportEvent[],
  payload: PassportEventPayload
): Promise<PassportEvent[]> {
  const prevHash =
    chain.length === 0 ? GENESIS_PREV_HASH : chain[chain.length - 1].hash;
  const hash = await computeEventHash(payload, prevHash);
  return [...chain, { ...payload, prevHash, hash }];
}

export async function buildPassportChain(
  payloads: PassportEventPayload[]
): Promise<PassportEvent[]> {
  let chain: PassportEvent[] = [];
  for (const payload of payloads) {
    chain = await appendPassportEvent(chain, payload);
  }
  return chain;
}

export async function verifyPassportChain(
  chain: PassportEvent[]
): Promise<PassportVerificationResult> {
  if (chain.length === 0) {
    return {
      valid: true,
      checkedCount: 0,
      brokenAtIndex: null,
      reason: 'Empty passport ledger (0 events).',
    };
  }

  for (let i = 0; i < chain.length; i++) {
    const event = chain[i];
    const expectedPrev = i === 0 ? GENESIS_PREV_HASH : chain[i - 1].hash;
    if (event.prevHash !== expectedPrev) {
      return {
        valid: false,
        checkedCount: i + 1,
        brokenAtIndex: i,
        reason: `Broken chain link at index ${i} (${event.title}): prevHash mismatch.`,
      };
    }

    const expectedHash = await computeEventHash(
      {
        id: event.id,
        vehicleId: event.vehicleId,
        type: event.type,
        timestamp: event.timestamp,
        odometerKm: event.odometerKm,
        title: event.title,
        summary: event.summary,
        metadata: event.metadata,
      },
      event.prevHash
    );

    if (event.hash !== expectedHash) {
      return {
        valid: false,
        checkedCount: i + 1,
        brokenAtIndex: i,
        reason: `Tamper detected at index ${i} (${event.title}): SHA-256 hash mismatch.`,
      };
    }
  }

  return {
    valid: true,
    checkedCount: chain.length,
    brokenAtIndex: null,
    reason: `All ${chain.length} passport events verified against SHA-256 hash chain.`,
  };
}
