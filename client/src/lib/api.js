import axios from 'axios';

export const DEFAULT_CLOUD_API_URL = 'https://corporatemartcrm.vercel.app/api';

export const getStoredCloudUrl = () => {
  try {
    return localStorage.getItem('cm_cloud_api_url') || '';
  } catch (e) {
    return '';
  }
};

export const setStoredCloudUrl = (url) => {
  try {
    if (url && url.trim()) {
      let clean = url.trim().replace(/\/+$/, '');
      if (!clean.endsWith('/api')) clean = `${clean}/api`;
      localStorage.setItem('cm_cloud_api_url', clean);
      api.defaults.baseURL = clean;
    } else {
      localStorage.removeItem('cm_cloud_api_url');
      api.defaults.baseURL = getApiBaseUrl();
    }
    window.dispatchEvent(new Event('api_url_changed'));
  } catch (e) {}
};

// Detect runtime environment: Web browser (relative /api), custom API url, or Electron desktop
export const getApiBaseUrl = () => {
  // 1. In-app customized Cloud Server URL (saved in localStorage by user or staff)
  const stored = getStoredCloudUrl();
  if (stored) return stored;

  // 2. Pre-injected by Electron window or preload script
  if (typeof window !== 'undefined' && window.CORPORATEMART_API_URL) {
    let injected = window.CORPORATEMART_API_URL.trim().replace(/\/+$/, '');
    return injected.endsWith('/api') ? injected : `${injected}/api`;
  }

  // 3. Vite environment variable from build/env
  if (import.meta.env?.VITE_API_URL) {
    let envUrl = import.meta.env.VITE_API_URL.trim().replace(/\/+$/, '');
    return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
  }

  // 4. If running in packaged Electron or loaded via file:// protocol (native desktop window)
  if (
    typeof window !== 'undefined' &&
    (window.location.protocol === 'file:' || !window.location.origin.startsWith('http') || window.desktopAPI?.isDesktop)
  ) {
    return DEFAULT_CLOUD_API_URL;
  }

  return '/api';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
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
