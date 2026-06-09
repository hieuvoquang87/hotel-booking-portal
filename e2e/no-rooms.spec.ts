import { test, expect } from '@playwright/test';

test('hotel with no availability shows no-rooms empty state', async ({ page }) => {
  await page.goto('/');

  // Step 1: Pick Chicago as destination.
  const combobox = page.getByPlaceholder('Search a city or country…');
  await combobox.click();
  await combobox.fill('Chicago');
  await page.getByRole('option', { name: 'Chicago, IL — USA' }).click();

  // Step 2: Open "Magnolia Place Chicago" (hotel-04 — has no available_dates).
  // The link aria-label includes the hotel name as the first segment.
  await expect(page.getByRole('link', { name: /Magnolia Place Chicago/ })).toBeVisible();
  await page.getByRole('link', { name: /Magnolia Place Chicago/ }).click();

  // Step 3: Hotel detail heading is visible.
  await expect(
    page.getByRole('heading', { name: 'Magnolia Place Chicago', level: 1 }),
  ).toBeVisible();

  // Step 4: Demo dates (2026-07-10 → 2026-07-12) auto-populate.
  // Magnolia Place Chicago has empty available_dates so no rooms match — the
  // no-rooms EmptyState (role="status") should appear.
  // Use the role="status" card scoped locator to avoid the sr-only aria-live element
  // that also carries the same text.
  await expect(page.getByRole('status').getByText('No rooms available for these dates')).toBeVisible();
});
