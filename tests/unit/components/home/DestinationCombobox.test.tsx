import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DestinationOption } from '@/lib/destinations';
import { DestinationCombobox } from '@/components/home/DestinationCombobox';

const options: DestinationOption[] = [
  {
    kind: 'country',
    label: 'All hotels in USA',
    count: 2,
    search: 'usa all',
    key: 'c-usa',
    params: { country: 'usa' },
  },
  {
    kind: 'city',
    label: 'Chicago, IL — USA',
    count: 1,
    search: 'chicago il usa',
    key: 'city-usa-chicago',
    params: { country: 'usa', city: 'chicago' },
  },
  {
    kind: 'city',
    label: 'London — United Kingdom',
    count: 1,
    search: 'london united kingdom',
    key: 'city-uk-london',
    params: { country: 'united-kingdom', city: 'london' },
  },
];

function open() {
  return userEvent.click(screen.getByRole('combobox'));
}

describe('DestinationCombobox', () => {
  it('shows all options when the input is empty', async () => {
    render(
      <DestinationCombobox
        options={options}
        value={null}
        onSelect={() => {}}
        loading={false}
        error={false}
        onRetry={() => {}}
      />,
    );
    await open();
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('substring-filters as the user types', async () => {
    render(
      <DestinationCombobox
        options={options}
        value={null}
        onSelect={() => {}}
        loading={false}
        error={false}
        onRetry={() => {}}
      />,
    );
    await open();
    await userEvent.type(screen.getByRole('combobox'), 'chic');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByRole('option')).toHaveTextContent('Chicago');
  });

  it('shows "No destinations" when nothing matches', async () => {
    render(
      <DestinationCombobox
        options={options}
        value={null}
        onSelect={() => {}}
        loading={false}
        error={false}
        onRetry={() => {}}
      />,
    );
    await open();
    await userEvent.type(screen.getByRole('combobox'), 'zzz');
    expect(screen.getByText('No destinations')).toBeTruthy();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('emits the chosen option (country row → country-only params)', async () => {
    const onSelect = jest.fn();
    render(
      <DestinationCombobox
        options={options}
        value={null}
        onSelect={onSelect}
        loading={false}
        error={false}
        onRetry={() => {}}
      />,
    );
    await open();
    await userEvent.click(screen.getByRole('option', { name: /All hotels in USA/ }));
    expect(onSelect).toHaveBeenCalledWith(options[0]);
  });

  it('selects the active option with Enter after ArrowDown', async () => {
    const onSelect = jest.fn();
    render(
      <DestinationCombobox
        options={options}
        value={null}
        onSelect={onSelect}
        loading={false}
        error={false}
        onRetry={() => {}}
      />,
    );
    const input = screen.getByRole('combobox');
    await userEvent.click(input);
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}'); // index 1 → Chicago
    expect(onSelect).toHaveBeenCalledWith(options[1]);
  });

  it('displays the already-selected destination label in the closed input', () => {
    const { rerender } = render(
      <DestinationCombobox
        options={options}
        value={{ country: 'usa', city: 'chicago' }}
        onSelect={() => {}}
        loading={false}
        error={false}
        onRetry={() => {}}
      />,
    );
    expect((screen.getByRole('combobox') as HTMLInputElement).value).toBe('Chicago, IL — USA');

    rerender(
      <DestinationCombobox
        options={options}
        value={{ country: 'usa', city: null }}
        onSelect={() => {}}
        loading={false}
        error={false}
        onRetry={() => {}}
      />,
    );
    expect((screen.getByRole('combobox') as HTMLInputElement).value).toBe('All hotels in USA');
  });

  it('shows a Retry affordance on error', async () => {
    const onRetry = jest.fn();
    render(
      <DestinationCombobox
        options={[]}
        value={null}
        onSelect={() => {}}
        loading={false}
        error
        onRetry={onRetry}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalled();
  });
});
