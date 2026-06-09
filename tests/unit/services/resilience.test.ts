/** @jest-environment node */
import {
  createResilienceController,
  BreakerOpenError,
  TimeoutError,
  type BreakerState,
  type ResiliencePolicy,
} from '../../../services/resilience';

function makePolicy(overrides: Partial<ResiliencePolicy> = {}): ResiliencePolicy {
  return {
    timeoutMs: 100,
    maxRetries: 2,
    breakerFailureThreshold: 3,
    breakerCooldownMs: 5000,
    ...overrides,
  };
}

describe('timeout', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('fires TimeoutError when fn takes longer than timeoutMs', async () => {
    const fn = () => new Promise<string>(() => undefined);
    const ctrl = createResilienceController(fn, makePolicy({ timeoutMs: 50, maxRetries: 0 }));

    const callPromise = ctrl.call();
    const assertion = expect(callPromise).rejects.toBeInstanceOf(TimeoutError);
    await jest.advanceTimersByTimeAsync(100);
    await assertion;
  });
});

describe('retry on timeout', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('succeeds on second attempt after first call times out', async () => {
    let callCount = 0;
    const fn = () => {
      callCount += 1;
      if (callCount === 1) {
        return new Promise<string>((resolve) => setTimeout(() => resolve('late'), 200));
      }
      return Promise.resolve('ok');
    };

    const ctrl = createResilienceController(
      fn,
      makePolicy({ timeoutMs: 50, maxRetries: 1, breakerFailureThreshold: 5 }),
    );

    const callPromise = ctrl.call();
    await jest.advanceTimersByTimeAsync(500);
    await expect(callPromise).resolves.toBe('ok');
    expect(callCount).toBe(2);
  });
});

describe('retry count bounded', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('stops retrying after maxRetries attempts and throws', async () => {
    let callCount = 0;
    const fn = () => {
      callCount += 1;
      return new Promise<string>(() => undefined);
    };

    const policy = makePolicy({
      timeoutMs: 50,
      maxRetries: 2,
      breakerFailureThreshold: 10,
    });
    const ctrl = createResilienceController(fn, policy);

    const callPromise = ctrl.call();
    const assertion = expect(callPromise).rejects.toBeInstanceOf(TimeoutError);
    await jest.advanceTimersByTimeAsync(5000);
    await assertion;
    expect(callCount).toBe(3);
  });
});

describe('circuit breaker opens after threshold', () => {
  it('transitions to OPEN after breakerFailureThreshold consecutive failures', async () => {
    const fn = () => Promise.reject(new Error('fail'));
    const policy = makePolicy({ maxRetries: 0, breakerFailureThreshold: 3 });
    const ctrl = createResilienceController(fn, policy);

    for (let i = 0; i < 3; i++) {
      await expect(ctrl.call()).rejects.toThrow('fail');
    }

    expect(ctrl.getBreakerState()).toBe('OPEN');
  });
});

describe('fast-fail when OPEN', () => {
  it('throws BreakerOpenError immediately without calling fn', async () => {
    let callCount = 0;
    const fn = () => {
      callCount += 1;
      return Promise.reject(new Error('fail'));
    };
    const policy = makePolicy({ maxRetries: 0, breakerFailureThreshold: 2 });
    const ctrl = createResilienceController(fn, policy);

    await expect(ctrl.call()).rejects.toThrow('fail');
    await expect(ctrl.call()).rejects.toThrow('fail');
    expect(ctrl.getBreakerState()).toBe('OPEN');

    const prevCount = callCount;
    await expect(ctrl.call()).rejects.toBeInstanceOf(BreakerOpenError);
    expect(callCount).toBe(prevCount);
  });
});

describe('half-open after cooldown — probe succeeds', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('transitions OPEN → HALF_OPEN on probe and HALF_OPEN → CLOSED on success', async () => {
    let callCount = 0;
    const fn = () => {
      callCount += 1;
      if (callCount <= 2) return Promise.reject(new Error('fail'));
      return Promise.resolve('ok');
    };

    const policy = makePolicy({
      maxRetries: 0,
      breakerFailureThreshold: 2,
      breakerCooldownMs: 5000,
    });
    const ctrl = createResilienceController(fn, policy);

    await expect(ctrl.call()).rejects.toThrow('fail');
    await expect(ctrl.call()).rejects.toThrow('fail');
    expect(ctrl.getBreakerState()).toBe('OPEN');

    await jest.advanceTimersByTimeAsync(5001);

    const result = await ctrl.call();
    expect(result).toBe('ok');
    expect(ctrl.getBreakerState()).toBe('CLOSED');
  });
});

describe('half-open probe fails → re-opens', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('transitions HALF_OPEN → OPEN when probe fails', async () => {
    const fn = () => Promise.reject(new Error('fail'));
    const policy = makePolicy({
      maxRetries: 0,
      breakerFailureThreshold: 2,
      breakerCooldownMs: 5000,
    });
    const ctrl = createResilienceController(fn, policy);

    await expect(ctrl.call()).rejects.toThrow('fail');
    await expect(ctrl.call()).rejects.toThrow('fail');
    expect(ctrl.getBreakerState()).toBe('OPEN');

    await jest.advanceTimersByTimeAsync(5001);

    await expect(ctrl.call()).rejects.toThrow('fail');
    expect(ctrl.getBreakerState()).toBe('OPEN');
  });
});

describe('onBreakerTransition callback', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('receives OPEN, HALF_OPEN, CLOSED in order', async () => {
    const transitions: BreakerState[] = [];
    let callCount = 0;
    const fn = () => {
      callCount += 1;
      if (callCount <= 2) return Promise.reject(new Error('fail'));
      return Promise.resolve('done');
    };

    const policy = makePolicy({
      maxRetries: 0,
      breakerFailureThreshold: 2,
      breakerCooldownMs: 5000,
    });
    const ctrl = createResilienceController(fn, policy, (s) => transitions.push(s));

    await expect(ctrl.call()).rejects.toThrow('fail');
    await expect(ctrl.call()).rejects.toThrow('fail');

    await jest.advanceTimersByTimeAsync(5001);
    await ctrl.call();

    expect(transitions).toEqual(['OPEN', 'HALF_OPEN', 'CLOSED']);
  });
});

describe('breaker opens mid-retry — subsequent retries fast-fail', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('throws BreakerOpenError on the call after the breaker opens during retries', async () => {
    const fn = () => {
      const err = Object.assign(new Error('fail'), { retryable: true });
      return Promise.reject(err);
    };

    const policy = makePolicy({
      breakerFailureThreshold: 2,
      maxRetries: 3,
      timeoutMs: 1000,
      // large cooldown so advancing fake timers for backoff sleeps won't expire it
      breakerCooldownMs: 999_999,
    });
    const ctrl = createResilienceController(fn, policy);

    // The first call opens the breaker after breakerFailureThreshold failures.
    // Once the breaker opens, subsequent retries within the same call fast-fail
    // with BreakerOpenError (the bug fix: every attempt checks breaker state).
    const firstRejection = expect(ctrl.call()).rejects.toBeInstanceOf(BreakerOpenError);
    await jest.advanceTimersByTimeAsync(5000); // flushes backoff sleeps, not cooldown
    await firstRejection;
    expect(ctrl.getBreakerState()).toBe('OPEN');

    // A subsequent call must fast-fail with BreakerOpenError without calling fn.
    await expect(ctrl.call()).rejects.toBeInstanceOf(BreakerOpenError);
  });
});

describe('success resets consecutive failure count', () => {
  it('does not open breaker if a success resets failures before threshold is reached', async () => {
    let callCount = 0;
    const fn = () => {
      callCount += 1;
      if (callCount === 1 || callCount === 2) return Promise.reject(new Error('fail'));
      if (callCount === 3) return Promise.resolve('ok');
      if (callCount === 4 || callCount === 5) return Promise.reject(new Error('fail'));
      return Promise.resolve('ok');
    };

    const policy = makePolicy({ maxRetries: 0, breakerFailureThreshold: 3 });
    const ctrl = createResilienceController(fn, policy);

    await expect(ctrl.call()).rejects.toThrow('fail');
    await expect(ctrl.call()).rejects.toThrow('fail');
    expect(ctrl.getBreakerState()).toBe('CLOSED');

    await expect(ctrl.call()).resolves.toBe('ok');
    expect(ctrl.getBreakerState()).toBe('CLOSED');

    await expect(ctrl.call()).rejects.toThrow('fail');
    await expect(ctrl.call()).rejects.toThrow('fail');
    expect(ctrl.getBreakerState()).toBe('CLOSED');
  });
});
