import { humanizeAmenity } from '@/lib/amenities';

describe('humanizeAmenity', () => {
  it.each([
    ['free_wifi', 'Wi-Fi'],
    ['wifi', 'Wi-Fi'],
    ['fitness_center', 'Fitness center'],
    ['swimming_pool', 'Swimming pool'],
    ['pet_friendly', 'Pet friendly'],
  ])('humanizes %s → %s', (raw, expected) => {
    expect(humanizeAmenity(raw)).toBe(expected);
  });
});
