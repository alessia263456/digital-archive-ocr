import { archiveDocuments, archiveDossiers, archiveTypes } from './archiveSearchMockData.js';

const PAGE_SIZE = 6;
const delay = (milliseconds = 350) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

export async function loadArchiveCatalog(role) {
  await delay(100);
  const documents = archiveDocuments.filter((document) => role !== 'cititor' || document.readerVisible);
  const availableDossiers = archiveDossiers.filter((dossier) => documents.some((document) => document.dossierId === dossier.id));
  const availableTypes = archiveTypes.filter((type) => documents.some((document) => document.type === type));
  const availableYears = [...new Set(documents.map((document) => document.year))].sort((left, right) => right.localeCompare(left));
  return { documents, dossiers: availableDossiers, types: availableTypes, years: availableYears };
}

function normalize(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('ro').trim();
}

function termsFor(query) {
  return normalize(query).split(/\s+/).filter(Boolean);
}

function searchableText(document, role) {
  const fields = [document.title, document.type, document.actNumber, document.actDate, document.year,
    document.inventory, document.dossierNumber, role === 'cititor' ? document.readerExcerpt : document.adminExcerpt];
  if (role !== 'cititor') fields.push(document.partyName, ...document.tags);
  return normalize(fields.join(' '));
}

export async function searchArchive({ catalog, role, query = '', filters = {}, sort = 'relevance', page = 1, browse = null }) {
  await delay();
  const terms = termsFor(query);
  const normalizedParty = normalize(filters.partyQuery);
  const normalizedTags = normalize(filters.tags);
  let documents = catalog.documents.filter((document) => {
    if (role === 'cititor' && !document.readerVisible) return false;
    if (browse?.type && document.type !== browse.type) return false;
    if (browse?.dossierId && document.dossierId !== browse.dossierId) return false;
    if (browse?.year && document.year !== browse.year) return false;
    if (filters.dossierId && filters.dossierId !== 'all' && document.dossierId !== filters.dossierId) return false;
    if (filters.type && filters.type !== 'all' && document.type !== filters.type) return false;
    if (filters.year && filters.year !== 'all' && document.year !== filters.year) return false;
    if (normalizedTags && !document.tags.some((tag) => normalize(tag).includes(normalizedTags))) return false;
    if (normalizedParty && (role === 'cititor' || !normalize(document.partyName).includes(normalizedParty))) return false;
    const searchable = searchableText(document, role);
    return terms.every((term) => searchable.includes(term));
  });

  if (sort === 'oldest') documents.sort((left, right) => left.actDate.localeCompare(right.actDate));
  else if (sort === 'newest') documents.sort((left, right) => right.actDate.localeCompare(left.actDate));
  else documents.sort((left, right) => {
    const leftText = searchableText(left, role);
    const rightText = searchableText(right, role);
    const score = (text) => terms.reduce((total, term) => total + (text.split(term).length - 1), 0);
    return score(rightText) - score(leftText) || right.actDate.localeCompare(left.actDate);
  });

  const total = documents.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), pageCount);
  documents = documents.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  return { items: documents, total, page: safePage, pageCount };
}

export const archiveSearchPageSize = PAGE_SIZE;
