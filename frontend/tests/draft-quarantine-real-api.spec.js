import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.skip(
  !process.env.M1A_TEST_USERNAME || !process.env.M1A_TEST_PASSWORD,
  'Set M1A_TEST_USERNAME and M1A_TEST_PASSWORD to run the isolated queue worker workflow.',
);

test('a corrupt PDF reaches quarantine while its valid image sibling reaches review', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-light', 'Run this real worker workflow once.');
  test.setTimeout(180_000);

  await page.goto('/');
  await page.getByLabel('Nume de utilizator').fill(process.env.M1A_TEST_USERNAME);
  await page.getByLabel('Parolă').fill(process.env.M1A_TEST_PASSWORD);
  await page.getByRole('button', { name: 'Autentificare' }).click();
  await expect(page.getByRole('heading', { name: 'Căutare în arhivă' })).toBeVisible();

  const validImage = await readFile('/app/fixtures/romanian.png');
  const corruptPdf = await readFile('/app/fixtures/synthetic-malformed.pdf');
  const response = await page.evaluate(async ({ corruptPdfBase64, validImageBase64 }) => {
    await fetch('/sanctum/csrf-cookie');
    const xsrf = document.cookie.split('; ').find((cookie) => cookie.startsWith('XSRF-TOKEN='))?.split('=').slice(1).join('=');
    const form = new FormData();
    const toFile = (base64, name, type) => {
      const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
      return new File([bytes], name, { type });
    };
    form.append('documents[]', toFile(corruptPdfBase64, 'synthetic-corrupt.pdf', 'application/pdf'));
    form.append('images[]', toFile(validImageBase64, 'synthetic-valid.png', 'image/png'));
    const result = await fetch('/api/drafts', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'X-XSRF-TOKEN': decodeURIComponent(xsrf ?? ''), Accept: 'application/json' },
      body: form,
    });
    return { status: result.status, body: await result.json() };
  }, {
    corruptPdfBase64: corruptPdf.toString('base64'),
    validImageBase64: validImage.toString('base64'),
  });
  expect(response.status, `Intake returned ${response.status}: ${JSON.stringify(response.body).slice(0, 500)}`).toBe(200);
  const drafts = response.body.items;
  expect(drafts).toHaveLength(2);
  const corruptId = drafts.find((draft) => draft.group === 'documents')?.id;
  const validId = drafts.find((draft) => draft.group === 'images')?.id;
  expect(corruptId).toBeTruthy();
  expect(validId).toBeTruthy();

  const statusFor = async (id) => page.evaluate(async (draftId) => (await (await fetch(`/api/drafts/${draftId}`)).json()).status, id);
  await expect.poll(async () => Promise.all([statusFor(corruptId), statusFor(validId)]), {
    timeout: 150_000,
    intervals: [1000, 2500, 5000],
  }).toEqual(['quarantined', 'review_ready']);

  const queue = await page.evaluate(async () => (await (await fetch('/api/drafts/queue')).json()));
  expect(queue.quarantine.some((draft) => draft.id === corruptId)).toBeTruthy();
  expect(queue.review.some((draft) => draft.id === validId)).toBeTruthy();
});
