import { test, expect } from '@playwright/test';

test('destination → filter → sort → detail → availability success', async ({ page }) => {
  await page.goto('/');

  // Step 1: Destination — type "Chicago" into the combobox and pick the city option.
  // The input carries role="combobox" and placeholder="Search a city or country…" but
  // no aria-label, so getByPlaceholder is the most reliable accessible locator.
  const combobox = page.getByPlaceholder('Search a city or country…');
  await combobox.click();
  await combobox.fill('Chicago');
  // The listbox option text: "Chicago, IL — USA"
  await page.getByRole('option', { name: 'Chicago, IL — USA' }).click();

  // Step 2: Star filter — click "5★" to filter to 5-star hotels only
  const starGroup = page.getByRole('group', { name: 'Minimum star rating' });
  await starGroup.getByRole('button', { name: '5★' }).click();

  // Step 3: Sort — choose "Price: Low to High".
  // Two <select aria-label="Sort hotels"> exist: one desktop (visible) + one mobile (hidden).
  // Use .first() to target the desktop/visible instance without relying on CSS class names.
  await page.getByLabel('Sort hotels').first().selectOption('price-asc');

  // Step 4: Open the first hotel — The Grand Luminary (hotel-01, 5★, Chicago)
  await page.getByRole('link', { name: /The Grand Luminary/ }).click();

  // Step 5: Hotel detail page — heading visible
  await expect(page.getByRole('heading', { name: 'The Grand Luminary', level: 1 })).toBeVisible();

  // Step 6: Availability resolves — demo dates (2026-07-10 → 2026-07-12) are pre-seeded.
  // At least one room card shows the "Available" badge and its price.
  await expect(page.getByText('Available').first()).toBeVisible();
  await expect(page.getByText('$199').first()).toBeVisible();
});
