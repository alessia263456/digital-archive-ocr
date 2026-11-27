import { expect, test } from '@playwright/test';

async function signInAs(page, role = 'admin') {
  await page.route('**/api/user', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ id: 1, username: `test-${role}`, role }),
  }));
  await page.goto('/');
}

test('searches, sorts, highlights, paginates, and clears archive filters', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await signInAs(page);

  await expect(page.getByRole('heading', { name: 'Căutare în arhivă', exact: true })).toBeVisible();
  await expect(page.getByLabel('Etichete')).toBeVisible();
  await expect(page.getByLabel('Nume din acte')).toBeVisible();
  for (const name of ['După tipul documentului', 'După dosar fizic', 'După an', 'Adăugate recent']) {
    await expect(page.getByRole('heading', { name })).toBeVisible();
  }
  await page.screenshot({ path: testInfo.outputPath('DS-001.1366-home.png') });
  if (testInfo.project.name.startsWith('desktop-')) {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.screenshot({ path: testInfo.outputPath('DS-001.1600-home.png') });
    await page.setViewportSize({ width: 1366, height: 768 });
  }
  const recent = page.locator('[data-testid="recent-documents"]');
  await expect(recent.locator('[data-testid="browse-document"]:visible')).toHaveCount(4);
  const recentDates = await recent.locator('time[data-added-date]').evaluateAll((items) => items.map((item) => item.dataset.addedDate));
  expect(recentDates).toEqual([...recentDates].sort().reverse());
  await page.getByRole('button', { name: 'Vezi toate' }).first().click();
  await expect(page.getByRole('button', { name: 'Vezi mai puține' }).first()).toHaveAttribute('aria-expanded', 'true');

  await page.getByRole('button', { name: 'Procură', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Procură', exact: true })).toBeVisible();
  await expect(page.locator('[data-testid="total-result-count"]')).toContainText('8 documente');
  await page.getByRole('button', { name: 'Șterge căutarea' }).click();
  await page.getByRole('button', { name: 'Dosar nr. 004/2026 · Procură' }).click();
  await expect(page.getByRole('heading', { name: 'Dosar nr. 004/2026' })).toBeVisible();
  await expect(page.locator('[data-testid="total-result-count"]')).toContainText('1 document');
  await page.getByRole('button', { name: 'Șterge căutarea' }).click();
  await page.getByRole('button', { name: '2026', exact: true }).click();
  await expect(page.getByRole('heading', { name: '2026', exact: true })).toBeVisible();
  await expect(page.locator('[data-testid="total-result-count"]')).toContainText('3 documente');
  await page.getByRole('button', { name: 'Șterge căutarea' }).click();

  await page.getByLabel('Text de căutare').fill('procură');
  await page.getByRole('button', { name: 'Caută' }).click();
  await expect(page.getByText('Se caută în arhivă…')).toBeVisible();

  const resultCards = page.locator('[data-testid="search-result"]');
  await expect(resultCards.first()).toBeVisible();
  await expect(page.locator('[data-testid="total-result-count"]')).toContainText(/\d+/);
  await expect(page.locator('[data-testid="search-results"] mark').first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('DS-001.1366-search.png') });

  const sort = page.getByLabel('Ordonează rezultatele');
  await sort.selectOption('oldest');
  await expect(resultCards.first()).toBeVisible();
  const dates = await resultCards.evaluateAll((cards) => cards.map((card) => card.dataset.actDate));
  expect(dates).toEqual([...dates].sort());
  await sort.selectOption('newest');
  await expect(resultCards.first()).toBeVisible();
  const newestDates = await resultCards.evaluateAll((cards) => cards.map((card) => card.dataset.actDate));
  expect(newestDates).toEqual([...newestDates].sort().reverse());

  await page.getByRole('button', { name: 'Pagina următoare' }).click();
  await expect(page.getByText(/Pagina 2 din/)).toBeVisible();
  await page.getByRole('button', { name: 'Pagina anterioară' }).click();
  await expect(page.getByText(/Pagina 1 din/)).toBeVisible();

  await page.getByLabel('Tipul documentului').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Șterge filtrele' }).click();
  await expect(page.getByLabel('Tipul documentului')).toHaveValue('all');
  await expect(page.getByLabel('Anul actului')).toHaveValue('all');
  await expect(page.getByLabel('Dosar fizic')).toHaveValue('all');
  await page.getByLabel('Etichete').fill('succesiune');
  await expect(page.locator('[data-testid="total-result-count"]')).toContainText('1 document');
  await page.getByRole('button', { name: 'Șterge filtrele' }).click();
  await page.getByLabel('Nume din acte').fill('Persoană sintetică E');
  await expect(page.locator('[data-testid="total-result-count"]')).toContainText('1 document');
});

test('keeps the archive browse layout and sidebar collapse usable', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await signInAs(page, 'arhivar');
  await expect(page.getByLabel('Etichete')).toBeVisible();
  await expect(page.getByLabel('Nume din acte')).toBeVisible();
  const sidebar = page.getByRole('navigation', { name: 'Navigare principală' });
  await expect(sidebar).toBeVisible();
  const collapse = page.getByRole('button', { name: 'Minimizează meniul' });
  await collapse.click();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-sidebar', 'minimized');
  await page.getByRole('button', { name: 'Extinde meniul' }).click();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-sidebar', 'expanded');
});

test('hides Signatory Party and tag search fields for Cititor', async ({ page }) => {
  await signInAs(page, 'cititor');
  await expect(page.getByLabel('Nume din acte')).toHaveCount(0);
  await expect(page.getByLabel('Etichete')).toHaveCount(0);
  await page.getByLabel('Text de căutare').fill('procură');
  await page.getByRole('button', { name: 'Caută' }).click();
  await expect(page.locator('[data-testid="search-result"]')).toHaveCount(6);
  await expect(page.getByText(/Text disponibil după anonimizare/).first()).toBeVisible();
  await expect(page.locator('[data-testid="search-results"] [data-admin-excerpt]')).toHaveCount(0);
});

test('shows a clear no-results message for an unmatched search', async ({ page }) => {
  await signInAs(page, 'admin');
  await page.getByLabel('Text de căutare').fill('termen-inexistent');
  await page.getByRole('button', { name: 'Caută' }).click();
  await expect(page.getByRole('status')).toContainText('Nu au fost găsite documente.');
  await expect(page.locator('[data-testid="total-result-count"]')).toContainText('0 documente');
});

test('keeps search and filters usable at a narrow width', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signInAs(page, 'admin');
  await expect(page.getByLabel('Text de căutare')).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Filtre de arhivă' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: testInfo.outputPath('DS-001.mobile.png') });
  await page.getByLabel('Text de căutare').fill('procură');
  await page.getByRole('button', { name: 'Caută' }).click();
  await expect(page.locator('[data-testid="search-result"]').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
