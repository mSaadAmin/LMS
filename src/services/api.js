import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (refreshToken) {
        try {
          // Attempt to refresh the token using a separate axios instance or direct call to avoid interceptor loop
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken
          });
          
          const { access_token, refresh_token } = response.data.data;
          
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);
          
          // Update the original request with the new token
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch (refreshError) {
          // If refresh fails, clear tokens and redirect to login
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/';
          return Promise.reject(refreshError);
        }
      }
    }
    return Promise.reject(error);
  }
);

// Auth Endpoints
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  refresh: (refreshToken) => api.post('/auth/refresh', { refresh_token: refreshToken }),
  logout: () => api.post('/auth/logout'),
};

// Course Endpoints
export const coursesApi = {
  getAll: (params) => api.get('/courses', { params }),
  create: (data) => api.post('/courses', data),
  get: (id) => api.get(`/courses/${id}`),
  update: (id, data) => api.patch(`/courses/${id}`, data),
  uploadCover: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/courses/${id}/cover-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadVideo: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/courses/${id}/intro-video`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getOutcomes: (id) => api.get(`/courses/${id}/outcomes`),
  updateOutcomes: (id, outcomes) => api.put(`/courses/${id}/outcomes`, { outcomes }),
  publish: (id) => api.patch(`/courses/${id}/publish`),
  getProgress: (id) => api.get(`/courses/${id}/progress`),
  updateProgress: (id, data) => api.patch(`/courses/${id}/progress`, data),
};

// Lesson Endpoints
export const lessonsApi = {
  getAll: (courseId) => api.get(`/courses/${courseId}/lessons`),
  create: (courseId, data) => api.post(`/courses/${courseId}/lessons`, data),
  update: (courseId, lessonId, data) => api.patch(`/courses/${courseId}/lessons/${lessonId}`, data),
  delete: (courseId, lessonId) => api.delete(`/courses/${courseId}/lessons/${lessonId}`),
  reorder: (courseId, order) => api.put(`/courses/${courseId}/lessons/reorder`, { order }),
  
  // Content Blocks
  getBlocks: (courseId, lessonId) => api.get(`/courses/${courseId}/lessons/${lessonId}/blocks`),
  createBlock: (courseId, lessonId, data) => api.post(`/courses/${courseId}/lessons/${lessonId}/blocks`, data),
  updateBlock: (courseId, lessonId, blockId, data) => api.patch(`/courses/${courseId}/lessons/${lessonId}/blocks/${blockId}`, data),
  deleteBlock: (courseId, lessonId, blockId) => api.delete(`/courses/${courseId}/lessons/${lessonId}/blocks/${blockId}`),
  reorderBlocks: (courseId, lessonId, order) => api.put(`/courses/${courseId}/lessons/${lessonId}/blocks/reorder`, { order }),
  uploadBlockFile: (courseId, lessonId, blockId, file, tag) => {
    const formData = new FormData();
    formData.append('file', file);
    if (tag) formData.append('file_tag', tag);
    return api.post(`/courses/${courseId}/lessons/${lessonId}/blocks/${blockId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Quiz Endpoints
export const quizApi = {
  get: (courseId, lessonId) => api.get(`/courses/${courseId}/lessons/${lessonId}/quiz`),
  create: (courseId, lessonId) => api.post(`/courses/${courseId}/lessons/${lessonId}/quiz`, { lesson_id: lessonId }),
  addQuestion: (courseId, lessonId, data) => api.post(`/courses/${courseId}/lessons/${lessonId}/quiz/questions`, data),
  updateQuestion: (courseId, lessonId, questionId, data) => api.patch(`/courses/${courseId}/lessons/${lessonId}/quiz/questions/${questionId}`, data),
  deleteQuestion: (courseId, lessonId, questionId) => api.delete(`/courses/${courseId}/lessons/${lessonId}/quiz/questions/${questionId}`),
};

// AI Generation Endpoints
export const aiApi = {
  generateCourse: (file, prompt) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('prompt', prompt);
    return api.post('/generate/courses', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default api;
