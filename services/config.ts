export type ResilienceConfig = {
  faultEnabled: boolean;
  faultErrorRate: number;
  faultLatencyMultiplier: number;

  breakerFailureThreshold: number;
  breakerCooldownMs: number;

  cacheTtlMs: number;
  cacheMaxEntries: number;

  availabilityTimeoutMs: number;
  availabilityMaxRetries: number;
};

function parseNum(raw: string | undefined, defaultValue: number): number {
  if (raw === undefined || raw === '') return defaultValue;
  const parsed = Number(raw);
  return isNaN(parsed) || !isFinite(parsed) ? defaultValue : parsed;
}

export function getResilienceConfig(): ResilienceConfig {
  const faultErrorRate = parseNum(process.env.FAULT_ERROR_RATE, 0);
  const faultLatencyMultiplier = parseNum(process.env.FAULT_LATENCY_MULTIPLIER, 1);

  return {
    faultEnabled: process.env.FAULT_INJECTION_ENABLED === 'true',
    faultErrorRate: Math.min(1, Math.max(0, faultErrorRate)),
    faultLatencyMultiplier: Math.max(1, faultLatencyMultiplier),

    breakerFailureThreshold: parseNum(process.env.BREAKER_FAILURE_THRESHOLD, 3),
    breakerCooldownMs: parseNum(process.env.BREAKER_COOLDOWN_MS, 10000),

    cacheTtlMs: parseNum(process.env.CACHE_TTL_MS, 30000),
    cacheMaxEntries: parseNum(process.env.CACHE_MAX_ENTRIES, 500),

    availabilityTimeoutMs: parseNum(process.env.AVAILABILITY_TIMEOUT_MS, 3000),
    availabilityMaxRetries: parseNum(process.env.AVAILABILITY_MAX_RETRIES, 2),
  };
}
