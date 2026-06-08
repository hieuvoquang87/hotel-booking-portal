// tests/unit/stores/QueryProvider.test.tsx
import { useQueryClient } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { makeQueryClient, QueryProvider } from '@/stores/QueryProvider';

function Probe() {
  const client = useQueryClient();
  return <span>{client ? 'has-client' : 'no-client'}</span>;
}

describe('QueryProvider', () => {
  it('makeQueryClient applies the configured query defaults', () => {
    const defaults = makeQueryClient().getDefaultOptions().queries;
    expect(defaults).toMatchObject({ staleTime: 60_000, retry: 1, refetchOnWindowFocus: false });
  });

  it('provides a QueryClient to descendants', () => {
    render(
      <QueryProvider>
        <Probe />
      </QueryProvider>,
    );
    expect(screen.getByText('has-client')).toBeTruthy();
  });
});
