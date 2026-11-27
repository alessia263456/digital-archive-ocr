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

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

async function openEditor(page, state = editorState, editorStatus = 200, pending = {}, role = 'arhivar') {
  await page.route('**/api/user', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 1, username: role, role }) }));
  await page.route('**/api/drafts/queue', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ review: [draft], quarantine: [] }) }));
  await page.route('**/api/drafts/editor-1/editor', async (route) => {
    pending.editorStarted?.resolve();
    if (pending.editor) await pending.editor.promise;
    await route.fulfill({ status: editorStatus, contentType: 'application/json', body: JSON.stringify(editorStatus === 200 ? structuredClone(state) : { eroare: 'Editorul nu a putut fi încărcat.' }) });
  });
  await page.route('**/api/drafts/editor-1/metadata', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(structuredClone(metadataState)) }));
  await page.route('**/api/physical-dossiers**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ dossiers: [matchingDossier] }) }));
  await page.route('**/api/drafts/editor-1/preview', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ pages: [] }) }));
  await page.route('**/api/drafts/editor-1/editor/pages/*/image', async (route) => {
    pending.imageStarted?.resolve();
    if (pending.image) await pending.image.promise;
    await route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="200"><rect width="100" height="200" fill="white"/><text x="8" y="18" font-family="sans-serif" font-size="5" fill="#072D5C">DECLARAȚIE SINTETICĂ</text><text x="8" y="32" font-family="sans-serif" font-size="4" fill="#072D5C">CNP 1960523123456</text><text x="8" y="46" font-family="sans-serif" font-size="4" fill="#072D5C">Semnatar · document pentru test</text></svg>' });
  });
  await page.route('**/sanctum/csrf-cookie', (route) => route.fulfill({ status: 204 }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Cozi de lucru' }).last().click();
  await page.getByRole('button', { name: 'Deschide editorul' }).click();
  if (editorStatus === 200 && !pending.editor) await expect(page.getByRole('heading', { name: draft.name })).toBeVisible();
}

async function showTab(page, tab) {
  const target = page.getByRole('tab', { name: new RegExp(tab) });
  await target.focus();
  await page.keyboard.press('Enter');
}

async function confirmEditorForPublication(page) {
  await openEditor(page, { ...editorState, candidates: [] });
  await page.route('**/api/drafts/editor-1/metadata', async (route) => {
    if (route.request().method() === 'PATCH') await route.fulfill({ json: { metadata: { act_date: '2026-11-18', act_number: '41', physical_dossier_id: 101, inventory_number: '29/2026', tags: [] }, metadata_confirmed: false, metadata_revision: 2, ocr_revision: 1, classification, retention: { status: 'calculated', first_eligible_date: '2036-01-01' } } });
    else await route.fulfill({ json: structuredClone(metadataState) });
  });
  await page.route('**/api/drafts/editor-1/metadata/confirm', (route) => route.fulfill({ json: { metadata_confirmed: true, metadata_revision: 2, ocr_revision: 1 } }));
  await page.route('**/api/drafts/editor-1/editor/redaction-preview', (route) => route.fulfill({ json: { status: 'ready' } }));
  await page.route('**/api/drafts/editor-1/review/confirm', (route) => route.fulfill({ json: { review_confirmed: true, review_snapshot: 'review-snapshot-duplicate' } }));
  await page.getByLabel('Tip document').selectOption('Contract');
  await page.getByLabel('Subtip').selectOption('contract de comodat');
  await page.getByLabel('Context de arhivare').selectOption('Act de sine stătător');
  await page.getByLabel('Data actului').fill('2026-11-18');
  await page.getByLabel('Numărul actului').fill('41');
  await page.getByLabel('Dosar fizic').selectOption('101');
  await page.getByRole('checkbox', { name: 'Confirmă metadatele' }).check();
  await showTab(page, 'Verificare finală');
  await page.getByRole('button', { name: 'Confirmă revizuirea finală' }).click();
  await expect(page.getByRole('button', { name: 'Aprobă și publică' })).toBeVisible();
}

const possibleDuplicate = { id: 'document-existing', reason: 'act_number_and_date' };

test('shows possible duplicate matches and publishes separately when selected', async ({ page }) => {
  await confirmEditorForPublication(page);
  const publicationBodies = [];
  await page.route('**/api/drafts/editor-1/publish', async (route) => {
    const body = route.request().postDataJSON();
    publicationBodies.push(body);
    if (publicationBodies.length === 1) return route.fulfill({ status: 409, json: { cod: 'possible_duplicate', matches: [possibleDuplicate], options: ['version', 'separate', 'cancel'], eroare: 'Posibil document duplicat.' } });
    return route.fulfill({ status: 201, json: { document_id: 'document-separate', version_id: 'version-separate', version_number: 1 } });
  });

  await page.getByRole('button', { name: 'Aprobă și publică' }).click();
  await expect(page.getByRole('heading', { name: 'Posibil document duplicat' })).toBeVisible();
  await expect(page.getByText('număr și dată identice')).toBeVisible();
  await page.getByRole('button', { name: 'Publică separat' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Documentul a fost aprobat' })).toBeVisible();
  expect(publicationBodies.map((body) => body.duplicate_action)).toEqual([null, 'separate']);
});

test('cancels publication from the possible duplicate warning without another request', async ({ page }) => {
  await confirmEditorForPublication(page);
  let publicationCalls = 0;
  await page.route('**/api/drafts/editor-1/publish', async (route) => {
    publicationCalls += 1;
    await route.fulfill({ status: 409, json: { cod: 'possible_duplicate', matches: [possibleDuplicate], options: ['version', 'separate', 'cancel'], eroare: 'Posibil document duplicat.' } });
  });

  await page.getByRole('button', { name: 'Aprobă și publică' }).click();
  await expect(page.getByRole('heading', { name: 'Posibil document duplicat' })).toBeVisible();
  await page.getByRole('button', { name: 'Anulează publicarea' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Publicarea a fost anulată' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Posibil document duplicat' })).toHaveCount(0);
  expect(publicationCalls).toBe(1);
});

test('keeps the editor workspace usable when the AppShell sidebar collapses and expands', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await openEditor(page);
  const shell = page.locator('.app-shell');
  const nav = page.getByRole('navigation', { name: 'Navigare principală' });
  const workspace = page.locator('.editor-workspace');
  await expect(nav).toBeVisible();
  const expanded = await workspace.boundingBox();
  await page.getByRole('button', { name: 'Minimizează meniul' }).click();
  await expect(shell).toHaveAttribute('data-sidebar', 'minimized');
  await expect(nav).toBeVisible();
  const collapsed = await workspace.boundingBox();
  expect(collapsed.width).toBeGreaterThan(1000);
  expect(collapsed.height).toBeGreaterThan(600);
  expect(collapsed.width).toBeGreaterThan(expanded.width - 200);
  await expect(page.getByRole('heading', { name: draft.name })).toBeVisible();
  await page.getByRole('button', { name: 'Extinde meniul' }).click();
  await expect(shell).toHaveAttribute('data-sidebar', 'expanded');
  await expect(page.getByRole('navigation', { name: 'Navigare principală' }).getByText('Cozi de lucru')).toBeVisible();
  expect(await workspace.evaluate((element) => element.clientWidth)).toBeGreaterThan(1000);
});

test('uses the available pane for a default fit-to-page viewer and a one-row toolbar', async ({ page }) => {
  await openEditor(page);
  for (const viewport of [{ width: 1366, height: 768 }, { width: 1600, height: 900 }]) {
    await page.setViewportSize(viewport);
    const geometry = await page.locator('.editor-preview-pages').first().evaluate((viewer) => {
      const canvas = viewer.querySelector('.editor-page-canvas').getBoundingClientRect();
      const heading = viewer.querySelector('.editor-source-page h3').getBoundingClientRect();
      const toolbar = viewer.closest('.editor-card').querySelector('.editor-viewer-toolbar').getBoundingClientRect();
      const box = viewer.getBoundingClientRect();
      return { viewerHeight: box.height, canvasHeight: canvas.height, canvasTop: canvas.top, headingBottom: heading.bottom, viewerBottom: box.bottom, toolbarHeight: toolbar.height, scrollWidth: document.documentElement.scrollWidth, width: innerWidth };
    });
    expect(geometry.viewerHeight).toBeGreaterThan(300);
    expect(geometry.toolbarHeight).toBeLessThanOrEqual(44);
    expect(geometry.canvasTop).toBeGreaterThanOrEqual(geometry.headingBottom);
    expect(geometry.canvasTop + geometry.canvasHeight).toBeLessThanOrEqual(geometry.viewerBottom);
    expect(geometry.scrollWidth).toBe(geometry.width);
  }
  await expect(page.getByRole('button', { name: 'Potrivire la pagină' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Potrivire la lățime' })).toBeVisible();
});

test('shows loading feedback while the draft and its document page are pending', async ({ page }) => {
  const editor = deferred(), editorStarted = deferred(), image = deferred(), imageStarted = deferred();
  await openEditor(page, editorState, 200, { editor, editorStarted, image, imageStarted });
  await expect(page.getByRole('status').filter({ hasText: 'Se încarcă documentul' })).toBeVisible();
  editor.resolve();
  await imageStarted.promise;
  await expect(page.getByRole('status').filter({ hasText: 'Se încarcă pagina 1' })).toBeVisible();
  image.resolve();
  await expect(page.getByRole('status').filter({ hasText: 'Se încarcă pagina 1' })).toBeHidden();
});

test('shows draft and OCR saving feedback while the correction request is pending', async ({ page }) => {
  await openEditor(page);
  await showTab(page, 'Corectare OCR');
  await page.getByLabel('Corectare OCR · Pagina 1').fill('CNP corectat');
  const saveRequest = deferred(), saveStarted = deferred();
  await page.route('**/api/drafts/editor-1/editor/ocr', async (route) => {
    if (route.request().method() !== 'PATCH') return route.fallback();
    saveStarted.resolve(); await saveRequest.promise;
    await route.fulfill({ json: { ...editorState, ocr_revision: 2, detection_revision: 2, pages: [{ ...editorState.pages[0], corrected_text: 'CNP corectat' }] } });
  });
  await page.getByRole('button', { name: 'Salvează ciorna' }).click();
  await saveStarted.promise;
  await expect(page.getByRole('button', { name: 'Se salvează ciorna…' })).toBeDisabled();
  await expect(page.locator('.editor-toast-status').filter({ hasText: 'Se salvează ciorna' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Se salvează…' })).toBeDisabled();
  saveRequest.resolve();
  await expect(page.getByRole('status').filter({ hasText: 'Ciorna a fost salvată' })).toBeVisible();
});

test('blocks duplicate redaction preview requests while generation is pending', async ({ page }) => {
  const candidate = { ...editorState.candidates[0], bounding_boxes: [{ left: 22, top: 1, width: 50, height: 10 }], location_status: 'reliable' };
  await openEditor(page, { ...editorState, candidates: [candidate] });
  await showTab(page, 'Anonimizare');

  const previewRequest = deferred(), previewStarted = deferred();
  await page.route('**/api/drafts/editor-1/editor/redaction-preview', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    previewStarted.resolve(); await previewRequest.promise;
    await route.fulfill({ json: { status: 'ready' } });
  });
  const preview = page.getByRole('button', { name: 'Previzualizează anonimizarea' });
  await preview.click();
  await previewStarted.promise;
  await expect(page.getByRole('status').filter({ hasText: 'Se generează previzualizarea' })).toBeVisible();
  await expect(preview).toBeDisabled();
  previewRequest.resolve();
  const previewToast = page.locator('.editor-toast-status').filter({ hasText: 'Previzualizarea anonimizării a fost generată' });
  await expect(previewToast).toBeVisible();
  await expect(page.locator('.editor-error-toasts')).toHaveCSS('position', 'fixed');
  const anonymized = page.getByRole('button', { name: 'Anonimizat' });
  await expect(anonymized).toBeEnabled();
  await anonymized.click();
  await expect(page.getByTitle('Document anonimizat')).toBeVisible();
  await page.getByRole('button', { name: 'Original' }).click();
  await expect(page.getByLabel('Pagini documentului')).toBeVisible();
});

test('selects one workflow tab at a time and keeps the continuous viewer available', async ({ page }) => {
  await openEditor(page);
  await expect(page.getByRole('tabpanel', { name: 'Date document' })).toBeVisible();
  await expect(page.locator('#editor-panel-ocr')).toBeHidden();
  await expect(page.getByRole('application', { name: 'Document original, pagina 1' })).toBeVisible();
  const tabs = page.getByRole('tablist', { name: 'Etapele editorului' });
  await tabs.getByRole('tab', { name: /Corectare OCR/ }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.getByRole('tab', { name: /Anonimizare/ })).toBeFocused();
  await expect(page.getByRole('tabpanel', { name: /Anonimizare/ })).toBeVisible();
  await expect(page.locator('#editor-panel-metadata')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Salvează ciorna' })).toBeVisible();
});

test('navigates continuous pages, keeps zoom and saves draft without confirming or publishing', async ({ page }) => {
  const twoPages = { ...editorState, pages: [...editorState.pages, { ...editorState.pages[0], page: 2 }] };
  await openEditor(page, twoPages);
  await expect(page.locator('.editor-source-page')).toHaveCount(2);
  await expect.poll(async () => Number((await page.locator('.editor-zoom-value').textContent()).replace('%', ''))).toBeLessThan(100);
  const initialZoom = Number((await page.locator('.editor-zoom-value').textContent()).replace('%', ''));
  await page.getByRole('button', { name: 'Mărește' }).click();
  await expect(page.locator('.editor-page-canvas').first()).toHaveAttribute('style', new RegExp(`inline-size: ${initialZoom + 10}%`));
  const alignedAt110 = await page.locator('.editor-page-canvas').first().evaluate((canvas) => {
    const container = canvas.getBoundingClientRect();
    return ['img', 'svg'].map((selector) => { const bounds = canvas.querySelector(selector).getBoundingClientRect(); return [bounds.left - container.left, bounds.top - container.top, bounds.width - container.width, bounds.height - container.height]; });
  });
  for (const bounds of alignedAt110) for (const delta of bounds) expect(Math.abs(delta)).toBeLessThanOrEqual(2);
  await page.getByRole('button', { name: 'Potrivire la pagină' }).click();
  const fitZoom = Number((await page.locator('.editor-zoom-value').textContent()).replace('%', ''));
  expect(fitZoom).toBeGreaterThan(0);
  expect(fitZoom).toBeLessThanOrEqual(100);
  await page.getByRole('button', { name: 'Potrivire la lățime' }).click();
  await expect(page.locator('.editor-page-canvas').first()).toHaveAttribute('style', /inline-size: 100%/);
  await page.getByLabel('Pagina documentului').selectOption('2');
  await expect(page.getByLabel('Pagina documentului')).toHaveValue('2');
  await showTab(page, 'Corectare OCR');
  await page.getByLabel('Corectare OCR · Pagina 1').fill('CNP corectat');
  await showTab(page, 'Date document');
  await page.getByLabel('Numărul actului').fill('42');
  let metadataSaved = false;
  let ocrSaved = false;
  let forbiddenCall = false;
  page.on('request', (request) => { if (/metadata\/confirm|review\/confirm|\/publish/.test(request.url())) forbiddenCall = true; });
  await page.route('**/api/drafts/editor-1/metadata', (route) => {
    if (route.request().method() === 'PATCH') { metadataSaved = true; return route.fulfill({ json: { metadata: { act_number: '42' }, metadata_revision: 2, ocr_revision: 1, classification, retention: null } }); }
    return route.fulfill({ json: structuredClone(metadataState) });
  });
  await page.route('**/api/drafts/editor-1/editor/ocr', (route) => { ocrSaved = true; return route.fulfill({ json: { ...twoPages, ocr_revision: 2, detection_revision: 2, pages: twoPages.pages.map((page, index) => ({ ...page, corrected_text: index ? page.corrected_text : 'CNP corectat' })) } }); });
  await page.getByRole('button', { name: 'Salvează ciorna' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Ciorna a fost salvată' })).toBeVisible();
  expect(metadataSaved).toBe(true);
  expect(ocrSaved).toBe(true);
  expect(forbiddenCall).toBe(false);
});

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

test('admin creates a classified physical dossier and the Editor selects it', async ({ page }) => {
  await openEditor(page, editorState, 200, {}, 'admin');
  let creationRequest;
  await page.route('**/api/physical-dossiers*', async (route) => {
    if (route.request().method() === 'POST') {
      creationRequest = route.request().postDataJSON();
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ dossier: { id: 202, physical_dossier_number: '30/2026', inventory_number: 'INV-30/2026', archival_indicator: classification.archival_indicator, retention_time: classification.retention_term, description: 'Dosar creat din Editor' } }),
      });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ dossiers: [] }) });
  });
  await page.getByLabel('Tip document').selectOption('Contract');
  await page.getByLabel('Subtip').selectOption(classification.subtype);
  await page.getByLabel('Context de arhivare').selectOption(classification.storage_context);
  await page.getByRole('button', { name: 'Creează dosarul fizic' }).click();
  await page.getByLabel('Numărul dosarului fizic').fill('30/2026');
  await page.getByLabel('Număr inventar dosar').fill('INV-30/2026');
  await page.getByLabel('Descriere scurtă (opțional)').fill('Dosar creat din Editor');
  await page.getByRole('dialog').getByRole('button', { name: 'Creează dosarul' }).click();
  await expect.poll(() => creationRequest).toEqual({
    nomenclature_entry_id: classification.id,
    physical_dossier_number: '30/2026',
    inventory_number: 'INV-30/2026',
    description: 'Dosar creat din Editor',
  });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByLabel('Dosarul fizic')).toHaveValue('202');
});

for (const role of ['admin', 'arhivar']) {
  test(`${role} keeps a newly created dossier when the earlier lookup finishes late`, async ({ page, colorScheme }, testInfo) => {
    const lookup = deferred(), lookupStarted = deferred();
    let creationRequest;
    await openEditor(page, editorState, 200, {}, role);
    await page.route('**/api/physical-dossiers*', async (route) => {
      if (route.request().method() === 'POST') {
        creationRequest = route.request().postDataJSON();
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ dossier: { id: 202, physical_dossier_number: '30/2026', inventory_number: 'INV-30/2026', archival_indicator: classification.archival_indicator, retention_time: classification.retention_term, description: null } }),
        });
      }
      lookupStarted.resolve();
      await lookup.promise;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ dossiers: [] }) });
    });
    await page.getByLabel('Tip document').selectOption('Contract');
    await page.getByLabel('Subtip').selectOption(classification.subtype);
    await page.getByLabel('Context de arhivare').selectOption(classification.storage_context);
    await lookupStarted.promise;
    const isDesktop = testInfo.project.name.startsWith('desktop');
    const viewport = isDesktop ? '1600x900' : '320x740';
    await page.setViewportSize(isDesktop ? { width: 1600, height: 900 } : { width: 320, height: 740 });
    const createButton = page.getByRole('button', { name: 'Creează dosarul fizic' });
    await createButton.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `screens/DS-011.dossier-create.${role}.${viewport}.${colorScheme}.png`, scale: 'css', fullPage: true });
    await createButton.click();
    await page.getByLabel('Numărul dosarului fizic').fill('30/2026');
    await page.getByLabel('Număr inventar dosar').fill('INV-30/2026');
    await page.getByRole('dialog').getByRole('button', { name: 'Creează dosarul' }).click();
    await expect.poll(() => creationRequest).toBeDefined();
    await expect(page.getByLabel('Dosarul fizic')).toHaveValue('202');
    await expect(page.getByLabel('Dosarul fizic').getByRole('option', { name: '30/2026' })).toHaveCount(1);
    lookup.resolve();
    await expect(page.getByLabel('Dosarul fizic')).toHaveValue('202');
    await expect(page.getByLabel('Dosarul fizic').getByRole('option', { name: '30/2026' })).toHaveCount(1);
  });
}

test('confirms the current final review and publishes with an idempotency key', async ({ page }) => {
  await openEditor(page, { ...editorState, candidates: [] });
  let finalReviewBody;
  let publicationBody;
  let idempotencyKey;
  const finalizationCalls = [];
  const publicationRequest = deferred(), publicationStarted = deferred();
  await page.route('**/api/drafts/editor-1/metadata', async (route) => {
    if (route.request().method() === 'PATCH') await route.fulfill({ json: { metadata: { act_date: '2026-11-18', act_number: '41', physical_dossier_id: 101, inventory_number: '29/2026', tags: ['Contract'] }, metadata_confirmed: false, metadata_revision: 2, ocr_revision: 1, classification, retention: { status: 'calculated', first_eligible_date: '2036-01-01' } } });
    else await route.fulfill({ json: structuredClone(metadataState) });
  });
  await page.route('**/api/drafts/editor-1/metadata/confirm', (route) => route.fulfill({ json: { metadata_confirmed: true, metadata_revision: 2, ocr_revision: 1 } }));
  await page.route('**/api/drafts/editor-1/editor/redaction-marks', async (route) => route.fulfill({ json: { marks: route.request().postDataJSON().marks } }));
  await page.route('**/api/drafts/editor-1/editor/redaction-preview', (route) => {
    if (route.request().method() === 'POST') { finalizationCalls.push('redaction'); return route.fulfill({ json: { status: 'ready' } }); }
    return route.fulfill({ status: 200, contentType: 'application/pdf', body: '%PDF-1.4' });
  });
  await page.route('**/api/drafts/editor-1/review/confirm', async (route) => {
    finalizationCalls.push('review');
    finalReviewBody = route.request().postDataJSON();
    await route.fulfill({ json: { review_confirmed: true, review_snapshot: '5ac61e6a-3fd5-45d2-890c-c026e01ad67a' } });
  });
  await page.route('**/api/drafts/editor-1/publish', async (route) => {
    publicationBody = route.request().postDataJSON();
    idempotencyKey = route.request().headers()['idempotency-key'];
    publicationStarted.resolve(); await publicationRequest.promise;
    await route.fulfill({ status: 201, json: { document_id: 'document-1', version_id: 'version-1', version_number: 1 } });
  });
  await page.getByLabel('Tip document').selectOption('Contract');
  await page.getByLabel('Subtip').selectOption('contract de comodat');
  await page.getByLabel('Context de arhivare').selectOption('Act de sine stătător');
  await page.getByLabel('Data actului').fill('2026-11-18');
  await page.getByLabel('Numărul actului').fill('41');
  await page.getByLabel('Dosar fizic').selectOption('101');
  await page.getByRole('checkbox', { name: 'Confirmă metadatele' }).check();
  await showTab(page, 'Anonimizare');
  const canvas = page.getByRole('application', { name: 'Document original, pagina 1' });
  await page.locator('.editor-viewer-toolbar').getByRole('button', { name: 'Marchează o zonă' }).click();
  await canvas.press('Enter'); await canvas.press('ArrowRight'); await canvas.press('ArrowDown'); await canvas.press('Enter');
  await showTab(page, 'Verificare finală');
  await page.getByRole('button', { name: 'Confirmă revizuirea finală' }).click();
  await expect.poll(() => finalizationCalls).toEqual(['redaction', 'review']);
  await page.getByRole('button', { name: 'Aprobă și publică' }).click();
  await publicationStarted.promise;
  await expect(page.getByRole('button', { name: 'Se publică…' })).toBeDisabled();
  publicationRequest.resolve();
  await expect(page.getByRole('status').filter({ hasText: 'Documentul a fost aprobat' })).toBeVisible();
  expect(finalReviewBody).toEqual({ metadata_revision: 2, ocr_revision: 1, detection_revision: 1, redaction_ocr_revision: 1, redaction_detection_revision: 1 });
  expect(publicationBody.review_snapshot).toBe('5ac61e6a-3fd5-45d2-890c-c026e01ad67a');
  expect(idempotencyKey).toMatch(/^[0-9a-f-]{36}$/i);
});

test('edits OCR with stale redaction state disabled and saves fresh detections', async ({ page, colorScheme }, testInfo) => {
  await openEditor(page);
  await showTab(page, 'Corectare OCR');
  const area = page.getByLabel('Corectare OCR · Pagina 1');
  await expect(area).toHaveValue('CNP 1960523123456');
  await expect(page.getByText('Casete de delimitare')).toHaveCount(0);
  const isDesktop = testInfo.project.name.startsWith('desktop');
  await page.setViewportSize(isDesktop ? { width: 1600, height: 900 } : { width: 320, height: 740 });
  await page.screenshot({ path: `screens/DS-011.${isDesktop ? '1600x900' : '320x740'}.${colorScheme}.png`, scale: 'css' });
  await showTab(page, 'Anonimizare');
  if (isDesktop) {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.screenshot({ path: `screens/DS-011.PII.1366x768.${colorScheme}.png`, scale: 'css' });
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.screenshot({ path: `screens/DS-011.PII.1600x900.${colorScheme}.png`, scale: 'css' });
  } else {
    await page.screenshot({ path: `screens/DS-011.PII.320x740.${colorScheme}.png`, scale: 'css' });
  }
  await showTab(page, 'Corectare OCR');
  await area.fill('CNP 1960523123456 corectat');
  await expect(page.getByRole('tab', { name: /Corectare OCR.*Corecturi nesalvate/ })).toBeVisible();
  await showTab(page, 'Anonimizare');
  let savedBody;
  await page.route('**/api/drafts/editor-1/editor/ocr', async (route) => {
    savedBody = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...editorState, ocr_revision: 2, detection_revision: 2, pages: [{ ...editorState.pages[0], corrected_text: 'CNP 1960523123456 corectat' }] }) });
  });
  await showTab(page, 'Corectare OCR');
  await page.getByRole('button', { name: 'Salvează corecturile' }).click();
  await expect.poll(() => savedBody?.ocr_revision).toBe(1);
  await showTab(page, 'Anonimizare');
  await expect(page.getByText('Potrivirile cu localizare sigură sunt incluse implicit; cele fără localizare sigură sunt omise automat.')).toBeVisible();
});

test('shows the empty candidate state', async ({ page }) => {
  await openEditor(page, { ...editorState, candidates: [] });
  await showTab(page, 'Anonimizare');
  await expect(page.getByText('Nu au fost găsite potriviri PII.')).toBeVisible();
});

test('keeps long OCR and many candidate rows usable at the narrow viewport', async ({ page }) => {
  const text = 'Text OCR sintetic pentru verificarea unui pasaj foarte lung. '.repeat(24);
  const candidates = Array.from({ length: 12 }, (_, index) => ({
    ...editorState.candidates[0], id: `candidate-${index}`, location_status: 'reliable',
    bounding_boxes: [{ left: 22, top: 1, width: 50, height: 10 }], corrected_text_span: { start: 0, length: 25 },
  }));
  await openEditor(page, { ...editorState, pages: [{ ...editorState.pages[0], corrected_text: text }], candidates });
  await showTab(page, 'Anonimizare');
  await page.setViewportSize({ width: 320, height: 740 });
  await expect(page.getByRole('region', { name: 'Anonimizări aplicate' }).getByRole('listitem')).toHaveCount(12);
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 320);
});

test('shows an actionable editor load error', async ({ page }) => {
  await openEditor(page, editorState, 500);
  await expect(page.getByRole('alert')).toHaveText('Editorul nu a putut fi încărcat.');
  await expect(page.getByRole('button', { name: 'Reîncearcă încărcarea' })).toBeVisible();
});

test('draws a revision-bound mark after scrolling, supports undo, and generates a preview', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  let pdfRequests = 0;
  await page.route('**/api/drafts/editor-1/editor/redaction-preview', async (route) => {
    if (route.request().method() === 'POST') await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ready' }) });
    else { pdfRequests++; await route.fulfill({ status: 200, contentType: 'application/pdf', body: '%PDF-1.4' }); }
  });
  await openEditor(page);
  expect(pdfRequests).toBe(0);
  await page.getByRole('button', { name: 'Mărește' }).click();
  await page.locator('.editor-viewer-toolbar').getByRole('button', { name: 'Marchează o zonă' }).click();
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
  const firstPoint = await canvas.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const viewport = element.closest('.editor-preview-pages').getBoundingClientRect();
    const top = Math.max(bounds.top, viewport.top), bottom = Math.min(bounds.bottom, viewport.bottom);
    return { x: bounds.left + bounds.width * 0.2, y: top + (bottom - top) * 0.2 };
  });
  await page.mouse.move(firstPoint.x, firstPoint.y);
  await page.mouse.down();
  const resized = await canvas.boundingBox();
  await page.mouse.move(firstPoint.x + resized.width * 0.2, firstPoint.y + Math.min(60, resized.height * 0.1));
  await expect(page.locator('.editor-mark-rect.preview')).toBeVisible();
  await page.mouse.up();
  await expect.poll(() => saved?.marks?.length).toBe(1);
  expect(saved.ocr_revision).toBe(1);
  expect(saved.detection_revision).toBe(1);
  await expect(page.locator('.editor-mark-count')).toHaveText('Marcaje aplicate 1');
  await showTab(page, 'Anonimizare');
  const appliedList = page.getByRole('region', { name: 'Anonimizări aplicate' });
  await appliedList.getByRole('button', { name: 'Elimină anonimizarea: Zonă manuală, pagina 1' }).click();
  await expect(page.locator('.editor-mark-count')).toHaveText('Marcaje aplicate 0');
  await appliedList.getByRole('button', { name: 'Anulează eliminarea' }).click();
  await expect(page.locator('.editor-mark-count')).toHaveText('Marcaje aplicate 1');
  await page.getByRole('button', { name: 'Previzualizează anonimizarea' }).click();
  await expect.poll(() => pdfRequests).toBe(1);
  await page.getByRole('button', { name: 'Anonimizat' }).click();
  await expect(page.getByTitle('Document anonimizat')).toBeVisible();
});

test('editor errors appear as separate short-lived popups', async ({ page }, testInfo) => {
  await page.clock.install();
  let previewRequests = 0;
  await page.route('**/api/drafts/editor-1/editor/redaction-preview', async (route) => {
    if (route.request().method() === 'POST') {
      previewRequests++;
      await route.fulfill({ status: 422, json: { eroare: 'Previzualizarea nu a putut fi generată.' } });
    } else await route.fulfill({ status: 200, contentType: 'application/pdf', body: '%PDF-1.4' });
  });
  const candidate = { ...editorState.candidates[0], disposition: 'redact', location_status: 'reliable', bounding_boxes: [{ left: 22, top: 1, width: 50, height: 10 }] };
  await page.route('**/api/drafts/editor-1/editor/redaction-marks', (route) => route.fulfill({ status: 500, json: { eroare: 'Eliminarea nu a putut fi salvată.' } }));
  await openEditor(page, { ...editorState, candidates: [candidate] });
  await showTab(page, 'Anonimizare');
  await page.getByRole('button', { name: /Elimină anonimizarea/ }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Eliminarea nu a putut fi salvată.' })).toBeVisible();
  await page.getByRole('button', { name: 'Anonimizat' }).click();
  await expect.poll(() => previewRequests).toBe(1);
  const firstError = page.getByRole('alert').filter({ hasText: 'Eliminarea nu a putut fi salvată.' });
  const secondError = page.getByRole('alert').filter({ hasText: 'Previzualizarea nu a putut fi generată.' });
  await expect(firstError).toBeVisible();
  await expect(secondError).toBeVisible();
  await page.screenshot({ path: `screens/DS-011.errors.${testInfo.project.name}.png`, fullPage: true });
  await page.clock.fastForward(6100);
  await expect(firstError).toHaveCount(0);
  await expect(secondError).toHaveCount(0);
});

test('Anonimizat switches to the PDF after successfully generating it', async ({ page }) => {
  let pdfRequests = 0;
  await page.route('**/api/drafts/editor-1/editor/redaction-preview', async (route) => {
    if (route.request().method() === 'POST') await route.fulfill({ json: { status: 'ready' } });
    else { pdfRequests++; await route.fulfill({ status: 200, contentType: 'application/pdf', body: '%PDF-1.4' }); }
  });
  const candidate = { ...editorState.candidates[0], disposition: 'review', location_status: 'reliable', bounding_boxes: [{ left: 22, top: 1, width: 50, height: 10 }] };
  await openEditor(page, { ...editorState, candidates: [candidate] });
  await page.getByRole('button', { name: 'Anonimizat' }).click();
  await expect.poll(() => pdfRequests).toBe(1);
  await expect(page.getByRole('button', { name: 'Anonimizat' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTitle('Document anonimizat')).toBeVisible();
});

test('includes uncertain detections with safe geometry by default', async ({ page }) => {
  const uncertain = { ...editorState.candidates[0], review_status: 'pending', location_status: 'reliable', bounding_boxes: [{ left: 22, top: 1, width: 50, height: 10 }] };
  let pdfRequests = 0;
  await page.route('**/api/drafts/editor-1/editor/redaction-preview', async (route) => {
    if (route.request().method() === 'POST') await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ready' }) });
    else { pdfRequests++; await route.fulfill({ status: 200, contentType: 'application/pdf', body: '%PDF-1.4' }); }
  });
  await openEditor(page, { ...editorState, candidates: [uncertain] });
  expect(pdfRequests).toBe(0);
  await showTab(page, 'Anonimizare');
  const appliedList = page.getByRole('region', { name: 'Anonimizări aplicate' });
  await expect(appliedList.getByText('Automată · Pagina 1')).toBeVisible();
  await expect(appliedList.getByText('1960523123456')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Previzualizează anonimizarea' })).toBeEnabled();
  await page.getByRole('button', { name: 'Previzualizează anonimizarea' }).click();
  await expect.poll(() => pdfRequests).toBe(1);
  await page.getByRole('button', { name: 'Anonimizat' }).click();
  await expect(page.getByTitle('Document anonimizat')).toBeVisible();
});

test('omits detections without safe geometry and does not require manual marking', async ({ page }) => {
  const uncertain = { ...editorState.candidates[0], review_status: 'pending' };
  let pdfRequests = 0;
  await page.route('**/api/drafts/editor-1/editor/redaction-preview', async (route) => {
    if (route.request().method() === 'POST') await route.fulfill({ status: 200, json: { status: 'ready' } });
    else { pdfRequests++; await route.fulfill({ status: 200, contentType: 'application/pdf', body: '%PDF-1.4' }); }
  });
  await openEditor(page, { ...editorState, candidates: [uncertain] });
  await showTab(page, 'Anonimizare');
  const appliedList = page.getByRole('region', { name: 'Anonimizări aplicate' });
  await expect(appliedList.getByText('Nu există anonimizări aplicate.')).toBeVisible();
  await expect(page.getByText('Potrivirile cu localizare sigură sunt incluse implicit; cele fără localizare sigură sunt omise automat.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Marchează pe pagina 1' })).toHaveCount(0);
  const preview = page.getByRole('button', { name: 'Previzualizează anonimizarea' });
  await expect(preview).toBeEnabled();
  await preview.click();
  await expect.poll(() => pdfRequests).toBe(1);
  await page.getByRole('button', { name: 'Anonimizat' }).click();
  await expect(page.getByTitle('Document anonimizat')).toBeVisible();
});

test('omits geometryless detections even when they are present in the Editor response', async ({ page }) => {
  await openEditor(page, { ...editorState, candidates: [{ ...editorState.candidates[0], review_status: 'accepted' }] });
  const preview = page.getByRole('button', { name: 'Previzualizează anonimizarea' });
  await expect(preview).toBeEnabled();
  await showTab(page, 'Anonimizare');
  await expect(page.getByRole('region', { name: 'Anonimizări aplicate' }).getByText('Nu există anonimizări aplicate.')).toBeVisible();
});

test('draws a mark from the keyboard using page coordinates', async ({ page }) => {
  await openEditor(page);
  let saved;
  await page.route('**/api/drafts/editor-1/editor/redaction-marks', async (route) => {
    expect(route.request().headers()['content-type']).toContain('application/json');
    saved = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ marks: saved.marks }) });
  });
  await page.locator('.editor-viewer-toolbar').getByRole('button', { name: 'Marchează o zonă' }).click();
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

test('shows eligible automatic redactions by default and persists removal and undo', async ({ page }) => {
  const automatic = { ...editorState.candidates[0], disposition: 'redact', confidence: 99, location_status: 'reliable', review_status: 'pending', bounding_boxes: [{ left: 22, top: 1, width: 50, height: 10 }] };
  await openEditor(page, { ...editorState, candidates: [automatic] });
  await showTab(page, 'Anonimizare');
  const list = page.getByRole('region', { name: 'Anonimizări aplicate' });
  await expect(list.getByText('Automată · Pagina 1')).toBeVisible();
  await expect(list.getByText('1960523123456')).toBeVisible();
  let saved;
  await page.route('**/api/drafts/editor-1/editor/redaction-marks', async (route) => {
    saved = route.request().postDataJSON();
    await route.fulfill({ json: { marks: saved.marks, excluded_candidate_ids: saved.excluded_candidate_ids } });
  });
  await list.getByRole('button', { name: /Elimină anonimizarea/ }).click();
  await expect.poll(() => saved?.excluded_candidate_ids).toEqual(['candidate-1']);
  await expect(list.getByText('Nu există anonimizări aplicate.')).toBeVisible();
  await list.getByRole('button', { name: 'Anulează eliminarea' }).click();
  await expect.poll(() => saved?.excluded_candidate_ids).toEqual([]);
  await expect(list.getByText('1960523123456')).toBeVisible();
});

test('records textarea correction operations with UTF-16 offsets', async ({ page }) => {
  await openEditor(page);
  await showTab(page, 'Corectare OCR');
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
