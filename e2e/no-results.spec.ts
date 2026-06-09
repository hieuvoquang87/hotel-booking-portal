import { test, expect } from '@playwright/test';

test('filters that match no hotels show empty state with reset action', async ({ page }) => {
  await page.goto('/');

  // Step 1: Pick Chicago as destination.
  const combobox = page.getByPlaceholder('Search a city or country…');
  await combobox.click();
  await combobox.fill('Chicago');
  await page.getByRole('option', { name: 'Chicago, IL — USA' }).click();

  // Step 2: Wait for hotel cards to appear so we know hotels loaded.
  await expect(page.getByRole('link', { name: /The Grand Luminary/ })).toBeVisible();

  // Step 3: Set an impossibly high minimum price via the "Minimum price" input.
  // PriceRange uses aria-label="Minimum price" on the input.
  const minPriceInput = page.getByLabel('Minimum price');
  await minPriceInput.fill('100000');
  await minPriceInput.press('Enter');

  // Step 4: The no-results EmptyState should now be visible.
  await expect(page.getByText('No hotels found')).toBeVisible();
  await expect(page.getByText('Try widening your filters to see more stays.')).toBeVisible();

  // Step 5: The "Reset filters" action button should be present and clickable.
  await expect(page.getByRole('button', { name: 'Reset filters' })).toBeVisible();
});
