/**
 * Simulated network-wide telemetry. Derived from wall-clock time so numbers are
 * consistent across reloads and between tabs, and drift upward slowly.
 */
const T0 = Date.UTC(2026, 9, 2, 6, 0, 0)

export interface NetworkSnapshot {
  privateRequests: number
  volumeUsd: number
  activeServices: number
  identitiesExposed: number
  anonymitySet: number
  verifierMs: number
}

export function networkSnapshot(now = Date.now()): NetworkSnapshot {
  const dt = Math.max(0, (now - T0) / 1000)
  return {
    privateRequests: 1_284_902 + Math.floor(dt / 2.6),
    volumeUsd: 482_000 + dt * 0.0024,
    activeServices: 12,
    identitiesExposed: 0,
    anonymitySet: 48_213 + Math.floor(dt / 170),
    verifierMs: 3.1,
  }
}

export const RELAYS = ['fra-1', 'ams-2', 'iad-3', 'sgp-1', 'lhr-1'] as const
