import { hotelIdToHue, hotelPlaceholderGradient } from '@/lib/colors';

describe('hotelIdToHue', () => {
  it('returns a number 0–359 for a string id', () => {
    const hue = hotelIdToHue('hotel-1');
    expect(hue).toBeGreaterThanOrEqual(0);
    expect(hue).toBeLessThanOrEqual(359);
  });

  it('is deterministic — same id → same hue', () => {
    expect(hotelIdToHue('hotel-1')).toBe(hotelIdToHue('hotel-1'));
  });

  it('distributes different ids across the hue range', () => {
    const hues = ['h1', 'h2', 'h3', 'h4', 'h5'].map(hotelIdToHue);
    const unique = new Set(hues);
    // With 5 random-ish ids, at least 3 should be different (probabilistic but
    // extremely likely; if this flakes the hash is degenerate).
    expect(unique.size).toBeGreaterThanOrEqual(3);
  });
});

describe('hotelPlaceholderGradient', () => {
  it('returns a CSS gradient string with the hue baked in', () => {
    const grad = hotelPlaceholderGradient('hotel-1');
    expect(grad).toContain('linear-gradient(');
    expect(grad).toContain('hsl(');
  });
});
