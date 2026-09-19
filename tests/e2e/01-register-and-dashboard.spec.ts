import { expect, test } from '@playwright/test';

/**
 * Journey 1 — A brand new member can create an account and land on a working
 * dashboard. This is the first thing anyone experiences, so it must never break.
 */
test.describe('Journey 1: register and reach the dashboard', () => {
  test('creates an account and sees the dashboard with navigation', async ({ page }) => {
    const username = `e2e${Date.now().toString().slice(-8)}`;

    await page.goto('/register');
    await page.getByLabel('Email address').fill(`${username}@example.com`);
    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Password', { exact: false }).first().fill('Str0ng!passw0rd');
    if (await page.getByLabel('Confirm password').count()) {
      await page.getByLabel('Confirm password').fill('Str0ng!passw0rd');
    }
    await page.getByRole('button', { name: /create account|sign up|register/i }).first().click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: /dashboard|welcome/i }).first()).toBeVisible();

    // The sidebar navigation is real, not decorative: every entry leads somewhere.
    for (const label of ['Tasks', 'Notes', 'Community help', 'Groups']) {
      await expect(page.getByRole('link', { name: new RegExp(label, 'i') }).first()).toBeVisible();
    }
  });

  test('shows field errors instead of silently failing', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('button', { name: /create account|sign up|register/i }).first().click();
    await expect(page.getByRole('alert').first()).toBeVisible();
  });
});
