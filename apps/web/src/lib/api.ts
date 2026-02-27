import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1';

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

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

function clearAuthAndRedirect() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    document.cookie = 'access_token=; path=/; max-age=0';
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

// Request interceptor: attach JWT token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

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
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = typeof window !== 'undefined'
        ? localStorage.getItem('refresh_token')
        : null;

      if (!refreshToken) {
        isRefreshing = false;
        clearAuthAndRedirect();
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        // Note: refresh uses raw axios (not `api`), so response is NOT transformed
        const newAccessToken = data.access_token;
        const newRefreshToken = data.refresh_token;

        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', newAccessToken);
          if (newRefreshToken) {
            localStorage.setItem('refresh_token', newRefreshToken);
          }

          // Update cookie for middleware
          document.cookie = `access_token=${newAccessToken}; path=/; max-age=${data.expires_in || 3600}; SameSite=Strict; Secure`;
        }

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        processQueue(null, newAccessToken);

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAuthAndRedirect();
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
