// Local dev: Vite proxies /api → backend. Production: set VITE_API_BASE_URL on the host (e.g. https://your-api.onrender.com/api).
const BASE = import.meta.env.VITE_API_BASE_URL || '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw { status: res.status, detail: data.detail || 'Request failed' };
  return data;
}

export const api = {
  getConsignments: () => request('/consignments/'),
  getConsignment: (docId) => request(`/consignments/${docId}`),
  searchProduct: (params) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/products/search?${qs}`);
  },
  listProducts: () => request('/products/'),
  validateLotDetails: (body) => request('/validation/lot-details', { method: 'POST', body: JSON.stringify(body) }),
  createReceiving: (body) => request('/receiving/create', { method: 'POST', body: JSON.stringify(body) }),
  performQC: (body) => request('/receiving/qc', { method: 'POST', body: JSON.stringify(body) }),
  listSessions: (status) => request(`/receiving/sessions${status ? `?status=${status}` : ''}`),
  listQCFailed: () => request('/receiving/qc-failed'),
  productCorrection: (body) => request('/receiving/product-correction', { method: 'POST', body: JSON.stringify(body) }),
  getSlabs: () => request('/config/slabs'),
  createSlab: (body) => request('/config/slabs', { method: 'POST', body: JSON.stringify(body) }),
  updateSlab: (id, body) => request(`/config/slabs/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteSlab: (id) => request(`/config/slabs/${id}`, { method: 'DELETE' }),
  captureLmi: (body) => request('/lmi/capture', { method: 'POST', body: JSON.stringify(body) }),
  getLmiHistory: (limit = 50) => request(`/lmi/history?limit=${limit}`),
  getLmiStats: () => request('/lmi/stats'),
};
