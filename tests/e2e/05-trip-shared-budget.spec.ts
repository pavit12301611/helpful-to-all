import { expect, test } from '@playwright/test';
import { ACCOUNTS, signIn } from './helpers';

/**
 * Journey 5 — Trip planner: plan a trip, add a shared expense and see the split
 * balance work out.
 */
test.describe('Journey 5: trip with a shared budget', () => {
  test('creates a trip, adds an itinerary item and a shared expense', async ({ page }) => {
    await signIn(page, ACCOUNTS.student);

    const trip = `E2E trip ${Date.now().toString().slice(-6)}`;
    await page.goto('/trips');
    await page.getByLabel('Trip name').fill(trip);
    await page.getByLabel('Destination').fill('Kochi, India');
    await page.getByLabel('Total budget').fill('50000');
    await page.getByRole('button', { name: /create trip/i }).click();

    // The new trip appears in the list; open it.
    await expect(page.getByRole('link', { name: trip }).first()).toBeVisible();
    await page.getByRole('link', { name: trip }).first().click();
    await expect(page).toHaveURL(/\/trips\/[a-z0-9]+/);

    // Add an itinerary item.
    const activity = 'Sunset boat ride';
    await page.getByLabel('What').fill(activity);
    await page.getByLabel('Where').fill('Marine Drive');
    await page.getByRole('button', { name: /add item/i }).first().click();
    await expect(page.getByText(activity).first()).toBeVisible();

    // Add a shared expense and check the balance panel reacts.
    await page.getByRole('tab', { name: /budget/i }).click();
    await page.getByLabel('What for').fill('Dinner');
    await page.getByLabel('Amount').fill('2000');
    await page.getByRole('button', { name: /add expense/i }).click();

    await expect(page.getByText(/Dinner/).first()).toBeVisible();
    await expect(page.getByText(/share|gets back|owes/i).first()).toBeVisible();

    // Packing list works too.
    await page.getByRole('tab', { name: /packing/i }).click();
    await page.getByLabel('Item').first().fill('Passport');
    await page.getByRole('button', { name: /add item/i }).first().click();
    await expect(page.getByText('Passport').first()).toBeVisible();
  });
});
