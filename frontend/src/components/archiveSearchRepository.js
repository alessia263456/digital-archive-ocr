import { api } from '../api.js';

export const archiveSearchPageSize = 6;

function resultItem(row) {
  return {
    id: row.document_id,
    versionId: row.version_id,
    title: row.act_number ? `Act nr. ${row.act_number}` : row.document_type,
    type: row.document_type,
    actNumber: row.act_number ? `Nr. ${row.act_number}` : 'Număr act nespecificat',
    actDate: row.act_date,
    addedDate: row.approved_at?.slice(0, 10) || '',
    inventory: row.inventory_number || 'Inventar nespecificat',
    dossierNumber: row.physical_dossier_number || 'Dosar nespecificat',
    highlight: (row.highlight || '').replace(/<\/?mark>/g, ''),
    tags: row.tags || [],
  };
}

export async function loadArchiveCatalog() {
  const response = await api.archiveBrowse();
  const documents = (response.recent || []).map(resultItem);
  return {
    documents,
    dossiers: (response.physical_dossiers || []).map((item) => ({ id: String(item.id), number: item.physical_dossier_number, context: item.context || '' })),
    types: (response.document_types || []).map((item) => item.document_type),
    years: (response.years || []).map((item) => String(item.year)).sort((a, b) => b.localeCompare(a)),
  };
}

export async function searchArchive({ query = '', filters = {}, sort = 'relevance', page = 1, browse = null }) {
  const parameters = {
    q: query.trim(),
    physical_dossier_id: browse?.dossierId || (filters.dossierId !== 'all' ? filters.dossierId : ''),
    document_type: browse?.type || (filters.type !== 'all' ? filters.type : ''),
    year: browse?.year || (filters.year !== 'all' ? filters.year : ''),
    party: filters.partyQuery?.trim() || '',
    tag: filters.tags?.trim() || '',
    sort,
    page,
    per_page: archiveSearchPageSize,
  };
  const response = await api.archiveDocuments(parameters);
  return {
    items: (response.data || []).map(resultItem),
    total: response.meta?.total || 0,
    page: response.meta?.current_page || 1,
    pageCount: response.meta?.last_page || 1,
  };
}
