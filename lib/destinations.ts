import type { Location } from '@/types/domain';

export type DestinationOption =
  | {
      kind: 'country';
      label: string;
      count: number;
      search: string;
      key: string;
      params: { country: string };
    }
  | {
      kind: 'city';
      label: string;
      count: number;
      search: string;
      key: string;
      params: { country: string; city: string };
    };

// Build the combobox option list: one country-group row per country (loads all its
// hotels) followed by its city rows (loads one city). Country order follows the
// input order (M1's getLocations is already deterministically sorted).
export function buildDestinationOptions(locations: Location[]): DestinationOption[] {
  const byCountry = new Map<string, Location[]>();
  for (const loc of locations) {
    const list = byCountry.get(loc.country) ?? [];
    list.push(loc);
    byCountry.set(loc.country, list);
  }

  const options: DestinationOption[] = [];
  for (const [country, cities] of byCountry) {
    const countrySlug = cities[0].countrySlug;
    options.push({
      kind: 'country',
      label: `All hotels in ${country}`,
      count: cities.length,
      search: `${country} all`.toLowerCase(),
      key: `c-${countrySlug}`,
      params: { country: countrySlug },
    });
    for (const c of cities) {
      const label = c.state
        ? `${c.city}, ${c.state} — ${c.country}`
        : `${c.city} — ${c.country}`;
      options.push({
        kind: 'city',
        label,
        count: 1,
        search: `${c.city} ${c.state} ${c.country}`.toLowerCase(),
        key: `city-${c.countrySlug}-${c.citySlug}`,
        params: { country: c.countrySlug, city: c.citySlug },
      });
    }
  }
  return options;
}
