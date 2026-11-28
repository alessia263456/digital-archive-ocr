import { expect, test } from '@playwright/test';

async function interceptUser(page) {
  await page.route('**/api/user', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ id: 3, username: 'stare-test', role: 'admin' }),
  }));
}

test('shows the empty archive state when the catalog has no approved records', async ({ page }) => {
  await interceptUser(page);
  await page.route('**/api/archive/browse', (route) => route.fulfill({ json: {
    document_types: [], physical_dossiers: [], years: [], recent: [],
  } }));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Arhiva este goală' })).toBeVisible();
  await expect(page.getByText('Documentele aprobate vor apărea aici după ce sunt adăugate în arhivă.')).toBeVisible();
});

test('shows a recoverable error when the archive catalog cannot load', async ({ page }) => {
  await interceptUser(page);
  await page.route('**/api/archive/browse', (route) => route.fulfill({ status: 503, json: {
    eroare: 'Arhiva nu a putut fi încărcată.', cod: 'eroare_arhiva',
  } }));
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Arhiva nu a putut fi încărcată. Încearcă din nou.');
  await expect(page.getByRole('button', { name: 'Reîncearcă' })).toBeEnabled();
});
