const API_BASE = '/server/main';

async function apiCall(method, path, body = null) {
  const token = localStorage.getItem('jwt_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${path}`, options);
  if (res.status === 401) {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user');
    window.location.hash = '#/login';
    throw new Error('Session expired. Please log in again.');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

export { apiCall };

export const auth = {
  login: (email, password) => apiCall('POST', '/auth/login', { email, password }),
  register: (data) => apiCall('POST', '/auth/register', data),
  bulkImport: (csv) => apiCall('POST', '/auth/bulk-import', { csv }),
  listUsers: () => apiCall('GET', '/auth/users'),
  updateUser: (id, data) => apiCall('PUT', `/auth/users/${id}`, data),
};

export const chat = {
  start: (data) => apiCall('POST', '/chat/start', data),
  listSessions: () => apiCall('GET', '/chat/sessions'),
  getSession: (id) => apiCall('GET', `/chat/${id}`),
  sendMessage: (id, content) => apiCall('POST', `/chat/${id}/message`, { content }),
  quickAction: (id, action, extra = {}) => apiCall('POST', `/chat/${id}/action`, { action, ...extra }),
  close: (id) => apiCall('POST', `/chat/${id}/close`),
};

export const sme = {
  create: (data) => apiCall('POST', '/sme', data),
  list: (params = '') => apiCall('GET', `/sme${params ? '?' + params : ''}`),
  get: (id) => apiCall('GET', `/sme/${id}`),
  update: (id, data) => apiCall('PUT', `/sme/${id}`, data),
  validate: (id) => apiCall('POST', `/sme/${id}/validate`),
};

export const tech = {
  create: (data) => apiCall('POST', '/tech', data),
  list: (params = '') => apiCall('GET', `/tech${params ? '?' + params : ''}`),
  get: (id) => apiCall('GET', `/tech/${id}`),
  update: (id, data) => apiCall('PUT', `/tech/${id}`, data),
};

export const process = {
  create: (data) => apiCall('POST', '/process', data),
  list: (params = '') => apiCall('GET', `/process${params ? '?' + params : ''}`),
  get: (id) => apiCall('GET', `/process/${id}`),
  update: (id, data) => apiCall('PUT', `/process/${id}`, data),
};

export const journey = {
  create: (data) => apiCall('POST', '/journey', data),
  list: () => apiCall('GET', '/journey'),
  get: (id) => apiCall('GET', `/journey/${id}`),
  update: (id, data) => apiCall('PUT', `/journey/${id}`, data),
};

export const gaps = {
  create: (data) => apiCall('POST', '/gaps', data),
  list: (params = '') => apiCall('GET', `/gaps${params ? '?' + params : ''}`),
  get: (id) => apiCall('GET', `/gaps/${id}`),
  update: (id, data) => apiCall('PUT', `/gaps/${id}`, data),
};

export const conflicts = {
  create: (data) => apiCall('POST', '/conflicts', data),
  list: (params = '') => apiCall('GET', `/conflicts${params ? '?' + params : ''}`),
  get: (id) => apiCall('GET', `/conflicts/${id}`),
  resolve: (id, notes) => apiCall('POST', `/conflicts/${id}/resolve`, { resolution_notes: notes }),
};

export const project = {
  getState: () => apiCall('GET', '/project/state'),
  recalculate: () => apiCall('POST', '/project/recalculate'),
};

export const reports = {
  generate: (type) => apiCall('GET', `/reports/${type}`),
};
