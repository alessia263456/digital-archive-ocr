export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

function xsrfToken() {
  const cookie = document.cookie.split('; ').find((item) => item.startsWith('XSRF-TOKEN='));
  return cookie ? decodeURIComponent(cookie.slice('XSRF-TOKEN='.length)) : '';
}

async function request(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = { Accept: 'application/json', ...options.headers };

  if (method !== 'GET' && method !== 'HEAD') {
    const csrf = await fetch('/sanctum/csrf-cookie', { credentials: 'same-origin' });
    if (!csrf.ok) {
      throw new ApiError('Nu s-a putut pregăti sesiunea. Reîncărcați pagina și încercați din nou.', csrf.status);
    }
    headers['X-XSRF-TOKEN'] = xsrfToken();
  }

  const response = await fetch(path, {
    ...options,
    method,
    headers,
    credentials: 'same-origin',
  });

  if (response.status === 204) return null;

  let body = {};
  try {
    body = await response.json();
  } catch {
    body = {};
  }

  if (!response.ok) {
    const message = body.eroare
      || (response.status === 419
        ? 'Sesiunea a expirat. Reîncărcați pagina și încercați din nou.'
        : 'Cererea nu a putut fi finalizată. Încercați din nou.');
    throw new ApiError(message, response.status, body);
  }

  return body;
}

export const api = {
  archiveBrowse: () => request('/api/archive/browse'),
  archiveDocuments: (parameters = {}) => {
    const query = new URLSearchParams();
    Object.entries(parameters).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') query.set(key, String(value)); });
    return request(`/api/documents${query.size ? `?${query}` : ''}`);
  },
  currentUser: () => request('/api/user'),
  login: (username, password) => request('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  }),
  logout: () => request('/api/logout', { method: 'POST' }),
  uploadDraft: (files, kind) => {
    const body = new FormData();
    const field = kind === 'images' ? 'images[]' : 'documents[]';
    body.append(kind === 'images' ? 'image_count' : 'document_count', String(files.length));
    files.forEach((file) => body.append(field, file, file.name));
    return request('/api/drafts', { method: 'POST', body });
  },
  recentDrafts: () => request('/api/drafts/recent'),
  draftStatus: (id) => request(`/api/drafts/${encodeURIComponent(id)}`),
  draftOcr: (id) => request(`/api/drafts/${encodeURIComponent(id)}/ocr`),
  draftEditor: (id) => request(`/api/drafts/${encodeURIComponent(id)}/editor`),
  draftMetadata: (id) => request(`/api/drafts/${encodeURIComponent(id)}/metadata`),
  updateDraftMetadata: (id, metadata, nomenclatureEntryId) => request(`/api/drafts/${encodeURIComponent(id)}/metadata`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metadata, nomenclature_entry_id: nomenclatureEntryId || null }),
  }),
  confirmDraftMetadata: (id, metadataRevision, ocrRevision) => request(`/api/drafts/${encodeURIComponent(id)}/metadata/confirm`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metadata_revision: metadataRevision, ocr_revision: ocrRevision }),
  }),
  confirmDraftReview: (id, revisions) => request(`/api/drafts/${encodeURIComponent(id)}/review/confirm`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(revisions),
  }),
  publishDraft: (id, reviewSnapshot, duplicateAction = null) => request(`/api/drafts/${encodeURIComponent(id)}/publish`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify({ review_snapshot: reviewSnapshot, duplicate_action: duplicateAction }),
  }),
  physicalDossiers: (nomenclatureEntryId) => request(`/api/physical-dossiers?nomenclature_entry_id=${encodeURIComponent(nomenclatureEntryId)}`),
  createPhysicalDossier: (values) => request('/api/physical-dossiers', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values),
  }),
  saveDraftEditorOcr: (id, ocrRevision, pages) => request(`/api/drafts/${encodeURIComponent(id)}/editor/ocr`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ocr_revision: ocrRevision, pages }),
  }),
  saveDraftRedactionMarks: (id, ocrRevision, detectionRevision, marks, excludedCandidateIds = []) => request(`/api/drafts/${encodeURIComponent(id)}/editor/redaction-marks`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ocr_revision: ocrRevision, detection_revision: detectionRevision, marks, excluded_candidate_ids: excludedCandidateIds }),
  }),
  generateDraftRedaction: (id) => request(`/api/drafts/${encodeURIComponent(id)}/editor/redaction-preview`, { method: 'POST' }),
  draftRedactedPdf: (id) => `/api/drafts/${encodeURIComponent(id)}/editor/redaction-preview`,
  draftEditorPageImage: (id, page) => `/api/drafts/${encodeURIComponent(id)}/editor/pages/${encodeURIComponent(page)}/image`,
  draftPreview: (id) => request(`/api/drafts/${encodeURIComponent(id)}/preview`, { method: 'POST' }),
  draftQueue: () => request('/api/drafts/queue'),
  retryDraft: (id) => request(`/api/drafts/${encodeURIComponent(id)}/retry`, { method: 'POST' }),
  markDraftPermanentlyFailed: (id) => request(`/api/drafts/${encodeURIComponent(id)}/permanent-failure`, { method: 'POST' }),
};
