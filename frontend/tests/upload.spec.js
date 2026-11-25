import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const screenshotDir = join(process.cwd(), 'test-results', 'design');
mkdirSync(screenshotDir, { recursive: true });

async function authenticatedPage(page, role = 'admin') {
  await page.route('**/api/user', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ id: 17, username: 'staff-test', role }),
  }));
  await page.route('**/sanctum/csrf-cookie', (route) => route.fulfill({
    status: 204,
    headers: { 'set-cookie': 'XSRF-TOKEN=synthetic-csrf-token; Path=/; SameSite=Lax' },
  }));
}

test('admin can upload one PDF as a private draft and refresh its persisted OCR status', async ({ page }, testInfo) => {
  await authenticatedPage(page);
  let statusReads = 0;
  await page.route('**/api/drafts', async (route) => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().headers()['content-type']).toContain('multipart/form-data; boundary=');
    expect(route.request().headers()['x-xsrf-token']).toBe('synthetic-csrf-token');
    const body = route.request().postDataBuffer().toString();
    expect(body).toContain('name="documents[]"');
    expect(body).toContain('contract-test.pdf');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [{ group: 'documents', index: 0, id: 'draft-123', status: 'queued' }] }),
    });
  });
  await page.route('**/api/drafts/draft-123', (route) => {
    statusReads += 1;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'draft-123', status: ['processing', 'review_ready', 'failed', 'quarantined'][statusReads - 1] }),
    });
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Arhiva este goală' })).toBeVisible();
  await page.getByRole('button', { name: 'Încarcă documente' }).click();
  await expect(page.getByRole('heading', { name: 'Încărcare documente' })).toBeVisible();
  await page.getByLabel('Document PDF sau DOCX').setInputFiles({
    name: 'contract-test.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-test'),
  });
  await page.getByRole('button', { name: 'Încarcă documentul' }).click();
  await expect(page.getByText('Ciornă privată · ID draft-123')).toBeVisible();
  await expect(page.getByText('OCR în așteptare')).toBeVisible();
  await expect(page.getByText('Transferul sau finalizarea OCR nu aprobă și nu indexează documentul.')).toBeVisible();
  await page.getByRole('button', { name: 'Actualizează starea' }).click();
  await expect(page.getByText('OCR în curs')).toBeVisible();
  await page.getByRole('button', { name: 'Actualizează starea' }).click();
  await expect(page.getByText('Gata de revizuit')).toBeVisible();
  await expect(page.getByRole('button', { name: /Aprobă|Indexează/ })).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: join(screenshotDir, `DS-003.${testInfo.project.name}.png`), fullPage: true });
  if (testInfo.project.name.startsWith('desktop-')) {
    for (const viewport of [{ width: 320, height: 740 }, { width: 1600, height: 900 }]) {
      await page.setViewportSize(viewport);
      await page.evaluate(() => window.scrollTo(0, 0));
      const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
      expect(fits).toBe(true);
      await page.screenshot({ path: join(screenshotDir, `DS-003.${viewport.width}x${viewport.height}.${testInfo.project.name}.png`), fullPage: true });
    }
  }
  await page.getByRole('button', { name: 'Actualizează starea' }).click();
  await expect(page.getByText('OCR eșuat · reîncercare programată')).toBeVisible();
  await page.getByRole('button', { name: 'Actualizează starea' }).click();
  await expect(page.getByText('Trimisă în carantină')).toBeVisible();
  expect(statusReads).toBe(4);
});

test('shows transfer loading and keeps multiple current-session items with long filenames', async ({ page }, testInfo) => {
  await authenticatedPage(page, 'admin');
  let uploadCount = 0;
  let finishFirst;
  await page.route('**/api/drafts', async (route) => {
    uploadCount += 1;
    if (uploadCount === 1) {
      await new Promise((resolve) => { finishFirst = resolve; });
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [{ group: 'documents', index: 0, id: `draft-${uploadCount}`, status: 'queued' }] }),
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Încarcă documente' }).click();
  const input = page.getByLabel('Document PDF sau DOCX');
  await input.setInputFiles({ name: 'contract.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-test') });
  await page.getByRole('button', { name: 'Încarcă documentul' }).click();
  await expect(page.getByRole('button', { name: 'Se încarcă…' })).toBeDisabled();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: join(screenshotDir, `DS-003.loading.${testInfo.project.name}.png`), fullPage: true });
  finishFirst();
  await expect(page.getByText('Ciornă privată · ID draft-1')).toBeVisible();

  const longName = `${'documente-justificative-'.repeat(7)}contract-final.pdf`;
  await input.setInputFiles({ name: longName, mimeType: 'application/pdf', buffer: Buffer.from('%PDF-test') });
  await page.getByRole('button', { name: 'Încarcă documentul' }).click();
  await expect(page.getByText('Ciornă privată · ID draft-2')).toBeVisible();
  await expect(page.locator('.draft-copy strong').first()).toHaveAttribute('title', longName);
  await expect(page.locator('.draft-item')).toHaveCount(2);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: join(screenshotDir, `DS-003.many.${testInfo.project.name}.png`), fullPage: true });
});

test('arhivar can upload an ordered image collection as one draft', async ({ page }) => {
  await authenticatedPage(page, 'arhivar');
  await page.route('**/api/drafts', async (route) => {
    const body = route.request().postDataBuffer().toString();
    expect(body.match(/name="images\[\]"/g)).toHaveLength(2);
    expect(body.indexOf('page-one.jpg')).toBeLessThan(body.indexOf('page-two.png'));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [{ group: 'images', id: 'image-draft', status: 'queued' }] }),
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Încarcă documente' }).click();
  await page.getByRole('button', { name: 'Înapoi la arhivă' }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'PDF / DOCX' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Colecție de imagini JPG și PNG' })).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Imagini în ordinea paginilor')).toBeFocused();
  await page.getByLabel('Imagini în ordinea paginilor').setInputFiles([
    { name: 'page-one.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('jpg-one') },
    { name: 'page-two.png', mimeType: 'image/png', buffer: Buffer.from('png-two') },
  ]);
  await page.getByRole('button', { name: 'Încarcă documentul' }).click();
  await expect(page.getByText('Ciornă privată · ID image-draft')).toBeVisible();
});

test('cititor has no upload entry point', async ({ page }) => {
  await authenticatedPage(page, 'cititor');
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Arhiva este goală' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Încarcă documente' })).toHaveCount(0);
});

test('rejects unsupported selections with a Romanian explanation', async ({ page }) => {
  await authenticatedPage(page, 'admin');
  await page.goto('/');
  await page.getByRole('button', { name: 'Încarcă documente' }).click();
  await page.getByLabel('Document PDF sau DOCX').setInputFiles({
    name: 'invalid.txt', mimeType: 'text/plain', buffer: Buffer.from('invalid'),
  });
  await expect(page.getByRole('status')).toHaveText('Sunt acceptate doar documentele PDF și DOCX.');
  await expect(page.getByRole('button', { name: 'Încarcă documentul' })).toBeDisabled();
});

test('shows a rejected upload and a network failure without losing earlier state', async ({ page }) => {
  await authenticatedPage(page, 'admin');
  let attempt = 0;
  await page.route('**/api/drafts', async (route) => {
    attempt += 1;
    if (attempt === 1) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [{ group: 'documents', index: 0, status: 'invalid', error: 'Documentul nu a putut fi păstrat ca ciornă privată.' }] }),
      });
    } else {
      await route.abort();
    }
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Încarcă documente' }).click();
  const input = page.getByLabel('Document PDF sau DOCX');
  await input.setInputFiles({ name: 'contract.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-test') });
  await page.getByRole('button', { name: 'Încarcă documentul' }).click();
  await expect(page.getByText('Încărcarea nu a reușit')).toBeVisible();
  await input.setInputFiles({ name: 'contract-two.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-test') });
  await page.getByRole('button', { name: 'Încarcă documentul' }).click();
  await expect(page.getByRole('status')).toHaveText('Conexiunea a eșuat. Verificați conexiunea și încercați din nou.');
  await expect(page.getByText('contract.pdf')).toBeVisible();
});

test('keeps draft status visible when refresh reports missing draft or expired session', async ({ page }) => {
  await authenticatedPage(page, 'admin');
  let refreshes = 0;
  await page.route('**/api/drafts', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ items: [{ group: 'documents', index: 0, id: 'draft-refresh', status: 'queued' }] }),
  }));
  await page.route('**/api/drafts/draft-refresh', (route) => {
    refreshes += 1;
    return route.fulfill({
      status: refreshes === 1 ? 404 : 419,
      contentType: 'application/json',
      body: JSON.stringify({ eroare: refreshes === 1 ? 'Ciorna solicitată nu a fost găsită.' : 'Sesiunea a expirat. Reîncărcați pagina și încercați din nou.' }),
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Încarcă documente' }).click();
  await page.getByLabel('Document PDF sau DOCX').setInputFiles({
    name: 'contract.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-test'),
  });
  await page.getByRole('button', { name: 'Încarcă documentul' }).click();
  await expect(page.getByText('OCR în așteptare')).toBeVisible();
  await page.getByRole('button', { name: 'Actualizează starea' }).click();
  await expect(page.getByRole('alert')).toHaveText('Ciorna solicitată nu a fost găsită.');
  await expect(page.getByText('OCR în așteptare')).toBeVisible();
  await page.getByRole('button', { name: 'Actualizează starea' }).click();
  await expect(page.getByRole('alert')).toHaveText('Sesiunea a expirat. Reîncărcați pagina și încercați din nou.');
});
