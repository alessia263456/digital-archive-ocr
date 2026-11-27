import { test, expect } from '@playwright/test';
import path from 'node:path';

test.skip(
  !process.env.M2_TEST_ADMIN_USERNAME || !process.env.M2_TEST_ADMIN_PASSWORD,
  'Set M2_TEST_ADMIN_USERNAME and M2_TEST_ADMIN_PASSWORD for an isolated disposable M2 API workflow.',
);

test('hands off from DS-004 through metadata, final review, and immutable publication using Laravel', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-light', 'Run the stateful publication workflow once.');
  test.setTimeout(180_000);
  await page.goto('/');
  await page.getByLabel('Nume de utilizator').fill(process.env.M2_TEST_ADMIN_USERNAME);
  await page.getByLabel('Parolă').fill(process.env.M2_TEST_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Autentificare' }).click();
  await expect(page.getByRole('heading', { name: 'Căutare în arhivă' })).toBeVisible();

  await page.getByRole('button', { name: 'Încarcă documente' }).first().click();
  await page.getByRole('button', { name: 'Colecție de imagini JPG și PNG' }).click();
  await page.locator('#draft-files').setInputFiles(path.resolve('fixtures/romanian.png'));
  await page.getByRole('button', { name: 'Încarcă documentul' }).click();
  const refresh = page.getByRole('button', { name: 'Actualizează starea' }).first();
  await expect.poll(async () => {
    const label = (await page.locator('.draft-status').first().textContent())?.trim();
    if (label && label !== 'Gata de revizuit') await refresh.click();
    return label;
  }, { timeout: 90_000, intervals: [1000, 2000, 3000] }).toBe('Gata de revizuit');
  console.log('M2 real API: OCR ready');

  await page.getByRole('button', { name: 'Cozi de lucru' }).last().click();
  const row = page.locator('.queue-row').filter({ hasText: 'romanian.png' });
  await expect(row.first()).toBeVisible();
  await row.first().getByRole('button', { name: 'Deschide editorul' }).click();
  await expect(page.getByRole('heading', { name: 'Date document' })).toBeVisible();
  console.log('M2 real API: DS-004 opened Editor');

  const type = page.getByLabel('Tip document');
  await type.selectOption({ index: 1 });
  const subtype = page.getByLabel('Subtip');
  await subtype.selectOption({ index: 1 });
  const context = page.getByLabel('Context de arhivare');
  await context.selectOption({ index: 1 });
  await page.getByLabel('Data actului').fill('2026-11-27');
  await page.getByLabel('Numărul actului').fill(`M2-${Date.now()}`);

  const dossier = page.getByLabel('Dosar fizic');
  await expect(dossier.locator('option').first()).toHaveText('Selectați dosarul fizic');
  if (await dossier.locator('option').count() === 1) {
    await page.getByRole('button', { name: 'Creează dosarul fizic' }).click();
    const printedNumber = `M2-${Date.now()}`;
    await page.getByLabel('Numărul dosarului fizic').fill(printedNumber);
    await page.getByLabel('Număr inventar dosar').fill(printedNumber);
    await page.getByRole('button', { name: 'Creează dosarul', exact: true }).click();
    await expect(dossier).toHaveValue(/\d+/);
  } else await dossier.selectOption({ index: 1 });

  await page.getByRole('button', { name: 'Continuă' }).click();
  await page.getByRole('checkbox', { name: 'Confirmă metadatele' }).check();
  await expect(page.getByRole('status').filter({ hasText: 'Metadatele au fost confirmate' })).toBeVisible();
  console.log('M2 real API: metadata confirmed');
  await page.getByRole('tab', { name: /Anonimizare/ }).click();
  const rejectButtons = page.getByRole('button', { name: 'Respinge potrivirea' });
  const candidateCount = await rejectButtons.count();
  for (let index = 0; index < candidateCount; index++) {
    const button = rejectButtons.nth(index);
    if (await button.isEnabled()) await button.click();
  }
  await page.getByRole('button', { name: 'Marchează o zonă' }).click();
  const canvas = page.getByRole('application', { name: 'Document original, pagina 1' });
  await canvas.press('Enter'); await canvas.press('ArrowRight'); await canvas.press('ArrowDown'); await canvas.press('Enter');
  await page.getByRole('button', { name: 'Previzualizează anonimizarea' }).click();
  await expect(page.getByTitle('Previzualizare PDF anonimizat')).toBeVisible();
  console.log('M2 real API: redaction preview ready');
  await page.getByRole('tab', { name: /Verificare finală/ }).click();
  await page.getByRole('button', { name: 'Confirmă revizuirea finală' }).click();
  await page.getByRole('button', { name: 'Aprobă și publică' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Documentul a fost aprobat' })).toBeVisible({ timeout: 30_000 });
});
