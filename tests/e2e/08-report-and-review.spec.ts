import { expect, test } from '@playwright/test';
import { ACCOUNTS, DEMO_PASSWORD, signIn } from './helpers';

/**
 * Journey 8 — Safety net: a member reports content, a moderator reviews the
 * report and records an outcome.
 */
test.describe('Journey 8: report content and review it', () => {
  test('reports a help post and reviews it as a moderator', async ({ page, context }) => {
    await signIn(page, ACCOUNTS.student);

    await page.goto('/help');
    const firstPost = page.locator('a[href^="/help/"]').first();
    await expect(firstPost).toBeVisible();
    await firstPost.click();

    const reportButton = page.getByRole('button', { name: /report/i }).first();
    await expect(reportButton).toBeVisible();
    await reportButton.click();

    if (await page.getByLabel(/reason/i).count()) {
      await page.getByLabel(/reason/i).first().selectOption({ index: 1 });
    }
    if (await page.getByLabel(/details|explain/i).count()) {
      await page.getByLabel(/details|explain/i).first().fill('E2E: checking that reports reach the moderation queue.');
    }
    await page.getByRole('button', { name: /send report|submit|report/i }).last().click();

    // A moderator sees it in the queue and records an outcome.
    const moderator = await context.newPage();
    await moderator.goto('/login');
    await moderator.getByLabel('Email address').fill(ACCOUNTS.admin);
    await moderator.getByLabel('Password').fill(DEMO_PASSWORD);
    await moderator.getByRole('button', { name: 'Sign in' }).click();

    await moderator.goto('/admin?tab=queue');
    await expect(moderator.getByText(/reported by/i).first()).toBeVisible();

    await moderator.getByLabel('Note for the reporter').first().fill('Reviewed during automated testing.');
    await moderator.getByRole('button', { name: /save outcome/i }).first().click();
    await expect(moderator.getByText(/report updated|reviewed/i).first()).toBeVisible();
  });
});
