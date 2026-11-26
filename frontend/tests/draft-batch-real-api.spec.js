import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.skip(
  !process.env.M1A_TEST_USERNAME || !process.env.M1A_TEST_PASSWORD,
  'Set M1A_TEST_USERNAME and M1A_TEST_PASSWORD to run the isolated batch and recovery workflow.',
);

function syntheticPdf() {
  const text = 'BT /F1 36 Tf 60 650 Td (Document sintetic pentru arhiva) Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = objects.map((object, index) => {
    const offset = pdf.length;
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    return offset;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  return Buffer.from(pdf + `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
}

async function signIn(page) {
  await page.goto('/');
  await page.getByLabel('Nume de utilizator').fill(process.env.M1A_TEST_USERNAME);
  await page.getByLabel('Parolă').fill(process.env.M1A_TEST_PASSWORD);
  await page.getByRole('button', { name: 'Autentificare' }).click();
  await expect(page.getByRole('heading', { name: 'Căutare în arhivă' })).toBeVisible();
}

test('intakes independent documents and recovers persisted OCR after reload', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-light', 'Run this real worker workflow once.');
  test.setTimeout(120_000);
  await signIn(page);

  const openUpload = () => page.getByRole('button', { name: 'Încarcă documente' }).first().click();
  await openUpload();
  await page.getByLabel('Document PDF sau DOCX').setInputFiles([
    { name: 'batch-valid-one.pdf', mimeType: 'application/pdf', buffer: syntheticPdf() },
    { name: 'batch-invalid.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: Buffer.from('invalid') },
    { name: 'batch-valid-two.pdf', mimeType: 'application/pdf', buffer: syntheticPdf() },
  ]);
  await page.getByRole('button', { name: 'Încarcă documentele', exact: true }).click();
  const row = (name) => page.locator('.draft-item').filter({ hasText: name });
  await expect(row('batch-invalid.docx')).toContainText('Încărcarea nu a reușit');
  const idOne = await row('batch-valid-one.pdf').locator('.draft-id').textContent();
  const idTwo = await row('batch-valid-two.pdf').locator('.draft-id').textContent();
  expect(idOne).not.toBe(idTwo);

  await page.reload();
  await openUpload();
  await expect(row('batch-invalid.docx')).toHaveCount(0);
  await expect(row('batch-valid-one.pdf')).toContainText(idOne);
  await expect(row('batch-valid-two.pdf')).toContainText(idTwo);

  for (const name of ['batch-valid-one.pdf', 'batch-valid-two.pdf']) {
    const draft = row(name);
    await expect.poll(async () => {
      await draft.getByRole('button', { name: 'Actualizează starea' }).click();
      return draft.locator('.draft-status').textContent();
    }, { timeout: 90_000, intervals: [1000, 2000, 3000] }).toBe('Gata de revizuit');
  }
  await row('batch-valid-one.pdf').getByRole('button', { name: 'Vezi rezultatele OCR' }).click();
  await expect(page.getByRole('heading', { name: 'Rezultate OCR' })).toBeVisible();
  await expect(page.locator('.ocr-text')).toContainText(/Document sintetic pentru arhiv/i);
});

test('returns JSON for multipart requests truncated by the Compose backend', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-light', 'Run this real API workflow once.');
  await signIn(page);
  const png = await readFile('fixtures/romanian.png');
  const { documents, images } = await page.evaluate(async ({ pdfBytes, pngBytes }) => {
    await fetch('/sanctum/csrf-cookie');
    const cookie = document.cookie.split('; ').find((part) => part.startsWith('XSRF-TOKEN='));
    const headers = { Accept: 'application/json', 'X-XSRF-TOKEN': decodeURIComponent(cookie.slice('XSRF-TOKEN='.length)) };
    async function submit(body) {
      const response = await fetch('/api/drafts', { method: 'POST', headers, body });
      const data = await response.json().catch(() => null);
      return { status: response.status, data };
    }

    // The unmodified PHP upload-count limit in the Compose backend is 20.
    const fileCount = 21;
    const documentForm = new FormData();
    documentForm.append('document_count', String(fileCount));
    documentForm.append('documents[]', new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' }), 'transport-valid.pdf');
    for (let index = 1; index < fileCount; index++) {
      documentForm.append('documents[]', new Blob(['unsupported']), `transport-${index}.txt`);
    }

    const imageForm = new FormData();
    imageForm.append('image_count', String(fileCount));
    const image = new Blob([new Uint8Array(pngBytes)], { type: 'image/png' });
    for (let index = 0; index < fileCount; index++) {
      imageForm.append('images[]', image, `transport-${index}.png`);
    }

    return { documents: await submit(documentForm), images: await submit(imageForm) };
  }, { pdfBytes: [...syntheticPdf()], pngBytes: [...png] });

  expect(documents.status).toBe(422);
  expect(documents.data.eroare).toContain('Unele documente nu au ajuns la server');
  expect(documents.data.items).toHaveLength(20);
  expect(documents.data.items[0]).toMatchObject({ group: 'documents', index: 0, status: 'queued' });
  expect(documents.data.items[19]).toMatchObject({ group: 'documents', index: 19, status: 'invalid' });
  expect(images.status).toBe(422);
  expect(images.data.eroare).toContain('Colecția de imagini este incompletă');
  expect(images.data.items).toEqual([]);
});
