import { buildSlugLookup, slugify } from '@/lib/slug';

describe('slugify', () => {
  it.each([
    ['New York', 'new-york'],
    ['United Kingdom', 'united-kingdom'],
    ['Île-de-France', 'ile-de-france'],
    ['USA', 'usa'],
    ['  Spaced  Out  ', 'spaced-out'],
  ])('slugifies %s -> %s', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe('buildSlugLookup', () => {
  it('maps slugs back to original values', () => {
    const lookup = buildSlugLookup(['United Kingdom', 'New York']);
    expect(lookup.get('united-kingdom')).toBe('United Kingdom');
    expect(lookup.get('new-york')).toBe('New York');
    expect(lookup.get('nope')).toBeUndefined();
  });
});
