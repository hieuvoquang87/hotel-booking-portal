/** @jest-environment node */

import { getResilienceConfig } from '@/services/config';

const ENV_KEYS = [
  'FAULT_INJECTION_ENABLED',
  'FAULT_ERROR_RATE',
  'FAULT_LATENCY_MULTIPLIER',
  'BREAKER_FAILURE_THRESHOLD',
  'BREAKER_COOLDOWN_MS',
  'CACHE_TTL_MS',
  'CACHE_MAX_ENTRIES',
  'AVAILABILITY_TIMEOUT_MS',
  'AVAILABILITY_MAX_RETRIES',
] as const;

let saved: Partial<Record<string, string>> = {};

beforeEach(() => {
  saved = {};
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = saved[key];
    }
  }
});

describe('getResilienceConfig — defaults', () => {
  it('returns all defaults when no env vars are set', () => {
    const config = getResilienceConfig();
    expect(config).toEqual({
      faultEnabled: false,
      faultErrorRate: 0,
      faultLatencyMultiplier: 1,
      breakerFailureThreshold: 3,
      breakerCooldownMs: 10000,
      cacheTtlMs: 30000,
      cacheMaxEntries: 500,
      availabilityTimeoutMs: 3000,
      availabilityMaxRetries: 2,
    });
  });
});

describe('getResilienceConfig — env var parsing', () => {
  it('parses FAULT_INJECTION_ENABLED=true', () => {
    process.env.FAULT_INJECTION_ENABLED = 'true';
    expect(getResilienceConfig().faultEnabled).toBe(true);
  });

  it('treats FAULT_INJECTION_ENABLED values other than "true" as false', () => {
    process.env.FAULT_INJECTION_ENABLED = 'false';
    expect(getResilienceConfig().faultEnabled).toBe(false);
    process.env.FAULT_INJECTION_ENABLED = '1';
    expect(getResilienceConfig().faultEnabled).toBe(false);
  });

  it('parses FAULT_ERROR_RATE', () => {
    process.env.FAULT_ERROR_RATE = '0.5';
    expect(getResilienceConfig().faultErrorRate).toBe(0.5);
  });

  it('parses FAULT_LATENCY_MULTIPLIER', () => {
    process.env.FAULT_LATENCY_MULTIPLIER = '3';
    expect(getResilienceConfig().faultLatencyMultiplier).toBe(3);
  });

  it('parses BREAKER_FAILURE_THRESHOLD', () => {
    process.env.BREAKER_FAILURE_THRESHOLD = '5';
    expect(getResilienceConfig().breakerFailureThreshold).toBe(5);
  });

  it('parses BREAKER_COOLDOWN_MS', () => {
    process.env.BREAKER_COOLDOWN_MS = '20000';
    expect(getResilienceConfig().breakerCooldownMs).toBe(20000);
  });

  it('parses CACHE_TTL_MS', () => {
    process.env.CACHE_TTL_MS = '60000';
    expect(getResilienceConfig().cacheTtlMs).toBe(60000);
  });

  it('parses CACHE_MAX_ENTRIES', () => {
    process.env.CACHE_MAX_ENTRIES = '1000';
    expect(getResilienceConfig().cacheMaxEntries).toBe(1000);
  });

  it('parses AVAILABILITY_TIMEOUT_MS', () => {
    process.env.AVAILABILITY_TIMEOUT_MS = '5000';
    expect(getResilienceConfig().availabilityTimeoutMs).toBe(5000);
  });

  it('parses AVAILABILITY_MAX_RETRIES', () => {
    process.env.AVAILABILITY_MAX_RETRIES = '4';
    expect(getResilienceConfig().availabilityMaxRetries).toBe(4);
  });
});

describe('getResilienceConfig — faultErrorRate clamping', () => {
  it('clamps negative value to 0', () => {
    process.env.FAULT_ERROR_RATE = '-0.5';
    expect(getResilienceConfig().faultErrorRate).toBe(0);
  });

  it('clamps value > 1 to 1', () => {
    process.env.FAULT_ERROR_RATE = '1.5';
    expect(getResilienceConfig().faultErrorRate).toBe(1);
  });

  it('accepts boundary value 0', () => {
    process.env.FAULT_ERROR_RATE = '0';
    expect(getResilienceConfig().faultErrorRate).toBe(0);
  });

  it('accepts boundary value 1', () => {
    process.env.FAULT_ERROR_RATE = '1';
    expect(getResilienceConfig().faultErrorRate).toBe(1);
  });
});

describe('getResilienceConfig — faultLatencyMultiplier clamping', () => {
  it('clamps value below 1 to minimum of 1', () => {
    process.env.FAULT_LATENCY_MULTIPLIER = '0.2';
    expect(getResilienceConfig().faultLatencyMultiplier).toBe(1);
  });

  it('clamps negative value to 1', () => {
    process.env.FAULT_LATENCY_MULTIPLIER = '-5';
    expect(getResilienceConfig().faultLatencyMultiplier).toBe(1);
  });

  it('accepts value equal to 1', () => {
    process.env.FAULT_LATENCY_MULTIPLIER = '1';
    expect(getResilienceConfig().faultLatencyMultiplier).toBe(1);
  });

  it('accepts value greater than 1', () => {
    process.env.FAULT_LATENCY_MULTIPLIER = '10';
    expect(getResilienceConfig().faultLatencyMultiplier).toBe(10);
  });
});

describe('getResilienceConfig — non-numeric fallback', () => {
  it('falls back to default for non-numeric FAULT_ERROR_RATE', () => {
    process.env.FAULT_ERROR_RATE = 'abc';
    expect(getResilienceConfig().faultErrorRate).toBe(0);
  });

  it('falls back to default for non-numeric FAULT_LATENCY_MULTIPLIER', () => {
    process.env.FAULT_LATENCY_MULTIPLIER = 'bad';
    expect(getResilienceConfig().faultLatencyMultiplier).toBe(1);
  });

  it('falls back to default for non-numeric BREAKER_FAILURE_THRESHOLD', () => {
    process.env.BREAKER_FAILURE_THRESHOLD = 'nan';
    expect(getResilienceConfig().breakerFailureThreshold).toBe(3);
  });

  it('falls back to default for non-numeric BREAKER_COOLDOWN_MS', () => {
    process.env.BREAKER_COOLDOWN_MS = 'xyz';
    expect(getResilienceConfig().breakerCooldownMs).toBe(10000);
  });

  it('falls back to default for non-numeric CACHE_TTL_MS', () => {
    process.env.CACHE_TTL_MS = 'not-a-number';
    expect(getResilienceConfig().cacheTtlMs).toBe(30000);
  });

  it('falls back to default for non-numeric CACHE_MAX_ENTRIES', () => {
    process.env.CACHE_MAX_ENTRIES = 'infinity';
    expect(getResilienceConfig().cacheMaxEntries).toBe(500);
  });

  it('falls back to default for Infinity (capital-I) CACHE_MAX_ENTRIES', () => {
    process.env.CACHE_MAX_ENTRIES = 'Infinity';
    expect(getResilienceConfig().cacheMaxEntries).toBe(500);
  });

  it('falls back to default for non-numeric AVAILABILITY_TIMEOUT_MS', () => {
    process.env.AVAILABILITY_TIMEOUT_MS = '??';
    expect(getResilienceConfig().availabilityTimeoutMs).toBe(3000);
  });

  it('falls back to default for non-numeric AVAILABILITY_MAX_RETRIES', () => {
    process.env.AVAILABILITY_MAX_RETRIES = 'two';
    expect(getResilienceConfig().availabilityMaxRetries).toBe(2);
  });
});
