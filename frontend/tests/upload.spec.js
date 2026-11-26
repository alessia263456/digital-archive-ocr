import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const screenshotDir = join(process.cwd(), 'test-results', 'design');
mkdirSync(screenshotDir, { recursive: true });

async function authenticatedPage(page, role = 'admin') {
  await page.route('**/api/drafts/recent', (route) => route.fulfill({ json: { drafts: [] } }));
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

test('loads persisted OCR results and renews the private inline preview through the session API', async ({ page }, testInfo) => {
  await authenticatedPage(page, 'arhivar');
  const longOcrText = 'Știință în România. '.repeat(40);
  await page.route('**/api/drafts', (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ items: [{ group: 'documents', index: 0, id: 'draft-ocr', status: 'queued' }] }),
  }));
  await page.route('**/api/drafts/draft-ocr', (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ id: 'draft-ocr', status: 'review_ready' }),
  }));
  await page.route('**/api/drafts/draft-ocr/ocr', (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ id: 'draft-ocr', status: 'review_ready', pages: [{
      page: 1, width: 100, height: 200, text: longOcrText,
      words: [{ text: 'Știință', confidence: 96.5, left: 10, top: 20, width: 30, height: 10 }],
    }] }),
  }));
  let previews = 0;
  await page.route('**/api/drafts/draft-ocr/preview', async (route) => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().headers()['x-xsrf-token']).toBe('synthetic-csrf-token');
    previews += 1;
    const expires = Math.floor(Date.now() / 1000) + 300;
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ pages: [{ page: 1, kind: 'document', url: `/api/documents/deliver/opaque-${previews}?expires=${expires}&signature=signed` }], expires_at: new Date(expires * 1000).toISOString() }),
    });
  });
  await page.route('**/api/documents/deliver/opaque-*', (route) => route.fulfill({
    status: 200, contentType: 'text/html',
    body: '<!doctype html><html><head><style>body{margin:0;padding:10%;font:16px Georgia;color:#072D5C}article{border:1px solid #ddd;padding:10%}h1{font-size:24px}p{line-height:1.6}</style></head><body><article><h1>Contract de exemplu</h1><p>Previzualizare sintetică a documentului încărcat.</p><p>Act redactat pentru verificarea OCR.</p></article></body></html>',
  }));

  await page.goto('/');
  await page.getByRole('button', { name: 'Încarcă documente' }).click();
  await page.getByLabel('Document PDF sau DOCX').setInputFiles({ name: 'contract.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-test') });
  await page.getByRole('button', { name: 'Încarcă documentul' }).click();
  await page.getByRole('button', { name: 'Actualizează starea' }).click();
  await page.getByRole('button', { name: 'Vezi rezultatele OCR' }).click();
  await expect(page.getByRole('heading', { name: 'Rezultate OCR' })).toBeVisible();
  await expect(page.getByText('Știință în România')).toBeVisible();
  await expect(page.locator('.ocr-text')).toHaveText(longOcrText);
  await expect(page.getByText(/Încredere medie 97%/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Aprobă|Indexează|Corectează/ })).toHaveCount(0);
  await expect(page.locator('iframe[title="Previzualizare document · pagina 1"]')).toHaveAttribute('src', /opaque-1/);
  await expect(page.frameLocator('iframe[title="Previzualizare document · pagina 1"]').getByRole('heading', { name: 'Contract de exemplu' })).toBeVisible();
  await page.getByRole('button', { name: 'Reîncarcă previzualizarea' }).click();
  await expect(page.locator('iframe[title="Previzualizare document · pagina 1"]')).toHaveAttribute('src', /opaque-2/);
  expect(previews).toBe(2);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: join(screenshotDir, `DS-003.ocr-results.${testInfo.project.name}.png`), fullPage: true });
  if (testInfo.project.name.startsWith('desktop-')) {
    await page.setViewportSize({ width: 320, height: 740 });
    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    expect(fits).toBe(true);
    await page.screenshot({ path: join(screenshotDir, `DS-003.ocr-results.320x740.${testInfo.project.name}.png`), fullPage: true });
  }
});

test('shows session expiry from OCR results as an actionable error', async ({ page }) => {
  await authenticatedPage(page, 'admin');
  await page.route('**/api/drafts', (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ items: [{ group: 'documents', index: 0, id: 'draft-expired', status: 'queued' }] }),
  }));
  await page.route('**/api/drafts/draft-expired', (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ id: 'draft-expired', status: 'review_ready' }),
  }));
  await page.route('**/api/drafts/draft-expired/ocr', (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ id: 'draft-expired', status: 'review_ready', pages: [] }),
  }));
  await page.route('**/api/drafts/draft-expired/preview', (route) => route.fulfill({
    status: 419, contentType: 'application/json',
    body: JSON.stringify({ eroare: 'Sesiunea a expirat. Reîncărcați pagina și încercați din nou.' }),
  }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Încarcă documente' }).click();
  await page.getByLabel('Document PDF sau DOCX').setInputFiles({ name: 'contract.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-test') });
  await page.getByRole('button', { name: 'Încarcă documentul' }).click();
  await page.getByRole('button', { name: 'Actualizează starea' }).click();
  await page.getByRole('button', { name: 'Vezi rezultatele OCR' }).click();
  await expect(page.getByRole('alert')).toHaveText('Sesiunea a expirat. Reîncărcați pagina și încercați din nou.');
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

test('maps mixed batch outcomes by index and recovers persisted drafts after returning to intake', async ({ page }, testInfo) => {
  await authenticatedPage(page);
  let recentReads = 0;
  let statusReads = 0;
  await page.route('**/api/drafts/recent', (route) => route.fulfill({ json: { drafts: ++recentReads === 1 ? [] : [
    { id: 'newest', original_names: ['valid.pdf'], status: 'processing', created_at: '2026-11-26T12:00:00Z' },
    { id: 'legacy', original_names: null, status: 'failed_permanently', created_at: '2026-11-26T11:00:00Z' },
  ] } }));
  await page.route('**/api/drafts', (route) => {
    const body = route.request().postData();
    expect(body).toMatch(/name="document_count"\r\n\r\n2/);
    expect(body).toContain('filename="valid.pdf"');
    expect(body).toContain('filename="broken.docx"');
    return route.fulfill({ json: { items: [
      { group: 'documents', index: 1, status: 'invalid', error: 'Document sintetic respins.' },
      { group: 'documents', index: 0, status: 'queued', id: 'newest' },
    ] } });
  });
  await page.route('**/api/drafts/newest', (route) => {
    statusReads += 1;
    return route.fulfill({ json: { id: 'newest', status: 'review_ready' } });
  });
  await page.route('**/api/drafts/newest/ocr', (route) => route.fulfill({ json: { id: 'newest', status: 'review_ready', pages: [] } }));
  await page.route('**/api/drafts/newest/preview', (route) => route.fulfill({ json: { pages: [] } }));

  await page.goto('/');
  const openUpload = () => page.getByRole('button', { name: 'Încarcă documente' }).click();
  await openUpload();
  await page.getByLabel('Document PDF sau DOCX').setInputFiles([
    { name: 'valid.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-test') },
    { name: 'broken.docx', mimeType: 'application/zip', buffer: Buffer.from('invalid') },
  ]);
  await page.getByRole('button', { name: 'Încarcă documentul', exact: true }).click();
  const valid = page.locator('.draft-item').filter({ hasText: 'valid.pdf' });
  const invalid = page.locator('.draft-item').filter({ hasText: 'broken.docx' });
  await expect(valid).toContainText('OCR în așteptare');
  await expect(invalid).toContainText('Document sintetic respins.');
  await page.screenshot({ path: join(screenshotDir, `DS-003.batch.${testInfo.project.name}.png`), fullPage: true });

  await page.reload();
  await openUpload();
  await expect(invalid).toHaveCount(0);
  await expect(valid).toContainText('OCR în curs');
  await expect(page.locator('.draft-item').filter({ hasText: 'Nume indisponibil' })).toContainText('Eșuată definitiv');
  await page.clock.install();
  await page.clock.runFor(60_000);
  expect(statusReads).toBe(0);
  await valid.getByRole('button', { name: 'Actualizează starea' }).click();
  await valid.getByRole('button', { name: 'Vezi rezultatele OCR' }).click();
  await expect(page.getByRole('heading', { name: 'Rezultate OCR' })).toBeVisible();
  expect(statusReads).toBe(1);
  expect(recentReads).toBe(2);
});

test('keeps accepted siblings when the API cannot identify an omitted file', async ({ page }) => {
  await authenticatedPage(page);
  await page.route('**/api/drafts', (route) => route.fulfill({ status: 422, json: {
    eroare: 'Unele documente nu au ajuns la server.',
    items: [{ group: 'documents', index: 0, id: 'accepted', status: 'queued' }],
  } }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Încarcă documente' }).click();
  await page.getByLabel('Document PDF sau DOCX').setInputFiles([
    { name: 'valid.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-test') },
    { name: 'omitted.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-test') },
  ]);
  await page.getByRole('button', { name: 'Încarcă documentul', exact: true }).click();
  await expect(page.getByText('Unele documente nu au ajuns la server.')).toBeVisible();
  await expect(page.locator('.draft-item')).toHaveCount(1);
  await expect(page.locator('.draft-item')).toContainText('valid.pdf');
});

test('changes multipart image order using the page controls', async ({ page }, testInfo) => {
  await authenticatedPage(page, 'arhivar');
  await page.route('**/api/drafts', (route) => {
    const body = route.request().postData();
    expect(body).toMatch(/name="image_count"\r\n\r\n2/);
    expect(body.indexOf('filename="second.png"')).toBeLessThan(body.indexOf('filename="first.png"'));
    return route.fulfill({ json: { items: [{ group: 'images', status: 'queued', id: 'ordered' }] } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Încarcă documente' }).click();
  await page.getByRole('button', { name: 'Colecție de imagini JPG și PNG' }).click();
  await page.getByLabel('Imagini în ordinea paginilor').setInputFiles(['first.png', 'second.png'].map((name) => ({
    name, mimeType: 'image/png', buffer: Buffer.from('synthetic'),
  })));
  await page.getByRole('button', { name: 'Opțiuni pentru pagina 2' }).click();
  await page.getByRole('button', { name: 'Mută la stânga' }).focus();
  await page.keyboard.press('Enter');
  const pages = page.getByRole('list', { name: 'Ordinea paginilor' }).getByRole('listitem');
  await expect(pages.first()).toContainText('second.png');
  await expect(page.getByRole('button', { name: 'Opțiuni pentru pagina 1' }).first()).toBeFocused();
  await page.screenshot({ path: join(screenshotDir, `DS-003.order.${testInfo.project.name}.png`), fullPage: true });
  await page.getByRole('button', { name: 'Încarcă documentul' }).click();
  await expect(page.locator('.draft-item')).toContainText('second.png, first.png');
});

test('reports unavailable recent drafts and reloads only on request', async ({ page }) => {
  await authenticatedPage(page);
  let finishLoading;
  let reads = 0;
  await page.route('**/api/drafts/recent', async (route) => {
    reads += 1;
    if (reads === 1) {
      await new Promise((resolve) => { finishLoading = resolve; });
      await route.fulfill({ status: 503, json: { eroare: 'Ciornele sunt temporar indisponibile.' } });
    } else {
      await route.fulfill({ json: { drafts: [] } });
    }
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Încarcă documente' }).click();
  await expect(page.getByText('Se încarcă ciornele…')).toBeVisible();
  finishLoading();
  await expect(page.getByRole('alert')).toHaveText('Ciornele sunt temporar indisponibile.');
  await page.getByRole('button', { name: 'Reîncarcă ciornele' }).click();
  await expect(page.getByText('Ciornele private vor apărea aici după încărcare.')).toBeVisible();
  expect(reads).toBe(2);
});

test('allows removing and restoring image pages and reordering by drag', async ({ page }) => {
  await authenticatedPage(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Încarcă documente' }).click();
  await page.getByRole('button', { name: 'Colecție de imagini JPG și PNG' }).click();
  const input = page.getByLabel('Imagini în ordinea paginilor');
  await input.setInputFiles({ name: 'first.png', mimeType: 'image/png', buffer: Buffer.from('synthetic') });
  await input.setInputFiles({ name: 'second.png', mimeType: 'image/png', buffer: Buffer.from('synthetic') });
  const pages = page.getByRole('list', { name: 'Ordinea paginilor' }).getByRole('listitem');
  await expect(pages).toHaveCount(2);
  await page.getByRole('button', { name: 'Opțiuni pentru pagina 1' }).click();
  await page.getByRole('button', { name: 'Elimină pagina' }).click();
  await expect(pages).toHaveCount(1);
  await page.getByRole('button', { name: 'Anulează eliminarea paginii' }).click();
  await expect(pages.first()).toContainText('first.png');
  await pages.first().locator('[draggable="true"]').dragTo(pages.last());
  await expect(pages.first()).toContainText('second.png');
});
