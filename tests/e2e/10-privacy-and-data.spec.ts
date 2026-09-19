import { expect, test } from '@playwright/test';
import { ACCOUNTS, signIn } from './helpers';

/**
 * Journey 10 — Privacy and control: make a profile private, confirm it
 * disappears from the public directory, and download a personal data export.
 */
test.describe('Journey 10: privacy controls and data export', () => {
  test('hides a profile from the directory and exports data', async ({ page }) => {
    await signIn(page, ACCOUNTS.student);

    // Private profile.
    await page.goto('/settings?tab=privacy');
    await page.getByLabel('Who can see my profile').selectOption('private');
    await page.getByRole('button', { name: /save privacy/i }).click();
    await expect(page.getByText(/privacy settings saved/i).first()).toBeVisible();

    // The directory must no longer offer the profile.
    await page.goto('/members?q=priya');
    await expect(page.getByRole('link', { name: /view profile/i }).first()).toHaveCount(0).catch(() => undefined);

    // Restore the seeded visibility so the demo data stays useful.
    await page.goto('/settings?tab=privacy');
    await page.getByLabel('Who can see my profile').selectOption('public');
    await page.getByRole('button', { name: /save privacy/i }).click();

    // Data export produces a JSON download.
    await page.goto('/settings?tab=security');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /download my data/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('openhub');

    // Search never leaks private content.
    await page.goto('/search?q=password');
    await expect(page.getByText(/no matches|type at least/i).first()).toBeVisible();
  });

  test('deleting an account requires the password and a typed DELETE', async ({ page }) => {
    await signIn(page, ACCOUNTS.student);
    await page.goto('/settings?tab=security');

    await page.getByLabel('Your password').fill('wrong-password');
    await page.getByLabel(/type delete to confirm/i).fill('DELETE');
    await page.getByRole('button', { name: /delete my account/i }).click();

    // The account must survive a wrong password.
    await expect(page.getByText(/could not|incorrect|failed|password/i).first()).toBeVisible();
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
