import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// Fresh client per test; gcTime 0 so no cache leaks between tests. retryDelay 0 is
// load-bearing: per-query options override client defaults, so a hook's own retry
// count (e.g. useAvailability's retry:2) wins over `retry:false` here — without a
// zero delay, RQ's exponential backoff makes error-path tests exceed their timeout.
export function createQueryWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}
