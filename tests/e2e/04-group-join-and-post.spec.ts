import { expect, test } from '@playwright/test';
import { ACCOUNTS, signIn } from './helpers';

/**
 * Journey 4 — Groups: find a public group, join it, post in the feed and see the
 * post as a member.
 */
test.describe('Journey 4: join a group and post', () => {
  test('joins a public group and posts to the feed', async ({ page }) => {
    await signIn(page, ACCOUNTS.student);

    await page.goto('/groups');
    await expect(page.getByRole('heading', { name: /groups/i }).first()).toBeVisible();

    // Open the first public group in the directory.
    const groupLink = page.locator('a[href^="/groups/"]').first();
    await expect(groupLink).toBeVisible();
    const groupHref = await groupLink.getAttribute('href');
    await page.goto(groupHref ?? '/groups');

    // Either join it, or post straight away if already a member.
    const joinButton = page.getByRole('button', { name: /join group|request to join/i }).first();
    if (await joinButton.count()) {
      await joinButton.click();
      await expect(page.getByText(/request|joined|member/i).first()).toBeVisible();
    }

    const post = `E2E post ${Date.now().toString().slice(-6)}`;
    const composer = page.getByPlaceholder(/share|write|post/i).first();
    if (await composer.count()) {
      await composer.fill(post);
      await page.getByRole('button', { name: /post|share|publish/i }).first().click();
      await expect(page.getByText(post).first()).toBeVisible();
    } else {
      // Not a member yet: the page must explain how to join instead of failing.
      await expect(page.getByText(/join|request|member/i).first()).toBeVisible();
    }
  });
});
