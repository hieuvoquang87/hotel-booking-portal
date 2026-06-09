import { humanizeAmenity } from '@/lib/amenities';

describe('humanizeAmenity', () => {
  it.each([
    // The bug: the seed token is "free Wi-Fi" (space + hyphen), not free_wifi.
    ['free Wi-Fi', 'Wi-Fi'],
    // Defensive aliases for alternate Wi-Fi spellings.
    ['free_wifi', 'Wi-Fi'],
    ['wifi', 'Wi-Fi'],
    // Curated labels that diverge from the generic transform.
    ['free_breakfast', 'Free breakfast'],
    ['bicycle_rentals', 'Bikes'],
    ['laundry_service', 'Laundry'],
    ['marina_access', 'Marina'],
    ['michelin_restaurant', 'Michelin dining'],
    ['vending_galore', 'Vending'],
    ['on_site_pub', 'On-site pub'],
    // Curated labels that match a straight title-case.
    ['fitness_center', 'Fitness center'],
    ['pet_friendly', 'Pet friendly'],
  ])('maps the curated token %s → %s', (raw, expected) => {
    expect(humanizeAmenity(raw)).toBe(expected);
  });

  it.each([
    // Unmapped single-word and room tokens fall back to sentence case.
    ['pool', 'Pool'],
    ['spa', 'Spa'],
    ['restaurant', 'Restaurant'],
    ['swimming_pool', 'Swimming pool'],
    ['city_view', 'City view'],
    ['mini_bar', 'Mini bar'],
  ])('falls back to sentence case for %s → %s', (raw, expected) => {
    expect(humanizeAmenity(raw)).toBe(expected);
  });
});
