import type { Location } from '@/types/domain';
import { buildDestinationOptions } from '@/lib/destinations';

const loc = (
  city: string,
  state: string,
  country: string,
  citySlug: string,
  countrySlug: string,
): Location => ({ city, state, country, citySlug, countrySlug });

describe('buildDestinationOptions', () => {
  const locations: Location[] = [
    loc('Chicago', 'IL', 'USA', 'chicago', 'usa'),
    loc('New York', 'NY', 'USA', 'new-york', 'usa'),
    loc('London', '', 'United Kingdom', 'london', 'united-kingdom'),
  ];

  it('emits a country row then its city rows, per country', () => {
    const opts = buildDestinationOptions(locations);
    expect(opts.map((o) => [o.kind, o.label])).toEqual([
      ['country', 'All hotels in USA'],
      ['city', 'Chicago, IL — USA'],
      ['city', 'New York, NY — USA'],
      ['country', 'All hotels in United Kingdom'],
      ['city', 'London — United Kingdom'],
    ]);
  });

  it('country rows carry country-only params; city rows carry country+city', () => {
    const [usa, chicago] = buildDestinationOptions(locations);
    expect(usa.params).toEqual({ country: 'usa' });
    expect(chicago.params).toEqual({ country: 'usa', city: 'chicago' });
  });

  it('search text is lowercase and includes city, state, and country', () => {
    const chicago = buildDestinationOptions(locations)[1];
    expect(chicago.search).toContain('chicago');
    expect(chicago.search).toContain('usa');
  });

  it('produces unique keys', () => {
    const keys = buildDestinationOptions(locations).map((o) => o.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
