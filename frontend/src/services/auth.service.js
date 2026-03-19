import api from './api'

export const authService = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
}

export const apiKeyService = {
  getAll: () => api.get('/apikeys'),
  getProviders: () => api.get('/apikeys/providers'),
  save: (data) => api.post('/apikeys', data),
  delete: (keyId) => api.delete(`/apikeys/${keyId}`),
  toggle: (keyId) => api.patch(`/apikeys/${keyId}/toggle`),
}

export const analysisService = {
  analyzeText: (data) => api.post('/analysis/text', data),
  analyzeFile: (formData) => api.post('/analysis/file', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  maskPreview: (content) => api.post('/analysis/mask-preview', { content }),
  getHistory: (params) => api.get('/analysis/history', { params }),
  getById: (id) => api.get(`/analysis/${id}`),
  delete: (id) => api.delete(`/analysis/${id}`),
  exportPDF: (id) => api.get(`/analysis/${id}/export`, { responseType: 'blob' }),
  getStats: () => api.get('/analysis/stats/summary'),
}

export const adminService = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params) => api.get('/admin/users', { params }),
  toggleUser: (id) => api.patch(`/admin/users/${id}/toggle`),
  updateRole: (id, role) => api.patch(`/admin/users/${id}/role`, { role }),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  clearCache: (all) => api.delete(`/admin/cache${all ? '?all=true' : ''}`),
}