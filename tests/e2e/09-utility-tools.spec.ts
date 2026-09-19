import { expect, test } from '@playwright/test';
import { ACCOUNTS, signIn } from './helpers';

/**
 * Journey 9 — Utility tools: generate a password and a QR code, and confirm the
 * privacy promise (nothing typed is stored, and the page says so).
 */
test.describe('Journey 9: utility tools run in the browser', () => {
  test('generates a password without a server round trip', async ({ page }) => {
    await signIn(page, ACCOUNTS.student);
    await page.goto('/tools?tool=password');

    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));

    await page.getByRole('button', { name: /generate password/i }).click();
    const generated = await page.locator('pre').first().innerText();
    expect(generated.length).toBeGreaterThanOrEqual(12);
    expect(requests.some((url) => url.includes('/api/') && !url.includes('_next'))).toBe(false);

    await expect(page.getByText(/never receives, stores or logs/i)).toBeVisible();
  });

  test('renders a QR image and offers a download', async ({ page }) => {
    await signIn(page, ACCOUNTS.student);
    await page.goto('/tools?tool=qr');

    await page.getByLabel('Text or link').fill('https://openhub.example/hello');
    const image = page.locator('img[alt^="QR code"]').first();
    await expect(image).toBeVisible();

    const response = await page.request.get('/api/tools/qr?text=hello&size=192');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('image/png');

    await expect(page.getByRole('link', { name: /download png/i })).toBeVisible();
  });

  test('converts units and checks colour contrast', async ({ page }) => {
    await signIn(page, ACCOUNTS.student);

    await page.goto('/tools?tool=units');
    await page.getByLabel('Amount').fill('2');
    await expect(page.getByText(/=/).first()).toBeVisible();

    await page.goto('/tools?tool=color');
    await page.getByLabel('Colour (HEX)').fill('#000000');
    await page.getByLabel('Background (HEX)').fill('#ffffff');
    await expect(page.getByText(/contrast 21:1/i)).toBeVisible();
  });
});
