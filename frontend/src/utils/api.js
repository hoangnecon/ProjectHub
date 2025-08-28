import axios from 'axios';

let globalErrorHandler = null;

export const setGlobalErrorHandler = (handler) => {
  globalErrorHandler = handler;
};

// Create an axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL + '/api',
});

// Request interceptor for adding the auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for global error handling
api.interceptors.response.use(
  (response) => {
    const newToken = response.headers['x-new-token'];
    if (newToken) {
      localStorage.setItem('token', newToken);
    }
    return response.data;
  },
  (error) => {
    let errorMessage = "An unknown error occurred.";

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('API Error:', error.response.data);

      if (error.response.data && error.response.data.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      } else {
        errorMessage = `Server error: ${error.response.status}`;
      }

      if (error.response.status === 419 || error.response.status === 401) {
        // Handle unauthorized errors
        localStorage.removeItem('token');
        window.location.reload();
      }

    } else if (error.request) {
      // The request was made but no response was received
      console.error('Network Error:', error.request);
      errorMessage = "Network error. Please check your connection.";
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error:', error.message);
      errorMessage = `Error: ${error.message}`;
    }

    if (error.response?.status !== 401 && globalErrorHandler) {
      globalErrorHandler(errorMessage);
    }

    return Promise.reject(error.response ? error.response.data : error.message);
  }
);

// API methods
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getMe: (userId) => api.get(userId ? `/auth/users/${userId}` : '/auth/me'),
  searchUsers: (query) => api.get(`/auth/users/search?query=${encodeURIComponent(query)}`),
  updateMe: (userData) => api.put('/users/me', userData),
};

export const roleAPI = {
  getAll: () => api.get('/roles'),
  create: (roleData) => api.post('/roles', roleData),
  getById: (id) => api.get(`/roles/${id}`),
};

export const teamAPI = {
  create: (teamData) => api.post('/teams', teamData),
  getAll: () => api.get('/teams'),
  getById: (id) => api.get(`/teams/${id}`),
  update: (id, data) => api.put(`/teams/${id}`, data),
  delete: (id) => api.delete(`/teams/${id}`),
  getMembers: (id, page = 1, per_page = 20) => api.get(`/teams/${id}/members?page=${page}&per_page=${per_page}`),
  addMember: (id, data) => api.post(`/teams/${id}/members`, data),
  searchMembers: (id, query) => api.get(`/teams/${id}/members/search?query=${encodeURIComponent(query)}`),
  getProjectsForTeam: (teamId) => api.get(`/teams/${teamId}/projects`),
};

export const projectAPI = {
  create: (projectData) => api.post('/projects', projectData),
  getAll: (page = 1, per_page = 20) => api.get(`/projects?page=${page}&per_page=${per_page}`),
  getPersonal: (page = 1, per_page = 20) => api.get(`/projects/personal?page=${page}&per_page=${per_page}`),
  getById: (id) => api.get(`/projects/${id}`),
  delete: (id) => api.delete(`/projects/${id}`),
};

export const projectMemberAPI = {
  getForProject: (projectId, page = 1, per_page = 20) => api.get(`/projects/${projectId}/members?page=${page}&per_page=${per_page}`),
  updateRole: (projectId, userId, role) => api.put(`/projects/${projectId}/members/${userId}/role`, { role }),
};

export const taskAPI = {
  create: (taskData) => api.post('/tasks', taskData),
  getByProject: (projectId, status, page = 1, per_page = 20) => api.get(`/tasks/project/${projectId}?page=${page}&per_page=${per_page}${status ? `&status=${status}` : ''}`),
  getPendingApproval: (projectId, page = 1, per_page = 20) => api.get(`/tasks/project/${projectId}/pending-approval?page=${page}&per_page=${per_page}`),
  getMy: (status, page = 1, per_page = 20) => api.get(`/tasks/my?page=${page}&per_page=${per_page}${status ? `&status=${status}` : ''}`),
  getById: (id) => api.get(`/tasks/${id}`),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  saveContent: (id, submissionContent) => api.post(`/tasks/${id}/content`, { content: submissionContent }),
  submit: (id) => api.post(`/tasks/${id}/submit`),
  recall: (id) => api.post(`/tasks/${id}/recall`),
  approve: (id) => api.post(`/tasks/${id}/approve`),
  delete: (id) => api.delete(`/tasks/${id}`),
  completePersonal: (id) => api.post(`/tasks/${id}/complete-personal`),
  reopen: (id) => api.post(`/tasks/${id}/reopen`),
};

export const notificationAPI = {
  getAll: (unreadOnly = false) => api.get(`/notifications${unreadOnly ? '?unread_only=true' : ''}`),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
};

export const initAPI = {
  initialize: () => api.post('/init'),
};