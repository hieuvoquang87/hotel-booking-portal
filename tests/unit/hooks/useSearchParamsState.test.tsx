// tests/unit/hooks/useSearchParamsState.test.tsx
import { act, renderHook } from '@testing-library/react';
import {
  nextState,
  parseRefineState,
  toSearchParams,
  useSearchParamsState,
} from '@/hooks/useSearchParamsState';

// Mutable mock of the current URL query; jest allows vars prefixed with `mock`.
let mockSearch = '';
const replace = jest.fn();
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
  useRouter: () => ({ replace }),
  usePathname: () => '/',
}));

describe('parseRefineState', () => {
  it('applies safe defaults for an empty query', () => {
    expect(parseRefineState(new URLSearchParams(''))).toEqual({
      country: null,
      city: null,
      stars: null,
      min: null,
      max: null,
      sort: 'price-asc',
      page: 1,
    });
  });

  it('coerces an unknown sort and a bad page', () => {
    const s = parseRefineState(new URLSearchParams('sort=nope&page=0'));
    expect(s.sort).toBe('price-asc');
    expect(s.page).toBe(1);
  });

  it('parses all provided values', () => {
    const s = parseRefineState(
      new URLSearchParams('country=usa&city=new-york&stars=4&min=100&max=300&sort=rating&page=2'),
    );
    expect(s).toEqual({
      country: 'usa',
      city: 'new-york',
      stars: 4,
      min: 100,
      max: 300,
      sort: 'rating',
      page: 2,
    });
  });
});

describe('nextState page-reset', () => {
  const base = parseRefineState(new URLSearchParams('country=usa&page=3'));

  it('resets page to 1 when a filter changes', () => {
    expect(nextState(base, { stars: 4 }).page).toBe(1);
  });
  it('keeps the page when the patch sets page explicitly', () => {
    expect(nextState(base, { page: 5 }).page).toBe(5);
  });
  it('keeps the page for an empty patch', () => {
    expect(nextState(base, {}).page).toBe(3);
  });
});

describe('toSearchParams', () => {
  it('omits defaults and nulls, sorts keys', () => {
    const qs = toSearchParams({
      country: 'usa',
      city: null,
      stars: 4,
      min: null,
      max: null,
      sort: 'price-asc',
      page: 1,
    }).toString();
    expect(qs).toBe('country=usa&stars=4');
  });
  it('includes sort and page when non-default', () => {
    const qs = toSearchParams({
      country: null,
      city: null,
      stars: null,
      min: null,
      max: null,
      sort: 'rating',
      page: 2,
    }).toString();
    expect(qs).toBe('page=2&sort=rating');
  });
});

describe('useSearchParamsState', () => {
  beforeEach(() => {
    replace.mockClear();
    mockSearch = 'country=usa&page=3';
  });

  it('exposes the parsed state', () => {
    const { result } = renderHook(() => useSearchParamsState());
    expect(result.current.state).toMatchObject({ country: 'usa', page: 3 });
  });

  it('setParams resets page on a filter change and calls router.replace', () => {
    const { result } = renderHook(() => useSearchParamsState());
    act(() => result.current.setParams({ stars: 4 }));
    expect(replace).toHaveBeenCalledWith('/?country=usa&stars=4');
  });
});
