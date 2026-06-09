export type BreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export type ResiliencePolicy = {
  timeoutMs: number;
  maxRetries: number;
  breakerFailureThreshold: number;
  breakerCooldownMs: number;
};

export class TimeoutError extends Error {
  constructor() {
    super('operation timed out');
    this.name = 'TimeoutError';
  }
}

export class BreakerOpenError extends Error {
  constructor() {
    super('circuit breaker is open');
    this.name = 'BreakerOpenError';
  }
}

export type ResilienceController<T> = {
  call(): Promise<T>;
  getBreakerState(): BreakerState;
};

function isRetryable(err: unknown): boolean {
  if (err instanceof BreakerOpenError) return false;
  if (err instanceof TimeoutError) return true;
  if (err !== null && typeof err === 'object' && 'retryable' in err) {
    return (err as { retryable: unknown }).retryable === true;
  }
  return false;
}

function backoffMs(attempt: number): number {
  const base = 100;
  const jitter = Math.random() * 100;
  return base * Math.pow(2, attempt) + jitter;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createResilienceController<T>(
  fn: () => Promise<T>,
  policy: ResiliencePolicy,
  onBreakerTransition?: (state: BreakerState) => void,
): ResilienceController<T> {
  let state: BreakerState = 'CLOSED';
  let consecutiveFailures = 0;
  let openedAt = 0;

  function transitionTo(next: BreakerState): void {
    state = next;
    if (next === 'OPEN') openedAt = Date.now();
    onBreakerTransition?.(next);
  }

  function withTimeout(promise: Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new TimeoutError()), policy.timeoutMs);
      promise.then(
        (value) => { clearTimeout(timer); resolve(value); },
        (err) => { clearTimeout(timer); reject(err); },
      );
      // suppress unhandled rejection if fn() rejects after timeout has already settled
      promise.catch(() => undefined);
    });
  }

  async function attempt(attempt: number): Promise<T> {
    if (state === 'OPEN') {
      const elapsed = Date.now() - openedAt;
      if (elapsed < policy.breakerCooldownMs) {
        throw new BreakerOpenError();
      }
      transitionTo('HALF_OPEN');
    }

    try {
      const result = await withTimeout(fn());
      consecutiveFailures = 0;
      if (state === 'HALF_OPEN') transitionTo('CLOSED');
      return result;
    } catch (err) {
      if (state === 'HALF_OPEN') {
        consecutiveFailures = policy.breakerFailureThreshold;
        transitionTo('OPEN');
        throw err;
      }

      consecutiveFailures += 1;

      if (consecutiveFailures >= policy.breakerFailureThreshold) {
        transitionTo('OPEN');
      }

      const canRetry = attempt < policy.maxRetries && isRetryable(err);
      if (canRetry) {
        await sleep(backoffMs(attempt));
        return attemptFromClosed(attempt + 1);
      }

      throw err;
    }
  }

  async function attemptFromClosed(n: number): Promise<T> {
    return attempt(n);
  }

  async function call(): Promise<T> {
    if (state === 'OPEN') {
      const elapsed = Date.now() - openedAt;
      if (elapsed < policy.breakerCooldownMs) {
        throw new BreakerOpenError();
      }
      transitionTo('HALF_OPEN');
    }

    return attempt(0);
  }

  return {
    call,
    getBreakerState: () => state,
  };
}
