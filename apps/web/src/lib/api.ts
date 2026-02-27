import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';

/**
 * API base URL — routes through the Next.js API proxy so that HttpOnly
 * cookies (access_token, refresh_token) are attached server-side.
 * The proxy forwards requests to the NestJS backend with the appropriate
 * Authorization header.
 */
const API_BASE_URL = '/api/proxy';

/**
 * Recursively convert snake_case keys to camelCase.
 * Handles nested objects and arrays.
 */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

function transformKeys(data: unknown): unknown {
  if (Array.isArray(data)) {
    return data.map(transformKeys);
  }
  if (data !== null && typeof data === 'object' && !(data instanceof Date) && !(data instanceof Blob)) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      result[snakeToCamel(key)] = transformKeys(value);
    }
    return result;
  }
  return data;
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(undefined);
    }
  });
  failedQueue = [];
}

function redirectToLogin() {
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

/** Show user-facing toast for non-recoverable HTTP errors */
function showErrorToast(error: AxiosError) {
  if (typeof window === 'undefined') return;

  if (!error.response) {
    toast.error('Нет подключения к серверу', {
      id: 'network-error',
      duration: 5000,
    });
    return;
  }

  const status = error.response.status;

  if (status >= 500) {
    toast.error('Ошибка сервера. Попробуйте позже.', {
      id: 'server-error',
      duration: 5000,
    });
  } else if (status === 403) {
    toast.error('Недостаточно прав для выполнения действия', {
      id: 'forbidden-error',
      duration: 4000,
    });
  } else if (status === 429) {
    toast.error('Слишком много запросов. Подождите немного.', {
      id: 'rate-limit-error',
      duration: 5000,
    });
  }
}

// No request interceptor needed — cookies are sent automatically via
// withCredentials and the proxy route reads them server-side.

// Single response interceptor: transform keys, handle token refresh, show error toasts.
// Order matters: refresh is attempted first for 401s. If refresh fails or error is
// non-401, toast notification is shown before rejecting.
api.interceptors.response.use(
  (response) => {
    // Transform snake_case API response keys to camelCase
    if (response.data && typeof response.data === 'object') {
      response.data = transformKeys(response.data);
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // --- Step 1: Attempt token refresh for 401 errors ---
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== '/auth/refresh' &&
      originalRequest.url !== '/auth/login'
    ) {
      if (isRefreshing) {
        // Queue requests while refreshing
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Call the Next.js proxy refresh route, which reads the
        // refresh_token from HttpOnly cookies server-side
        const refreshRes = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'same-origin',
        });

        if (!refreshRes.ok) {
          throw new Error('Token refresh failed');
        }

        processQueue(null);

        // Retry the original request — the proxy will pick up the
        // new access_token cookie automatically
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        redirectToLogin();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // --- Step 2: Show toast notification for non-recoverable errors ---
    showErrorToast(error);

    return Promise.reject(error);
  },
);
