import { expect, test } from '@playwright/test';

async function signInAs(page, role = 'admin') {
  const searchRequests = [];
  await page.route('**/api/user', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ id: 1, username: `test-${role}`, role }),
  }));
  const records = Array.from({ length: 8 }, (_, index) => ({
    document_id: `doc-${index + 1}`, version_id: `ver-${index + 1}`, version_number: 1,
    document_type: 'Procură', act_date: index < 3 ? `2026-0${index + 1}-01` : `202${index % 4}-0${index % 9 + 1}-01`,
    act_number: String(index + 1), physical_dossier_number: `Dosar nr. ${String(index + 4).padStart(3, '0')}/2026`,
    physical_dossier_id: index === 0 ? 4 : index + 4, inventory_number: `INV-${index}`, approved_at: `2026-01-0${index + 1}T10:00:00Z`,
    highlight: `<mark>procură</mark> Persoană sintetică ${index === 0 ? 'E' : index + 1}`, tags: index === 0 ? ['succesiune'] : [],
  }));
  await page.route('**/api/archive/browse', (route) => route.fulfill({ json: {
    document_types: [{ document_type: 'Procură', total: 8 }],
    physical_dossiers: records.map((row) => ({ id: row.physical_dossier_id, physical_dossier_number: row.physical_dossier_number, context: row.document_type, total: 1 })),
    years: [{ year: 2026, total: 3 }, { year: 2023, total: 2 }, { year: 2022, total: 1 }, { year: 2021, total: 1 }, { year: 2020, total: 1 }], recent: records.slice().reverse().slice(0, 6),
  } }));
  await page.route('**/api/documents?*', async (route) => {
    const url = new URL(route.request().url());
    searchRequests.push(url);
    let filtered = records.filter((row) => !url.searchParams.get('q') || row.highlight.toLowerCase().includes(url.searchParams.get('q').toLowerCase()));
    if (url.searchParams.get('document_type')) filtered = filtered.filter((row) => row.document_type === url.searchParams.get('document_type'));
    if (url.searchParams.get('physical_dossier_id')) filtered = filtered.filter((row) => String(row.physical_dossier_id) === url.searchParams.get('physical_dossier_id'));
    if (url.searchParams.get('year')) filtered = filtered.filter((row) => row.act_date.startsWith(url.searchParams.get('year')));
    if (url.searchParams.get('tag')) filtered = filtered.filter((row) => row.tags.includes(url.searchParams.get('tag')));
    if (url.searchParams.get('party')) filtered = filtered.filter((row) => row.highlight.includes('Persoană sintetică E'));
    const sort = url.searchParams.get('sort');
    if (sort === 'oldest') filtered.sort((a, b) => a.act_date.localeCompare(b.act_date));
    else if (sort === 'newest') filtered.sort((a, b) => b.act_date.localeCompare(a.act_date));
    const total = filtered.length, perPage = Number(url.searchParams.get('per_page') || 20), current = Number(url.searchParams.get('page') || 1);
    const body = { data: filtered.slice((current - 1) * perPage, current * perPage), meta: { current_page: current, per_page: perPage, total, last_page: Math.max(1, Math.ceil(total / perPage)) } };
    await new Promise((resolve) => setTimeout(resolve, 150));
    await route.fulfill({ json: body });
  });
  await page.goto('/');
  return searchRequests;
}

test('searches, sorts, highlights, paginates, and clears archive filters', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  const searchRequests = await signInAs(page);

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
  expect(searchRequests.at(-1).searchParams.get('document_type')).toBe('Procură');
  expect(searchRequests.at(-1).searchParams.get('sort')).toBe('newest');
  await page.getByRole('button', { name: 'Șterge căutarea' }).click();
  await page.getByRole('button', { name: 'Dosar nr. 004/2026 · Procură' }).click();
  await expect(page.getByRole('heading', { name: 'Dosar nr. 004/2026' })).toBeVisible();
  await expect(page.locator('[data-testid="total-result-count"]')).toContainText('1 document');
  await expect(page.locator('.archive-result-excerpt')).toHaveCount(0);
  await expect(page.locator('.archive-result-meta').first()).toContainText('Data: 01.01.2026');
  await expect(page.locator('.archive-result-meta').first()).toContainText('Dosar: 004/2026');
  await expect(page.locator('.archive-result-heading').first()).toContainText('Act nr. 1');
  await expect(page.locator('.archive-result-heading').first()).toContainText('Procură');
  expect(searchRequests.at(-1).searchParams.get('physical_dossier_id')).toBe('4');
  await page.getByRole('button', { name: 'Șterge căutarea' }).click();
  await page.getByRole('button', { name: '2026', exact: true }).click();
  await expect(page.getByRole('heading', { name: '2026', exact: true })).toBeVisible();
  await expect(page.locator('[data-testid="total-result-count"]')).toContainText('3 documente');
  await expect(page.locator('.archive-result-excerpt')).toHaveCount(0);
  expect(searchRequests.at(-1).searchParams.get('year')).toBe('2026');
  await page.getByRole('button', { name: 'Șterge căutarea' }).click();

  await page.getByLabel('Text de căutare').fill('procură');
  await page.getByRole('button', { name: 'Caută' }).click();
  await expect(page.getByText('Se caută în arhivă…')).toBeVisible();

  const resultCards = page.locator('[data-testid="search-result"]');
  await expect(resultCards.first()).toBeVisible();
  await expect(page.locator('[data-testid="total-result-count"]')).toContainText(/\d+/);
  await expect(page.locator('[data-testid="search-results"] mark').first()).toBeVisible();
  await expect(page.locator('.archive-result-excerpt').first()).toBeVisible();
  await expect(page.locator('.archive-result-meta').first()).toContainText('Data:');
  await expect(page.locator('.archive-result-meta').first()).toContainText('Dosar:');
  await expect(page.locator('.archive-result-meta').first()).not.toContainText('Inventar');
  await expect(page.locator('.archive-result-meta').first()).not.toContainText('Nr.');
  await expect(page.getByText('<mark>', { exact: true })).toHaveCount(0);
  expect(searchRequests.at(-1).searchParams.get('q')).toBe('procură');
  expect(searchRequests.at(-1).searchParams.get('sort')).toBe('relevance');
  await page.screenshot({ path: testInfo.outputPath('DS-001.1366-search.png') });

  const sort = page.getByLabel('Ordonează rezultatele');
  await sort.selectOption('oldest');
  await expect(resultCards.first()).toBeVisible();
  expect(searchRequests.at(-1).searchParams.get('sort')).toBe('oldest');
  const dates = await resultCards.evaluateAll((cards) => cards.map((card) => card.dataset.actDate));
  expect(dates).toEqual([...dates].sort());
  await sort.selectOption('newest');
  await expect(resultCards.first()).toBeVisible();
  expect(searchRequests.at(-1).searchParams.get('sort')).toBe('newest');
  const newestDates = await resultCards.evaluateAll((cards) => cards.map((card) => card.dataset.actDate));
  expect(newestDates).toEqual([...newestDates].sort().reverse());

  await page.getByRole('button', { name: 'Pagina următoare' }).click();
  await expect(page.getByText(/Pagina 2 din/)).toBeVisible();
  expect(searchRequests.at(-1).searchParams.get('page')).toBe('2');
  await page.getByRole('button', { name: 'Pagina anterioară' }).click();
  await expect(page.getByText(/Pagina 1 din/)).toBeVisible();
  expect(searchRequests.at(-1).searchParams.get('page')).toBe('1');

  await page.getByLabel('Tipul documentului').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Șterge filtrele' }).click();
  await expect(page.getByLabel('Tipul documentului')).toHaveValue('all');
  await expect(page.getByLabel('Anul actului')).toHaveValue('all');
  await expect(page.getByLabel('Dosar fizic')).toHaveValue('all');
  await page.getByLabel('Etichete').fill('succesiune');
  await expect(page.locator('[data-testid="total-result-count"]')).toContainText('1 document');
  expect(searchRequests.at(-1).searchParams.get('tag')).toBe('succesiune');
  await page.getByRole('button', { name: 'Șterge filtrele' }).click();
  await page.getByLabel('Nume din acte').fill('Persoană sintetică E');
  await expect(page.locator('[data-testid="total-result-count"]')).toContainText('1 document');
  expect(searchRequests.at(-1).searchParams.get('party')).toBe('Persoană sintetică E');
  expect(searchRequests.at(-1).searchParams.get('page')).toBe('1');
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

test('renders the reader safe API highlight with the approved excerpt label', async ({ page }) => {
  await signInAs(page, 'cititor');
  await page.getByLabel('Text de căutare').fill('procură');
  await page.getByRole('button', { name: 'Caută' }).click();
  await expect(page.locator('[data-testid="search-results"] mark').first()).toBeVisible();
  await expect(page.getByText(/Text disponibil după anonimizare/).first()).toBeVisible();
  await expect(page.locator('.archive-result-excerpt').first()).toContainText('Text disponibil după anonimizare: procură');
  await expect(page.getByText('<mark>', { exact: true })).toHaveCount(0);
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

test('fits the archive Screen at the smallest supported width', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await signInAs(page, 'admin');
  await expect(page.getByLabel('Text de căutare')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.screenshot({ path: testInfo.outputPath('DS-001.320x740.png') });
});
