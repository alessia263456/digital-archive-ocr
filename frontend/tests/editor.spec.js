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

const classification = { id: 21, document_type: 'Contract', subtype: 'contract de comodat', storage_context: 'Act de sine stătător', archival_indicator: 'IA 20', retention_term: '10 ani C.S.', retention_base: 'act_date' };
const metadataState = {
  id: draft.id, suggestions: { act_date: null, act_number: null, tags: [] },
  metadata: { act_date: '', act_number: '', physical_dossier_id: null, inventory_number: '', amount: '', tags: [], contract_expiry: null, dossier_resolution_date: null, deposit_date: null, deposit_release_date: null },
  metadata_confirmed: false, metadata_revision: 1, ocr_revision: 1, classification: null, selected_dossier: null, retention: null,
  classification_options: [classification],
};
const matchingDossier = { id: 101, physical_dossier_number: '29/2026', archival_indicator: 'IA 20', inventory_number: '29/2026', retention_time: '10 ani C.S.', description: 'Contracte de comodat' };

async function openEditor(page, state = editorState, editorStatus = 200) {
  await page.route('**/api/user', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 1, username: 'arhivar', role: 'arhivar' }) }));
  await page.route('**/api/drafts/queue', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ review: [draft], quarantine: [] }) }));
  await page.route('**/api/drafts/editor-1/editor', (route) => route.fulfill({ status: editorStatus, contentType: 'application/json', body: JSON.stringify(editorStatus === 200 ? structuredClone(state) : { eroare: 'Editorul nu a putut fi încărcat.' }) }));
  await page.route('**/api/drafts/editor-1/metadata', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(structuredClone(metadataState)) }));
  await page.route('**/api/physical-dossiers**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ dossiers: [matchingDossier] }) }));
  await page.route('**/api/drafts/editor-1/preview', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ pages: [] }) }));
  await page.route('**/api/drafts/editor-1/editor/pages/1/image', (route) => route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="200"><rect width="100" height="200" fill="white"/><text x="8" y="18" font-family="sans-serif" font-size="5" fill="#072D5C">DECLARAȚIE SINTETICĂ</text><text x="8" y="32" font-family="sans-serif" font-size="4" fill="#072D5C">CNP 1960523123456</text><text x="8" y="46" font-family="sans-serif" font-size="4" fill="#072D5C">Semnatar · document pentru test</text></svg>' }));
  await page.route('**/sanctum/csrf-cookie', (route) => route.fulfill({ status: 204 }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Cozi de lucru' }).last().click();
  await page.getByRole('button', { name: 'Deschide editorul' }).click();
  if (editorStatus === 200) await expect(page.getByRole('heading', { name: 'Editor document' })).toBeVisible();
}

test('captures metadata in the approved order, selects by printed dossier number, and confirms with revision IDs', async ({ page }) => {
  let metadataBody;
  let confirmationBody;
  await openEditor(page);
  await page.route('**/api/physical-dossiers**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    await route.fulfill({ json: { dossiers: [matchingDossier] } });
  });
  await page.route('**/api/drafts/editor-1/metadata', async (route) => {
    if (route.request().method() === 'PATCH') {
      metadataBody = route.request().postDataJSON();
      await route.fulfill({ json: { metadata: { ...metadataBody.metadata, physical_dossier_number: '29/2026', inventory_number: '29/2026' }, metadata_confirmed: false, metadata_revision: 2, ocr_revision: 1, classification, retention: { status: 'ready', first_eligible_date: null } } });
    } else await route.fulfill({ json: structuredClone(metadataState) });
  });
  await page.route('**/api/drafts/editor-1/metadata/confirm', async (route) => {
    confirmationBody = route.request().postDataJSON();
    await route.fulfill({ json: { metadata_confirmed: true, metadata_revision: 2, ocr_revision: 1 } });
  });
  const sections = page.locator('.metadata-section');
  await expect(sections.nth(0).getByRole('heading', { name: 'Clasificare arhivistică' })).toBeVisible();
  await expect(sections.nth(1).getByRole('heading', { name: 'Identificarea actului' })).toBeVisible();
  await expect(sections.nth(2).getByRole('heading', { name: 'Dosar fizic' })).toBeVisible();
  await page.getByLabel('Tip document').selectOption('Contract');
  await page.getByLabel('Subtip').selectOption('contract de comodat');
  await page.getByLabel('Context de arhivare').selectOption('Act de sine stătător');
  await page.getByLabel('Data actului').fill('2026-11-18');
  await page.getByLabel('Numărul actului').fill('41');
  await page.getByLabel('Dosar fizic').selectOption('101');
  await expect(page.getByLabel('Număr de inventar')).toHaveValue('29/2026');
  await page.getByRole('button', { name: 'Adaugă etichetă' }).click();
  await page.getByLabel('Etichetă 1').selectOption('Contract');
  await page.getByRole('button', { name: 'Continuă' }).click();
  await expect(page.getByRole('checkbox', { name: 'Confirmă metadatele' })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Confirmă metadatele' }).check();
  await expect.poll(() => confirmationBody?.metadata_revision).toBe(2);
  expect(confirmationBody.ocr_revision).toBe(1);
  expect(metadataBody.nomenclature_entry_id).toBe(21);
  expect(metadataBody.metadata.physical_dossier_id).toBe(101);
  expect(metadataBody.metadata.physical_dossier_number).toBeUndefined();
  expect(metadataBody.metadata.act_date).toBe('2026-11-18');
  expect(metadataBody.metadata.act_number).toBe('41');
});

test('confirms the current final review and publishes with an idempotency key', async ({ page }) => {
  await openEditor(page, { ...editorState, candidates: [] });
  let finalReviewBody;
  let publicationBody;
  let idempotencyKey;
  await page.route('**/api/drafts/editor-1/metadata', async (route) => {
    if (route.request().method() === 'PATCH') await route.fulfill({ json: { metadata: { act_date: '2026-11-18', act_number: '41', physical_dossier_id: 101, inventory_number: '29/2026', tags: ['Contract'] }, metadata_confirmed: false, metadata_revision: 2, ocr_revision: 1, classification, retention: { status: 'calculated', first_eligible_date: '2036-01-01' } } });
    else await route.fulfill({ json: structuredClone(metadataState) });
  });
  await page.route('**/api/drafts/editor-1/metadata/confirm', (route) => route.fulfill({ json: { metadata_confirmed: true, metadata_revision: 2, ocr_revision: 1 } }));
  await page.route('**/api/drafts/editor-1/editor/redaction-marks', async (route) => route.fulfill({ json: { marks: route.request().postDataJSON().marks } }));
  await page.route('**/api/drafts/editor-1/editor/redaction-preview', (route) => route.request().method() === 'POST'
    ? route.fulfill({ json: { status: 'ready' } }) : route.fulfill({ status: 200, contentType: 'application/pdf', body: '%PDF-1.4' }));
  await page.route('**/api/drafts/editor-1/review/confirm', async (route) => {
    finalReviewBody = route.request().postDataJSON();
    await route.fulfill({ json: { review_confirmed: true, review_snapshot: '5ac61e6a-3fd5-45d2-890c-c026e01ad67a' } });
  });
  await page.route('**/api/drafts/editor-1/publish', async (route) => {
    publicationBody = route.request().postDataJSON();
    idempotencyKey = route.request().headers()['idempotency-key'];
    await route.fulfill({ status: 201, json: { document_id: 'document-1', version_id: 'version-1', version_number: 1 } });
  });
  await page.getByLabel('Tip document').selectOption('Contract');
  await page.getByLabel('Subtip').selectOption('contract de comodat');
  await page.getByLabel('Context de arhivare').selectOption('Act de sine stătător');
  await page.getByLabel('Data actului').fill('2026-11-18');
  await page.getByLabel('Numărul actului').fill('41');
  await page.getByLabel('Dosar fizic').selectOption('101');
  await page.getByRole('button', { name: 'Continuă' }).click();
  await page.getByRole('checkbox', { name: 'Confirmă metadatele' }).check();
  const canvas = page.getByRole('application', { name: 'Document original, pagina 1' });
  await page.getByRole('button', { name: 'Marchează o zonă' }).click();
  await canvas.press('Enter'); await canvas.press('ArrowRight'); await canvas.press('ArrowDown'); await canvas.press('Enter');
  await page.getByRole('button', { name: 'Previzualizează anonimizarea' }).click();
  await page.getByRole('button', { name: 'Confirmă revizuirea finală' }).click();
  await page.getByRole('button', { name: 'Aprobă și publică' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Documentul a fost aprobat' })).toBeVisible();
  expect(finalReviewBody).toEqual({ metadata_revision: 2, ocr_revision: 1, detection_revision: 1, redaction_ocr_revision: 1, redaction_detection_revision: 1 });
  expect(publicationBody.review_snapshot).toBe('5ac61e6a-3fd5-45d2-890c-c026e01ad67a');
  expect(idempotencyKey).toMatch(/^[0-9a-f-]{36}$/i);
});

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
  await page.screenshot({ path: `screens/DS-011.${isDesktop ? '1600x900' : '320x740'}.${colorScheme}.png`, fullPage: true });
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
    expect(route.request().headers()['content-type']).toContain('application/json');
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
    expect(route.request().headers()['content-type']).toContain('application/json');
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

test('guides the reviewer to the page missing a manual location', async ({ page }) => {
  await openEditor(page, { ...editorState, candidates: [{ ...editorState.candidates[0], review_status: 'accepted' }] });
  const preview = page.getByRole('button', { name: 'Previzualizează anonimizarea' });
  await expect(preview).toBeDisabled();
  await page.getByRole('button', { name: 'Marchează pe pagina 1' }).click();
  const canvas = page.getByRole('application', { name: 'Document original, pagina 1' });
  await expect(canvas).toBeFocused();
  await page.route('**/editor/redaction-marks', route => route.fulfill({ json: { marks: route.request().postDataJSON().marks } }));
  await canvas.press('Enter');
  await canvas.press('ArrowRight');
  await canvas.press('ArrowDown');
  await canvas.press('Enter');
  await expect(preview).toBeEnabled();
});

test('records textarea correction operations with UTF-16 offsets', async ({ page }) => {
  await openEditor(page);
  const area = page.getByLabel('Corectare OCR · Pagina 1');
  await area.fill('CNP 1960523123450');
  let savedBody;
  await page.route('**/api/drafts/editor-1/editor/ocr', async (route) => {
    savedBody = route.request().postDataJSON();
    await route.fulfill({ json: { ...editorState, ocr_revision: 2, detection_revision: 2 } });
  });
  await page.getByRole('button', { name: 'Salvează corecturile' }).click();
  await expect.poll(() => savedBody?.pages?.[0]?.operations?.length).toBe(1);
  expect(savedBody.pages[0].operations[0]).toEqual({ start: 16, deleted: '6', inserted: '0' });
});
