import { test, expect } from '@playwright/test';

const longName = 'Dosar_sintetic_documente_justificative_documente_justificative_exemplu.pdf';
const reviewDraft = { id: 'review-1', name: longName, status: 'review_ready', source_format: 'pdf' };
const quarantineDraft = { id: 'quarantine-1', name: 'Scanare_deteriorată.pdf', status: 'quarantined', source_format: 'pdf' };

async function openQueue(page, response = { review: [reviewDraft], quarantine: [quarantineDraft] }) {
  const queueState = structuredClone(response);
  await page.route('**/api/user', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ id: 1, username: 'arhivar', role: 'arhivar' }),
  }));
  await page.route('**/api/drafts/queue', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(queueState),
  }));
  await page.route('**/sanctum/csrf-cookie', (route) => route.fulfill({ status: 204 }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Cozi de lucru' }).last().click();
  await expect(page.getByRole('heading', { name: 'Cozi de lucru' })).toBeVisible();
  return queueState;
}

test('shows counted review and quarantine tabs and hands off to protected OCR results', async ({ page, colorScheme }, testInfo) => {
  await openQueue(page);
  await page.route('**/api/drafts/review-1/ocr', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ pages: [] }),
  }));
  await page.route('**/api/drafts/review-1/preview', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ pages: [], expires_at: new Date(Date.now() + 60_000).toISOString() }),
  }));
  await expect(page.getByRole('tab', { name: 'Revizuire (1)' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText(longName)).toBeVisible();
  const isDesktop = testInfo.project.name.startsWith('desktop');
  const viewport = isDesktop ? '1600x900' : '320x740';
  await page.setViewportSize(isDesktop ? { width: 1600, height: 900 } : { width: 320, height: 740 });
  await page.screenshot({ path: `test-results/DS-004.${viewport}.${colorScheme}.png`, fullPage: true });
  await page.getByRole('tab', { name: /Carantină/ }).click();
  await page.screenshot({ path: `test-results/DS-004.carantina.${viewport}.${colorScheme}.png`, fullPage: true });
  await page.getByRole('tab', { name: /Revizuire/ }).click();
  await page.getByRole('button', { name: 'Începe revizuirea' }).click();
  await expect(page.getByRole('heading', { name: 'Rezultate OCR' })).toBeVisible();
});

test('retry reports success, permanent failure requires confirmation, and stale items leave the list', async ({ page }) => {
  const retryQueue = await openQueue(page);
  await page.getByRole('tab', { name: /Carantină/ }).click();
  await expect(page.getByText('4 încercări de OCR eșuate')).toBeVisible();
  let retryAttempts = 0;
  await page.route('**/api/drafts/quarantine-1/retry', (route) => {
    retryAttempts += 1;
    if (retryAttempts === 1) return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ eroare: 'Nu am putut trimite documentul la procesare. Încearcă din nou.' }) });
    retryQueue.quarantine = [];
    return route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'queued' }),
    });
  });
  await page.getByRole('button', { name: 'Reîncearcă procesarea' }).click();
  await expect(page.getByRole('alert')).toHaveText('Nu am putut trimite documentul la procesare. Încearcă din nou.');
  await page.getByRole('button', { name: 'Reîncearcă procesarea' }).click();
  await expect(page.getByRole('status')).toContainText('Documentul a fost trimis din nou la procesare.');

  const permanentQueue = await openQueue(page);
  await page.getByRole('tab', { name: /Carantină/ }).click();
  await page.route('**/api/drafts/quarantine-1/permanent-failure', (route) => {
    permanentQueue.quarantine = [];
    return route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'failed_permanently' }),
    });
  });
  await page.getByRole('button', { name: 'Marchează ca eșuat definitiv' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: 'Marchează ca eșuat definitiv' }).click();
  await dialog.getByRole('button', { name: 'Confirmă schimbarea stării' }).click();
  await expect(page.getByRole('status')).toContainText('Eșuat definitiv');
  await expect(page.getByText('Scanare_deteriorată.pdf')).toHaveCount(0);
});

test('recovers from a queue loading error', async ({ page }) => {
  let loads = 0;
  await page.route('**/api/user', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ id: 1, username: 'admin', role: 'admin' }),
  }));
  await page.route('**/api/drafts/queue', (route) => {
    loads += 1;
    return route.fulfill(loads === 1
      ? { status: 500, contentType: 'application/json', body: JSON.stringify({ eroare: 'Nu am putut încărca documentele.' }) }
      : { status: 200, contentType: 'application/json', body: JSON.stringify({ review: [], quarantine: [] }) });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Cozi de lucru' }).last().click();
  await expect(page.getByRole('alert')).toHaveText('Nu am putut încărca documentele.');
  await page.getByRole('button', { name: 'Încearcă din nou' }).click();
  await expect(page.getByText('Nu sunt documente pentru revizuire.')).toBeVisible();
});

test('supports keyboard tab selection, empty state, and narrow screens', async ({ page }) => {
  await openQueue(page, { review: [], quarantine: [] });
  await expect(page.getByText('Nu sunt documente pentru revizuire.')).toBeVisible();
  const reviewTab = page.getByRole('tab', { name: /Revizuire/ });
  await reviewTab.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: /Carantină/ })).toBeFocused();
  await page.setViewportSize({ width: 320, height: 720 });
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 320);
});
