import { test, expect } from '@playwright/test';

const draft = { id: 'editor-1', name: 'Contract_sintetic.pdf', status: 'review_ready', source_format: 'pdf' };
const editorState = {
  id: draft.id, status: 'review_ready', ocr_revision: 1, detection_status: 'ready', detection_revision: 1,
  pages: [{ page: 1, width: 100, height: 200, source_text: 'CNP 1960523123456', corrected_text: 'CNP 1960523123456', words: [
    { text: 'CNP', confidence: 99, left: 1, top: 1, width: 20, height: 10 },
    { text: '1960523123456', confidence: 99, left: 22, top: 1, width: 50, height: 10 },
  ] }],
  manual_marks: [],
  candidates: [{ id: 'candidate-1', category: 'cnp', disposition: 'review', confidence: 99, page: 1, bounding_boxes: [], location_status: 'manual_review_required', corrected_text_span: { start: 4, length: 13 }, review_status: 'pending' }],
};

async function openEditor(page, state = editorState, editorStatus = 200) {
  await page.route('**/api/user', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 1, username: 'arhivar', role: 'arhivar' }) }));
  await page.route('**/api/drafts/queue', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ review: [draft], quarantine: [] }) }));
  await page.route('**/api/drafts/editor-1/editor', (route) => route.fulfill({ status: editorStatus, contentType: 'application/json', body: JSON.stringify(editorStatus === 200 ? structuredClone(state) : { eroare: 'Editorul nu a putut fi încărcat.' }) }));
  await page.route('**/api/drafts/editor-1/preview', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ pages: [] }) }));
  await page.route('**/api/drafts/editor-1/editor/pages/1/image', (route) => route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="200"><rect width="100" height="200" fill="white"/><text x="8" y="18" font-family="sans-serif" font-size="5" fill="#072D5C">DECLARAȚIE SINTETICĂ</text><text x="8" y="32" font-family="sans-serif" font-size="4" fill="#072D5C">CNP 1960523123456</text><text x="8" y="46" font-family="sans-serif" font-size="4" fill="#072D5C">Semnatar · document pentru test</text></svg>' }));
  await page.route('**/sanctum/csrf-cookie', (route) => route.fulfill({ status: 204 }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Cozi de lucru' }).last().click();
  await page.getByRole('button', { name: 'Deschide editorul' }).click();
  if (editorStatus === 200) await expect(page.getByRole('heading', { name: 'Editor document' })).toBeVisible();
}

test('edits OCR with stale review disabled, saves, and persists a PII decision', async ({ page, colorScheme }, testInfo) => {
  await openEditor(page);
  const area = page.getByLabel('Corectare OCR · Pagina 1');
  await expect(area).toHaveValue('CNP 1960523123456');
  await expect(page.getByText('Casete de delimitare')).toBeVisible();
  const isDesktop = testInfo.project.name.startsWith('desktop');
  await page.setViewportSize(isDesktop ? { width: 1600, height: 900 } : { width: 320, height: 740 });
  await page.locator('.app-shell').evaluate((element) => { element.style.blockSize = 'auto'; element.style.minBlockSize = '0'; element.style.maxBlockSize = 'none'; element.style.overflow = 'visible'; });
  await page.locator('.app-shell-body').evaluate((element) => { element.style.display = 'block'; element.style.minBlockSize = '0'; });
  await page.locator('.app-workspace').evaluate((element) => { element.style.overflow = 'visible'; element.style.blockSize = 'auto'; });
  await page.screenshot({ path: `test-results/DS-011.${isDesktop ? '1600x900' : '320x740'}.${colorScheme}.png`, fullPage: true });
  await area.fill('CNP 1960523123456 corectat');
  await expect(page.getByText('Rezultatele detectării sunt neactualizate.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Acceptă potrivirea' })).toBeDisabled();
  let savedBody;
  await page.route('**/api/drafts/editor-1/editor/ocr', async (route) => {
    savedBody = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...editorState, ocr_revision: 2, detection_revision: 2, pages: [{ ...editorState.pages[0], corrected_text: 'CNP 1960523123456 corectat' }] }) });
  });
  await page.getByRole('button', { name: 'Salvează corecturile' }).click();
  await expect.poll(() => savedBody?.ocr_revision).toBe(1);
  await expect(page.getByRole('button', { name: 'Acceptă potrivirea' })).toBeEnabled();
  await page.route('**/api/drafts/editor-1/editor/pii-review', async (route) => {
    const body = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ ...editorState.candidates[0], review_status: body.decisions[0].review_status }] }) });
  });
  await page.getByRole('button', { name: 'Acceptă potrivirea' }).click();
  await expect(page.getByText('Acceptată')).toBeVisible();
});

test('shows the empty candidate state', async ({ page }) => {
  await openEditor(page, { ...editorState, candidates: [] });
  await expect(page.getByText('Nu au fost găsite potriviri PII.')).toBeVisible();
});

test('keeps long OCR and many candidate rows usable at the narrow viewport', async ({ page }) => {
  const text = 'Text OCR sintetic pentru verificarea unui pasaj foarte lung. '.repeat(24);
  const candidates = Array.from({ length: 12 }, (_, index) => ({
    ...editorState.candidates[0], id: `candidate-${index}`, corrected_text_span: { start: 0, length: 25 },
  }));
  await openEditor(page, { ...editorState, pages: [{ ...editorState.pages[0], corrected_text: text }], candidates });
  await page.setViewportSize({ width: 320, height: 740 });
  await expect(page.getByRole('button', { name: 'Acceptă potrivirea' })).toHaveCount(12);
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 320);
});

test('shows an actionable editor load error', async ({ page }) => {
  await openEditor(page, editorState, 500);
  await expect(page.getByRole('alert')).toHaveText('Editorul nu a putut fi încărcat.');
  await expect(page.getByRole('button', { name: 'Reîncearcă încărcarea' })).toBeVisible();
});

test('draws a revision-bound mark after scrolling, supports undo, and generates a preview', async ({ page }, testInfo) => {
  await openEditor(page);
  await page.setViewportSize(testInfo.project.name.startsWith('desktop') ? { width: 1600, height: 700 } : { width: 320, height: 600 });
  await page.getByRole('button', { name: 'Marchează o zonă' }).click();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const canvas = page.getByRole('application', { name: 'Document original, pagina 1' });
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toBeVisible();
  let saved;
  await page.route('**/api/drafts/editor-1/editor/redaction-marks', async (route) => {
    saved = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ marks: saved.marks }) });
  });
  const bounds = await canvas.boundingBox();
  await page.mouse.move(bounds.x + bounds.width * 0.2, bounds.y + bounds.height * 0.2);
  await page.mouse.down();
  await page.setViewportSize(testInfo.project.name.startsWith('desktop') ? { width: 800, height: 600 } : { width: 360, height: 600 });
  const resized = await canvas.boundingBox();
  await page.mouse.move(resized.x + resized.width * 0.4, resized.y + resized.height * 0.3);
  await expect(page.locator('.editor-mark-rect.preview')).toBeVisible();
  await page.mouse.up();
  await expect.poll(() => saved?.marks?.length).toBe(1);
  expect(saved.ocr_revision).toBe(1);
  expect(saved.detection_revision).toBe(1);
  await expect(page.getByText('Total: 1 marcaj')).toBeVisible();
  await page.getByRole('button', { name: 'Elimină marcajul manual 1' }).click();
  await expect(page.getByText('Total: 0 marcaje')).toBeVisible();
  await page.getByRole('button', { name: 'Anulează eliminarea' }).click();
  await expect(page.getByText('Total: 1 marcaj')).toBeVisible();
  await page.route('**/api/drafts/editor-1/editor/redaction-preview', async (route) => {
    if (route.request().method() === 'POST') await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ready' }) });
    else await route.fulfill({ status: 200, contentType: 'application/pdf', body: '%PDF-1.4' });
  });
  await page.getByRole('button', { name: 'Previzualizează anonimizarea' }).click();
  await expect(page.getByTitle('Previzualizare PDF anonimizat')).toBeVisible();
});

test('draws a mark from the keyboard using page coordinates', async ({ page }) => {
  await openEditor(page);
  let saved;
  await page.route('**/api/drafts/editor-1/editor/redaction-marks', async (route) => {
    saved = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ marks: saved.marks }) });
  });
  await page.getByRole('button', { name: 'Marchează o zonă' }).click();
  const canvas = page.getByRole('application', { name: 'Document original, pagina 1' });
  await canvas.focus();
  await canvas.press('ArrowRight');
  await canvas.press('ArrowDown');
  await canvas.press('Enter');
  await canvas.press('ArrowRight');
  await canvas.press('ArrowDown');
  await canvas.press('Enter');
  await expect.poll(() => saved?.marks?.length).toBe(1);
  expect(saved.marks[0].page).toBe(1);
  expect(saved.marks[0].box.width).toBeGreaterThan(0);
  expect(saved.marks[0].box.height).toBeGreaterThan(0);
});
