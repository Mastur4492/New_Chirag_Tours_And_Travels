import { ApiResponse, PaginationMeta, AgencySettingsDto } from '@chirag/types';

const API_BASE_URL =
  typeof window !== 'undefined'
    ? '/api/proxy'
    : process.env.API_URL || 'http://localhost:5000/api/v1';

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

export function getPublicApiUrl(): string {
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    if (window.location.hostname.includes('vercel.app')) {
      return 'https://newchirag-api.onrender.com/api/v1';
    }
    return '/api/proxy';
  }
  return process.env?.API_URL || 'http://localhost:5000/api/v1';
}

// Token storage keys
const AUTH_TOKEN_KEY = 'chirag_admin_token';
const USER_ROLE_KEY = 'chirag_user_role';
const USER_INFO_KEY = 'chirag_user_info';

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getUserRole(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(USER_ROLE_KEY);
}

export function getUserInfo(): any | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_INFO_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }
}

export function setUserSession(token: string, user?: any): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    if (user?.role) {
      localStorage.setItem(USER_ROLE_KEY, user.role);
    }
    if (user) {
      localStorage.setItem(USER_INFO_KEY, JSON.stringify(user));
    }
  }
}

export function clearAdminToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_ROLE_KEY);
    localStorage.removeItem(USER_INFO_KEY);
  }
}

export async function ensureAdminToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  return getAdminToken();
}

// In-memory client cache with 30s freshness TTL for instant page & tab transitions
interface ClientCacheEntry<T = any> {
  data: T;
  meta?: PaginationMeta;
  timestamp: number;
}

const clientMemoryCache = new Map<string, ClientCacheEntry>();

export function clearClientCache(prefix?: string): void {
  if (!prefix) {
    clientMemoryCache.clear();
    return;
  }
  clientMemoryCache.forEach((_, key) => {
    if (key.includes(prefix)) {
      clientMemoryCache.delete(key);
    }
  });
}

let isRefreshingPromise: Promise<string | null> | null = null;

async function attemptTokenRefresh(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  if (isRefreshingPromise) return isRefreshingPromise;

  isRefreshingPromise = (async () => {
    try {
      const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!refreshRes.ok) return null;
      const data = await refreshRes.json();
      if (data.success && data.data?.accessToken) {
        setAdminToken(data.data.accessToken);
        return data.data.accessToken;
      }
      return null;
    } catch {
      return null;
    } finally {
      isRefreshingPromise = null;
    }
  })();

  return isRefreshingPromise;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit & { skipCache?: boolean } = {}
): Promise<T> {
  let token = getAdminToken();
  const isGet = !options.method || options.method.toUpperCase() === 'GET';
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const cacheKey = `req_${token || 'anon'}_${cleanEndpoint}`;

  // Serve instant cache if fresh (< 30 seconds)
  if (isGet && !options.skipCache) {
    const cached = clientMemoryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 30000) {
      return cached.data as T;
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${cleanEndpoint}`;

  try {
    let res = await fetch(url, {
      ...options,
      headers,
    });

    // If 401 Unauthorized, attempt silent refresh before clearing session
    if (res.status === 401 && typeof window !== 'undefined' && !cleanEndpoint.startsWith('/auth/')) {
      const newToken = await attemptTokenRefresh();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        res = await fetch(url, {
          ...options,
          headers,
        });
      } else {
        clearAdminToken();
        clearClientCache();
        if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/quote/')) {
          window.location.href = '/login?expired=true';
        }
      }
    }

    const body: ApiResponse<T> = await res.json();

    if (!res.ok || !body.success) {
      const errorData = !body.success ? (body as any).error : null;
      const errorMessage =
        errorData?.message || `Request failed with status ${res.status}`;
      const error = new Error(errorMessage);
      (error as any).code = errorData?.code;
      (error as any).details = errorData?.details;
      (error as any).statusCode = res.status;
      throw error;
    }

    // Cache successful GET result
    if (isGet) {
      clientMemoryCache.set(cacheKey, {
        data: body.data as T,
        timestamp: Date.now(),
      });
    } else {
      // Invalidate related cache entries on mutation (POST/PUT/PATCH/DELETE)
      const basePrefix = cleanEndpoint.split('?')[0]?.split('/')[1];
      if (basePrefix) {
        clearClientCache(basePrefix);
      }
    }

    return body.data as T;
  } catch (err: any) {
    if (err.statusCode) {
      throw err;
    }
    throw new Error(err.message || 'Network error connecting to backend API');
  }
}

export async function apiPaginatedRequest<T>(
  endpoint: string,
  options: RequestInit & { skipCache?: boolean } = {}
): Promise<{ data: T; meta?: PaginationMeta }> {
  const token = getAdminToken();
  const isGet = !options.method || options.method.toUpperCase() === 'GET';
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const cacheKey = `pag_${token || 'anon'}_${cleanEndpoint}`;

  // Serve instant cache if fresh (< 30 seconds)
  if (isGet && !options.skipCache) {
    const cached = clientMemoryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 30000) {
      return {
        data: cached.data as T,
        meta: cached.meta,
      };
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${cleanEndpoint}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    // If 401 Unauthorized, clear stale session and redirect to login if browser context
    if (res.status === 401 && typeof window !== 'undefined') {
      clearAdminToken();
      clearClientCache();
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/quote/')) {
        window.location.href = '/login';
      }
    }

    const body: ApiResponse<T> = await res.json();

    if (!res.ok || !body.success) {
      const errorData = !body.success ? (body as any).error : null;
      const errorMessage =
        errorData?.message || `Request failed with status ${res.status}`;
      const error = new Error(errorMessage);
      (error as any).code = errorData?.code;
      (error as any).details = errorData?.details;
      (error as any).statusCode = res.status;
      throw error;
    }

    if (isGet) {
      clientMemoryCache.set(cacheKey, {
        data: body.data as T,
        meta: body.meta as PaginationMeta | undefined,
        timestamp: Date.now(),
      });
    } else {
      const basePrefix = cleanEndpoint.split('?')[0]?.split('/')[1];
      if (basePrefix) {
        clearClientCache(basePrefix);
      }
    }

    return {
      data: body.data as T,
      meta: body.meta as PaginationMeta | undefined,
    };
  } catch (err: any) {
    if (err.statusCode) {
      throw err;
    }
    throw new Error(err.message || 'Network error connecting to backend API');
  }
}

export const notificationsApi = {
  list: async (params: { limit?: number; skip?: number; unreadOnly?: boolean } = {}) => {
    const qs = new URLSearchParams();
    if (params.limit) qs.append('limit', String(params.limit));
    if (params.skip) qs.append('skip', String(params.skip));
    if (params.unreadOnly) qs.append('unreadOnly', 'true');
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return apiRequest<{ notifications: any[]; total: number; unreadCount: number }>(
      `notifications${query}`,
      { skipCache: true }
    );
  },
  getUnreadCount: async () => {
    return apiRequest<{ unreadCount: number }>('notifications/unread-count', { skipCache: true });
  },
  markRead: async (id: string) => {
    return apiRequest<any>(`notifications/${id}/read`, { method: 'PATCH' });
  },
  markAllRead: async () => {
    return apiRequest<{ success: boolean }>('notifications/read-all', { method: 'PATCH' });
  },
};

export const authApi = {
  getMe: async () => {
    return apiRequest<any>('auth/me', { skipCache: true });
  },
  updateProfile: async (data: { fullName?: string; email?: string | null; mobile?: string; agencyName?: string; city?: string }) => {
    return apiRequest<any>('auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  changePassword: async (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    return apiRequest<{ message: string }>('auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

export const agencySettingsApi = {
  get: async () => {
    return apiRequest<AgencySettingsDto>('settings/agency', { skipCache: true });
  },
  update: async (data: Partial<AgencySettingsDto>) => {
    return apiRequest<AgencySettingsDto>('settings/agency', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};




