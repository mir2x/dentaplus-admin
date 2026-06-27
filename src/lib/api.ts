import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/auth';

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export const api = axios.create({ baseURL });

// Interceptor-free client for the token refresh call. Using an axios instance
// (rather than a hand-built URL) normalizes a trailing slash in baseURL so we
// never hit `/api/v1//auth/refresh`, and avoids 401-interceptor recursion.
const refreshClient = axios.create({ baseURL });

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

async function refreshAccessToken(): Promise<string> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) throw new Error('No refresh token');

  const { data } = await refreshClient.post('/auth/refresh', { refreshToken });
  useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
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
