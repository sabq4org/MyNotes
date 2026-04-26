import axios from 'axios';
import { getToken, clearToken } from '../lib/storage';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const code = err?.response?.data?.error;

    if (status === 401 && (code === 'token_expired' || code === 'invalid_token' || code === 'unauthorized')) {
      clearToken();
      if (typeof onUnauthorized === 'function') onUnauthorized();
    }

    return Promise.reject(err);
  }
);

export default api;
