import { test, expect } from '@playwright/test';
import path from 'node:path';

test.skip(
  !process.env.M1A_TEST_USERNAME || !process.env.M1A_TEST_PASSWORD,
  'Set M1A_TEST_USERNAME and M1A_TEST_PASSWORD to run the synthetic OCR workflow against Laravel.',
);

test('uploads a synthetic page, refreshes persisted OCR status, and opens audited OCR and preview', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-light', 'Run the real workflow once to avoid duplicate drafts.');
  test.setTimeout(120_000);
  const deliveryStatuses = [];
  page.on('response', (response) => {
    if (new URL(response.url()).pathname.startsWith('/api/documents/deliver/')) deliveryStatuses.push(response.status());
  });

  await page.goto('/');
  await page.getByLabel('Nume de utilizator').fill(process.env.M1A_TEST_USERNAME);
  await page.getByLabel('Parolă').fill(process.env.M1A_TEST_PASSWORD);
  await page.getByRole('button', { name: 'Autentificare' }).click();
  await expect(page.getByRole('heading', { name: 'Căutare în arhivă' })).toBeVisible();

  await page.getByRole('button', { name: 'Încarcă documente' }).click();
  await page.getByRole('button', { name: 'Colecție de imagini JPG și PNG' }).click();
  await page.locator('#draft-files').setInputFiles(path.resolve('fixtures/romanian.png'));
  await page.getByRole('button', { name: 'Încarcă documentul' }).click();

  const status = page.getByRole('button', { name: 'Actualizează starea' });
  await expect.poll(async () => {
    const label = await page.locator('.draft-status').textContent();
    if (label?.trim() && label.trim() !== 'Gata de revizuit') await status.click();
    return label?.trim();
  }, { timeout: 90_000, intervals: [1000, 2000, 3000] }).toBe('Gata de revizuit');

  await page.getByRole('button', { name: 'Vezi rezultatele OCR' }).click();
  await expect(page.getByRole('heading', { name: 'Rezultate OCR' })).toBeVisible();
  await expect(page.getByText(/Încredere medie/)).toBeVisible();
  await expect(page.getByText(/Casete de delimitare/)).toBeVisible();
  const previewImage = page.getByRole('img', { name: 'Pagina 1 din document' });
  await expect(previewImage).toBeVisible();
  await expect.poll(() => previewImage.evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
  await expect.poll(() => deliveryStatuses.at(-1)).toBe(200);
});
