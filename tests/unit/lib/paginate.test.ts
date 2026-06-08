import { PAGE_SIZE, paginate } from '@/lib/paginate';

const nums = Array.from({ length: 25 }, (_, i) => i + 1); // 1..25

describe('paginate', () => {
  it('returns the requested page slice and metadata', () => {
    const result = paginate(nums, 1, 10);
    expect(result.items).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(result).toMatchObject({ page: 1, totalPages: 3, total: 25 });
  });
  it('clamps a too-large page to the last page', () => {
    expect(paginate(nums, 99, 10).page).toBe(3);
    expect(paginate(nums, 99, 10).items).toEqual([21, 22, 23, 24, 25]);
  });
  it('clamps page 0 / negative up to 1', () => {
    expect(paginate(nums, 0, 10).page).toBe(1);
    expect(paginate(nums, -5, 10).page).toBe(1);
  });
  it('an empty list has totalPages 1 and no items', () => {
    expect(paginate([], 1, 10)).toMatchObject({ items: [], page: 1, totalPages: 1, total: 0 });
  });
  it('defaults to PAGE_SIZE', () => {
    expect(paginate(nums, 1).items).toHaveLength(PAGE_SIZE);
  });
  it('uses a page size of 8 (home grid design contract)', () => {
    expect(PAGE_SIZE).toBe(8);
    const items = Array.from({ length: 20 }, (_, i) => i);
    const result = paginate(items, 1);
    expect(result.items).toHaveLength(8);
    expect(result.totalPages).toBe(3); // 20 items / 8 = 3 pages
  });
});
