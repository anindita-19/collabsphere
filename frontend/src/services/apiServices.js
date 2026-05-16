import api from './api'

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/me', data),
  changePassword: (data) => api.put('/auth/me/password', data),
  searchUsers: (q) => api.get('/auth/users/search', { params: { q } }),
}

// ── Workspaces ────────────────────────────────────────────────────────────────
export const workspacesAPI = {
  getAll: () => api.get('/workspaces'),
  get: (id) => api.get(`/workspaces/${id}`),
  create: (data) => api.post('/workspaces', data),
  update: (id, data) => api.put(`/workspaces/${id}`, data),
  delete: (id) => api.delete(`/workspaces/${id}`),
  inviteMember: (id, data) => api.post(`/workspaces/${id}/invite`, data),
  removeMember: (wsId, userId) => api.delete(`/workspaces/${wsId}/members/${userId}`),
  getActivity: (id, limit = 50) => api.get(`/workspaces/${id}/activity`, { params: { limit } }),
  getInvite: (token) => api.get(`/workspaces/invite/accept?token=${token}`),
  acceptInvite: (token) => api.post(`/workspaces/invite/accept?token=${token}`),
}

// ── Projects ──────────────────────────────────────────────────────────────────
export const projectsAPI = {
  getAll: (workspaceId) => api.get(`/workspaces/${workspaceId}/projects`),
  get: (workspaceId, projectId) => api.get(`/workspaces/${workspaceId}/projects/${projectId}`),
  create: (workspaceId, data) => api.post(`/workspaces/${workspaceId}/projects`, data),
  update: (workspaceId, projectId, data) => api.put(`/workspaces/${workspaceId}/projects/${projectId}`, data),
  delete: (workspaceId, projectId) => api.delete(`/workspaces/${workspaceId}/projects/${projectId}`),
  getAnalytics: (workspaceId, projectId) =>
    api.get(`/workspaces/${workspaceId}/projects/${projectId}/analytics`),
}

// ── Tasks ─────────────────────────────────────────────────────────────────────
export const tasksAPI = {
  getAll: (projectId, params) => api.get(`/projects/${projectId}/tasks`, { params }),
  get: (projectId, taskId) => api.get(`/projects/${projectId}/tasks/${taskId}`),
  create: (projectId, data) => api.post(`/projects/${projectId}/tasks`, data),
  update: (projectId, taskId, data) => api.put(`/projects/${projectId}/tasks/${taskId}`, data),
  move: (projectId, taskId, data) => api.patch(`/projects/${projectId}/tasks/${taskId}/move`, data),
  delete: (projectId, taskId) => api.delete(`/projects/${projectId}/tasks/${taskId}`),
  getComments: (projectId, taskId) => api.get(`/projects/${projectId}/tasks/${taskId}/comments`),
  addComment: (projectId, taskId, data) =>
    api.post(`/projects/${projectId}/tasks/${taskId}/comments`, data),
  deleteComment: (projectId, taskId, commentId) =>
    api.delete(`/projects/${projectId}/tasks/${taskId}/comments/${commentId}`),
}

// ── Documents ─────────────────────────────────────────────────────────────────
export const documentsAPI = {
  getAll: (projectId) => api.get(`/projects/${projectId}/documents`),
  get: (projectId, docId) => api.get(`/projects/${projectId}/documents/${docId}`),
  create: (projectId, data) => api.post(`/projects/${projectId}/documents`, data),
  update: (projectId, docId, data) => api.put(`/projects/${projectId}/documents/${docId}`, data),
  delete: (projectId, docId) => api.delete(`/projects/${projectId}/documents/${docId}`),
}

// ── Files ─────────────────────────────────────────────────────────────────────
export const filesAPI = {
  // Pass task_id, project_id, workspace_id as query params (backend reads them from query, not form)
  upload: (formData, { taskId, projectId, workspaceId } = {}) => {
    const params = new URLSearchParams()
    if (taskId) params.append('task_id', taskId)
    if (projectId) params.append('project_id', projectId)
    if (workspaceId) params.append('workspace_id', workspaceId)
    return api.post(`/files/upload?${params.toString()}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  getTaskFiles: (taskId) => api.get(`/files/task/${taskId}`),
  getProjectFiles: (projectId) => api.get(`/files/project/${projectId}`),
  download: (fileId) => `${api.defaults.baseURL}/files/${fileId}/download`,
  delete: (fileId) => api.delete(`/files/${fileId}`),
}

// ── Notifications ─────────────────────────────────────────────────────────────
export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (data) => api.put('/notifications/mark-read', data),
  delete: (id) => api.delete(`/notifications/${id}`),
  getPreferences: () => api.get('/notifications/preferences'),
  updatePreferences: (data) => api.put('/notifications/preferences', data),
}

// ── Chat ──────────────────────────────────────────────────────────────────────
export const chatAPI = {
  getMessages: (workspaceId) => api.get(`/workspaces/${workspaceId}/chat`),
  sendMessage: (workspaceId, data) => api.post(`/workspaces/${workspaceId}/chat`, data),
}

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsAPI = {
  getWorkspace: (workspaceId) => api.get(`/analytics/workspace/${workspaceId}`),
}