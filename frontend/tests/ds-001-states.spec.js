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
  await page.route('**/src/components/archiveSearchRepository.js*', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: 'export const archiveSearchPageSize = 6; export async function loadArchiveCatalog(){return {documents:[],dossiers:[],types:[],years:[]}} export async function searchArchive(){return {items:[],total:0,page:1,pageCount:1}}',
  }));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Arhiva este goală' })).toBeVisible();
  await expect(page.getByText('Documentele aprobate vor apărea aici după ce sunt adăugate în arhivă.')).toBeVisible();
});

test('shows a recoverable error when the archive catalog cannot load', async ({ page }) => {
  await interceptUser(page);
  await page.route('**/src/components/archiveSearchRepository.js*', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: 'export const archiveSearchPageSize = 6; export async function loadArchiveCatalog(){throw new Error("synthetic failure")} export async function searchArchive(){return {items:[],total:0,page:1,pageCount:1}}',
  }));
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Arhiva nu a putut fi încărcată. Încearcă din nou.');
  await expect(page.getByRole('button', { name: 'Reîncearcă' })).toBeEnabled();
});
