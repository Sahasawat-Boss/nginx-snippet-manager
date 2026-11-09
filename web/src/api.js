export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    signal,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(data?.error?.message ?? `คำขอล้มเหลว (${res.status})`, res.status, data?.error?.details);
  }
  return data;
}

export const api = {
  listSnippets({ q, tag, page }, signal) {
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (q) params.set('q', q);
    if (tag) params.set('tag', tag);
    return request(`/snippets?${params}`, { signal });
  },
  getSnippet: (id, signal) => request(`/snippets/${id}`, { signal }),
  createSnippet: (body) => request('/snippets', { method: 'POST', body }),
  updateSnippet: (id, body) => request(`/snippets/${id}`, { method: 'PUT', body }),
  deleteSnippet: (id) => request(`/snippets/${id}`, { method: 'DELETE' }),
  listTags: (signal) => request('/tags', { signal }),
};
