import { readFileSync } from 'node:fs';

it('defines the custom design-spec tokens', () => {
  const css = readFileSync('app/globals.css', 'utf8');
  expect(css).toMatch(/--success:/);
  expect(css).toMatch(/--star:/);
  expect(css).toMatch(/--color-star:\s*var\(--star\)/);
});
