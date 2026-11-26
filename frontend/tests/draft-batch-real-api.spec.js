import { test, expect } from '@playwright/test';

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

test('intakes independent documents and recovers persisted OCR after reload', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-light', 'Run this real worker workflow once.');
  test.setTimeout(120_000);
  await page.goto('/');
  await page.getByLabel('Nume de utilizator').fill(process.env.M1A_TEST_USERNAME);
  await page.getByLabel('Parolă').fill(process.env.M1A_TEST_PASSWORD);
  await page.getByRole('button', { name: 'Autentificare' }).click();

  const openUpload = () => page.getByRole('button', { name: 'Încarcă documente' }).click();
  await openUpload();
  await page.getByLabel('Document PDF sau DOCX').setInputFiles([
    { name: 'batch-valid-one.pdf', mimeType: 'application/pdf', buffer: syntheticPdf() },
    { name: 'batch-invalid.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: Buffer.from('invalid') },
    { name: 'batch-valid-two.pdf', mimeType: 'application/pdf', buffer: syntheticPdf() },
  ]);
  await page.getByRole('button', { name: 'Încarcă documentul', exact: true }).click();
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
