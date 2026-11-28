import { expect, test } from '@playwright/test';

test.skip(
  !process.env.VITE_BACKEND_URL || !process.env.P22_DS001_TEST_USERNAME || !process.env.P22_DS001_TEST_PASSWORD,
  'Set VITE_BACKEND_URL and P22_DS001_TEST_USERNAME/PASSWORD for the isolated DS-001 API run.',
);

test('searches and sorts controlled archive records through Laravel and PostgreSQL', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Nume de utilizator').fill(process.env.P22_DS001_TEST_USERNAME);
  await page.getByLabel('Parolă').fill(process.env.P22_DS001_TEST_PASSWORD);
  await page.getByRole('button', { name: 'Autentificare' }).click();
  await expect(page.getByRole('heading', { name: 'Căutare în arhivă', exact: true })).toBeVisible();

  await page.getByLabel('Text de căutare').fill('controlat');
  await page.getByRole('button', { name: 'Caută' }).click();
  await expect(page.locator('[data-testid="total-result-count"]')).toContainText('8 documente');

  await page.getByLabel('Ordonează rezultatele').selectOption('newest');
  const results = page.locator('[data-testid="search-result"]');
  await expect(results).toHaveCount(6);
  await expect(results.first()).toHaveAttribute('data-act-date', '2026-01-01');
  await page.getByRole('button', { name: 'Pagina următoare' }).click();
  await expect(page.getByText('Pagina 2 din 2')).toBeVisible();
  await expect(results).toHaveCount(2);
  await expect(results.first()).toHaveAttribute('data-act-date', '2020-01-01');
});
