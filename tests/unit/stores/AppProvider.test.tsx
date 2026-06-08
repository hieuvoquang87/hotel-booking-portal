// tests/unit/stores/AppProvider.test.tsx
import { act, renderHook } from '@testing-library/react';
import { AppProvider, useAppDates } from '@/stores/AppProvider';

describe('useAppDates', () => {
  it('throws when used outside <AppProvider>', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAppDates())).toThrow(/AppProvider/);
    spy.mockRestore();
  });

  it('starts with null dates and updates them', () => {
    const { result } = renderHook(() => useAppDates(), { wrapper: AppProvider });

    expect(result.current.checkIn).toBeNull();
    expect(result.current.checkOut).toBeNull();

    act(() => result.current.setCheckIn('2026-07-10'));
    act(() => result.current.setCheckOut('2026-07-12'));

    expect(result.current.checkIn).toBe('2026-07-10');
    expect(result.current.checkOut).toBe('2026-07-12');
  });
});
