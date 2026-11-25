export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
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
    throw new ApiError(message, response.status);
  }

  return body;
}

export const api = {
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
    files.forEach((file) => body.append(field, file, file.name));
    return request('/api/drafts', { method: 'POST', body });
  },
  draftStatus: (id) => request(`/api/drafts/${encodeURIComponent(id)}`),
  draftOcr: (id) => request(`/api/drafts/${encodeURIComponent(id)}/ocr`),
  draftPreview: (id) => request(`/api/drafts/${encodeURIComponent(id)}/preview`, { method: 'POST' }),
};
