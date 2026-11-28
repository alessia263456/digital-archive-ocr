export async function mockEmptyArchiveBrowse(page) {
  await page.route('**/api/archive/browse', (route) => route.fulfill({ json: {
    document_types: [], physical_dossiers: [], years: [], recent: [],
  } }));
}

export async function openMobileNavigation(page) {
  if ((page.viewportSize()?.width ?? 1280) > 639) return;
  const mobileMenu = page.getByRole('button', { name: 'Deschide meniul' });
  await mobileMenu.waitFor({ state: 'visible' });
  await mobileMenu.click();
}

export async function navigateTo(page, label, position = 'first') {
  await openMobileNavigation(page);
  const item = page.getByRole('navigation', { name: 'Navigare principală' }).getByRole('button', { name: label });
  await (position === 'last' ? item.last() : item.first()).click();
}
