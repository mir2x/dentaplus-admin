import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/auth';

const baseURL =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL,
  headers: {
    'ngrok-skip-browser-warning': 'true',
  },
});

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback;
  const message = error.response?.data?.message;
  if (Array.isArray(message)) return message.join('. ');
  return typeof message === 'string' && message.trim() ? message : fallback;
}

// Interceptor-free client for the token refresh call. Using an axios instance
// (rather than a hand-built URL) normalizes a trailing slash in baseURL so we
// never hit `/api/v1//auth/refresh`, and avoids 401-interceptor recursion.
const refreshClient = axios.create({
  baseURL,
  headers: {
    'ngrok-skip-browser-warning': 'true',
  },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function forceLogout() {
  useAuthStore.getState().logout();
  if (typeof window !== 'undefined') window.location.href = '/login';
}

// Single in-flight refresh shared across concurrent 401s so we only rotate once.
let refreshPromise: Promise<string> | null = null;

function readPersistedTokens(): { token: string; refreshToken: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const persisted = JSON.parse(localStorage.getItem('dentaplus-admin-auth') ?? 'null') as {
      state?: { token?: unknown; refreshToken?: unknown };
    } | null;
    return typeof persisted?.state?.token === 'string' &&
      typeof persisted.state.refreshToken === 'string'
      ? { token: persisted.state.token, refreshToken: persisted.state.refreshToken }
      : null;
  } catch {
    return null;
  }
}

async function refreshAccessToken(): Promise<string> {
  const attemptedRefreshToken = useAuthStore.getState().refreshToken;
  if (!attemptedRefreshToken) throw new Error('No refresh token');

  const performRefresh = async () => {
    const latest = readPersistedTokens();
    if (latest && latest.refreshToken !== attemptedRefreshToken) {
      useAuthStore.getState().setTokens(latest.token, latest.refreshToken);
      return latest.token;
    }

    try {
      const { data } = await refreshClient.post('/auth/refresh', {
        refreshToken: attemptedRefreshToken,
      });
      useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
      return data.accessToken as string;
    } catch (error) {
      const refreshedElsewhere = readPersistedTokens();
      if (refreshedElsewhere && refreshedElsewhere.refreshToken !== attemptedRefreshToken) {
        useAuthStore
          .getState()
          .setTokens(refreshedElsewhere.token, refreshedElsewhere.refreshToken);
        return refreshedElsewhere.token;
      }
      throw error;
    }
  };

  return typeof navigator !== 'undefined' && navigator.locks
    ? navigator.locks.request('dentaplus-admin-auth-refresh', performRefresh)
    : performRefresh();
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retried?: boolean })
      | undefined;

    const isAuthCall = original?.url?.includes('/auth/');

    if (error.response?.status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true;
      try {
        refreshPromise ??= refreshAccessToken();
        const newToken = await refreshPromise;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        forceLogout();
        return Promise.reject(error);
      } finally {
        refreshPromise = null;
      }
    }

    if (error.response?.status === 401) forceLogout();
    return Promise.reject(error);
  },
);
