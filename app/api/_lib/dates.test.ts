/** @jest-environment node */
import { isCalendarDate } from './dates';

describe('isCalendarDate', () => {
  it.each(['2026-07-10', '2026-02-28', '2024-02-29'])('accepts real date %s', (d) => {
    expect(isCalendarDate(d)).toBe(true);
  });
  it.each([
    '2026-13-01',
    '2026-02-30',
    '2026-7-10',
    '07-10-2026',
    'tomorrow',
    '',
  ])('rejects %s', (d) => {
    expect(isCalendarDate(d)).toBe(false);
  });
});
