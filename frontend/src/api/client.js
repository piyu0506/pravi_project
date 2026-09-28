const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');

function queryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      search.set(key, String(value).trim());
    }
  });
  const encoded = search.toString();
  return encoded ? `?${encoded}` : '';
}

export async function apiRequest(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${API_BASE}${path.startsWith('/') ? path : `/${path}`}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = new Error(payload?.message || `Request failed (${response.status})`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export async function fetchAllAssets() {
  const first = await apiRequest(`/assets${queryString({ page: 1, limit: 100 })}`);
  const assets = [...(first.data || [])];
  const totalPages = first.pagination?.totalPages || 1;
  for (let page = 2; page <= totalPages; page += 1) {
    const next = await apiRequest(`/assets${queryString({ page, limit: 100 })}`);
    assets.push(...(next.data || []));
  }
  return { assets, total: first.pagination?.total ?? assets.length };
}

export const api = {
  listAssets: (params) => apiRequest(`/assets${queryString(params)}`),
  getAsset: (id) => apiRequest(`/assets/${id}`),
  createAsset: (body) => apiRequest('/assets', { method: 'POST', body }),
  updateAsset: (id, body) => apiRequest(`/assets/${id}`, { method: 'PUT', body }),
  deleteAsset: (id) => apiRequest(`/assets/${id}`, { method: 'DELETE' }),
  getHealth: (id) => apiRequest(`/assets/${id}/health`),
  getLifecycle: (id) => apiRequest(`/assets/${id}/lifecycle`),
  addLifecycle: (id, body) => apiRequest(`/assets/${id}/lifecycle`, { method: 'POST', body }),
  getMaintenance: (id) => apiRequest(`/assets/${id}/maintenance`),
  addMaintenance: (id, body) => apiRequest(`/assets/${id}/maintenance`, { method: 'POST', body }),
  getInspections: (id) => apiRequest(`/assets/${id}/inspections`),
  addInspection: (id, body) => apiRequest(`/assets/${id}/inspections`, { method: 'POST', body }),
  getAssetDependencies: (id) => apiRequest(`/assets/${id}/dependencies`),
  getRetirementImpact: (id) => apiRequest(`/assets/${id}/retirement-impact`),
  listDependencies: () => apiRequest('/dependencies'),
  createDependency: (body) => apiRequest('/dependencies', { method: 'POST', body }),
  deleteDependency: (id) => apiRequest(`/dependencies/${id}`, { method: 'DELETE' }),
  listRetirementRequests: () => apiRequest('/retirement-requests'),
  createRetirementRequest: (body) => apiRequest('/retirement-requests', { method: 'POST', body }),
  getRetirementRequest: (id) => apiRequest(`/retirement-requests/${id}`),
  decideRetirement: (id, body) => apiRequest(`/retirement-requests/${id}/decision`, { method: 'PUT', body }),
};
