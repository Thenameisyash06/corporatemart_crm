import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Attach JWT token to requests if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cm_crm_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('cm_crm_token');
      localStorage.removeItem('cm_crm_user');
      window.dispatchEvent(new Event('auth_changed'));
    }

    // Normalize error data so error.response.data.error is always a string and never crashes React rendering
    if (error.response && error.response.data) {
      if (typeof error.response.data.error === 'object' && error.response.data.error !== null) {
        error.response.data.error =
          error.response.data.error.message ||
          error.response.data.error.code ||
          JSON.stringify(error.response.data.error);
      } else if (!error.response.data.error && error.response.data.message) {
        error.response.data.error =
          typeof error.response.data.message === 'object'
            ? JSON.stringify(error.response.data.message)
            : error.response.data.message;
      }
    }

    // Automatically trigger an error popup for any mutating request failure unless explicitly bypassed
    const method = error.config?.method?.toLowerCase();
    if (['post', 'put', 'patch', 'delete'].includes(method) && !error.config?.skipGlobalErrorToast) {
      const msg = error.response?.data?.error || error.response?.data?.message || error.message || 'Operation failed. Please try again.';
      window.dispatchEvent(
        new CustomEvent('cm_toast_event', {
          detail: { type: 'error', title: 'Operation Failed', message: String(msg) },
        })
      );
    }

    return Promise.reject(error);
  }
);

export default api;
