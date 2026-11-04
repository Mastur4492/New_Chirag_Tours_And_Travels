import { ApiResponse, PaginationMeta } from '@chirag/types';

const API_BASE_URL =
  typeof window !== 'undefined'
    ? '/api/proxy'
    : process.env.API_URL || 'http://localhost:5000/api/v1';

// Token storage keys
const AGENT_TOKEN_KEY = 'chirag_agent_token';
const AGENT_USER_KEY = 'chirag_agent_user';

export function getAgentToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AGENT_TOKEN_KEY);
}

export function getAgentUser(): any | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(AGENT_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAgentSession(token: string, user?: any): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(AGENT_TOKEN_KEY, token);
    if (user) {
      localStorage.setItem(AGENT_USER_KEY, JSON.stringify(user));
    }
  }
}

export function clearAgentSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AGENT_TOKEN_KEY);
    localStorage.removeItem(AGENT_USER_KEY);
  }
}

export class ApiError extends Error {
  statusCode: number;
  code?: string;
  details?: any;

  constructor(message: string, statusCode: number, code?: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

// In-memory client cache with 30s freshness TTL for instant page transitions
interface AgentClientCacheEntry<T = any> {
  data: T;
  meta?: PaginationMeta & Record<string, any>;
  timestamp: number;
}

const agentMemoryCache = new Map<string, AgentClientCacheEntry>();

export function clearAgentCache(prefix?: string): void {
  if (!prefix) {
    agentMemoryCache.clear();
    return;
  }
  agentMemoryCache.forEach((_, key) => {
    if (key.includes(prefix)) {
      agentMemoryCache.delete(key);
    }
  });
}

let isAgentRefreshingPromise: Promise<string | null> | null = null;

async function attemptAgentTokenRefresh(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  if (isAgentRefreshingPromise) return isAgentRefreshingPromise;

  isAgentRefreshingPromise = (async () => {
    try {
      const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!refreshRes.ok) return null;
      const data = await refreshRes.json();
      if (data.success && data.data?.accessToken) {
        setAgentSession(data.data.accessToken);
        return data.data.accessToken;
      }
      return null;
    } catch {
      return null;
    } finally {
      isAgentRefreshingPromise = null;
    }
  })();

  return isAgentRefreshingPromise;
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit & { skipCache?: boolean } = {}
): Promise<{ data: T; meta?: PaginationMeta & Record<string, any> }> {
  let token = getAgentToken();
  const isGet = !options.method || options.method.toUpperCase() === 'GET';
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const cacheKey = `agent_${token || 'anon'}_${cleanEndpoint}`;

  // Serve instant cache if fresh (< 30 seconds)
  if (isGet && !options.skipCache) {
    const cached = agentMemoryCache.get(cacheKey);
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

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err: any) {
    throw new ApiError(
      err?.message || 'Network connection failure. Please verify the API server is reachable.',
      0,
      'NETWORK_ERROR'
    );
  }

  if (res.status === 401 && typeof window !== 'undefined' && !cleanEndpoint.startsWith('/auth/')) {
    const newToken = await attemptAgentTokenRefresh();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      try {
        res = await fetch(url, {
          ...options,
          headers,
        });
      } catch (err: any) {
        throw new ApiError(
          err?.message || 'Network connection failure. Please verify the API server is reachable.',
          0,
          'NETWORK_ERROR'
        );
      }
    } else {
      clearAgentSession();
      clearAgentCache();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login?expired=true';
      }
    }
  }

  let body: ApiResponse<T>;
  try {
    body = await res.json();
  } catch {
    throw new ApiError(`Server responded with non-JSON response (HTTP ${res.status})`, res.status);
  }

  if (!res.ok || !body.success) {
    const errorData = !body.success ? (body as any).error : null;
    const errorMsg = errorData?.message || `Request failed with status ${res.status}`;
    throw new ApiError(errorMsg, res.status, errorData?.code, errorData?.details);
  }

  if (isGet) {
    agentMemoryCache.set(cacheKey, {
      data: body.data,
      meta: body.meta as PaginationMeta,
      timestamp: Date.now(),
    });
  } else {
    // Invalidate on mutations
    const basePrefix = cleanEndpoint.split('?')[0]?.split('/')[1];
    if (basePrefix) {
      clearAgentCache(basePrefix);
    }
  }

  return {
    data: body.data,
    meta: body.meta as PaginationMeta,
  };
}

// ----------------------------------------------------------------------------
// DOMAIN API CLIENTS
// ----------------------------------------------------------------------------

export const authApi = {
  async login(mobile: string, password: string) {
    const res = await apiFetch<{ user: any; accessToken?: string; tokens?: { accessToken: string; refreshToken: string } }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ mobile, password }),
      }
    );
    const token = res.data.accessToken || res.data.tokens?.accessToken;
    if (token) {
      setAgentSession(token, res.data.user);
    }
    return res.data;
  },

  async getMe() {
    const res = await apiFetch<any>('/auth/me');
    if (res.data && typeof window !== 'undefined') {
      localStorage.setItem(AGENT_USER_KEY, JSON.stringify(res.data));
    }
    return res.data;
  },

  async logout() {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      clearAgentSession();
    }
  },
};

export const leadsApi = {
  async list(params: { page?: number; limit?: number; status?: string; search?: string } = {}) {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.status) searchParams.set('status', params.status);
    if (params.search) searchParams.set('search', params.search);
    const qs = searchParams.toString();
    return apiFetch<any[]>(`/leads${qs ? `?${qs}` : ''}`);
  },

  async getById(id: string) {
    return apiFetch<any>(`/leads/${id}`);
  },

  async create(data: any) {
    return apiFetch<any>('/leads', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: any) {
    return apiFetch<any>(`/leads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async addActivity(id: string, data: { type: string; title: string; content?: string }) {
    return apiFetch<any>(`/leads/${id}/activities`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateFollowUp(id: string, data: { nextFollowUpDate?: string; followUpNotes?: string }) {
    return apiFetch<any>(`/leads/${id}/follow-up`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async getMetrics() {
    return apiFetch<any>('/leads/metrics');
  },
};

export const customersApi = {
  async list(params: { page?: number; limit?: number; search?: string } = {}) {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.search) searchParams.set('search', params.search);
    const qs = searchParams.toString();
    return apiFetch<any[]>(`/customers${qs ? `?${qs}` : ''}`);
  },

  async getById(id: string) {
    return apiFetch<any>(`/customers/${id}`);
  },

  async create(data: any) {
    return apiFetch<any>('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: any) {
    return apiFetch<any>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

export const quotationsApi = {
  async list(params: { page?: number; limit?: number; status?: string; search?: string; customerId?: string; leadId?: string } = {}) {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.status) searchParams.set('status', params.status);
    if (params.search) searchParams.set('search', params.search);
    if (params.customerId) searchParams.set('customerId', params.customerId);
    if (params.leadId) searchParams.set('leadId', params.leadId);
    const qs = searchParams.toString();
    return apiFetch<any[]>(`/quotations${qs ? `?${qs}` : ''}`);
  },

  async getById(id: string) {
    return apiFetch<any>(`/quotations/${id}`);
  },

  async calculate(data: any) {
    return apiFetch<any>('/quotations/calculate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async create(data: any) {
    return apiFetch<any>('/quotations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async revise(id: string, data: any) {
    return apiFetch<any>(`/quotations/${id}/revise`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async issue(id: string) {
    return apiFetch<{ quotation: any; shareableToken: string }>(`/quotations/${id}/issue`, {
      method: 'POST',
    });
  },

  async getVersions(id: string) {
    return apiFetch<any[]>(`/quotations/${id}/versions`);
  },
};

export const bookingsApi = {
  async list(params: { page?: number; limit?: number; status?: string; search?: string } = {}) {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.status) searchParams.set('status', params.status);
    if (params.search) searchParams.set('search', params.search);
    const qs = searchParams.toString();
    return apiFetch<any[]>(`/bookings${qs ? `?${qs}` : ''}`);
  },

  async getById(id: string) {
    return apiFetch<any>(`/bookings/${id}`);
  },

  async getMetrics() {
    return apiFetch<any>('/bookings/metrics');
  },
};

export const paymentsApi = {
  async getForBooking(bookingId: string) {
    return apiFetch<{ payments: any[]; summary: any }>(`/payments/booking/${bookingId}`);
  },

  async recordPayment(data: {
    bookingId: string;
    amount: number;
    paymentType: string;
    paymentMethod: string;
    transactionReference?: string;
    paymentDate?: string;
    proofDocumentUrl?: string;
    notes?: string;
    idempotencyKey?: string;
  }) {
    return apiFetch<any>('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async recordRefund(data: {
    bookingId: string;
    originalPaymentId: string;
    amount: number;
    refundReason: string;
    paymentMethod?: string;
    transactionReference?: string;
    notes?: string;
    idempotencyKey?: string;
  }) {
    return apiFetch<any>('/payments/refund', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

export const operationsApi = {
  async getSummary(bookingId: string) {
    return apiFetch<any>(`/operations/bookings/${bookingId}`);
  },
};

export const inventoryApi = {
  async getDestinations() {
    return apiFetch<any[]>('/destinations');
  },

  async getHotels(destinationId?: string) {
    const qs = destinationId ? `?destinationId=${destinationId}` : '';
    return apiFetch<any[]>(`/hotels${qs}`);
  },

  async getPackages(destinationId?: string) {
    const qs = destinationId ? `?destinationId=${destinationId}` : '';
    return apiFetch<any[]>(`/packages${qs}`);
  },

  async getVehicles() {
    return apiFetch<any[]>('/transport/vehicles');
  },

  async getTariffs(destinationId?: string) {
    const qs = destinationId ? `?destinationId=${destinationId}` : '';
    return apiFetch<any[]>(`/transport/tariffs${qs}`);
  },

  async getRoomCategories(hotelId: string) {
    return apiFetch<any[]>(`/hotels/${hotelId}/rooms`);
  },

  async getTaxes() {
    return apiFetch<any[]>('/taxes');
  },
};

export const notificationsApi = {
  async list(params: { limit?: number; skip?: number; unreadOnly?: boolean } = {}) {
    const qs = new URLSearchParams();
    if (params.limit) qs.append('limit', String(params.limit));
    if (params.skip) qs.append('skip', String(params.skip));
    if (params.unreadOnly) qs.append('unreadOnly', 'true');
    const query = qs.toString() ? `?${qs.toString()}` : '';
    const res = await apiFetch<{ notifications: any[]; total: number; unreadCount: number }>(
      `/notifications${query}`,
      { skipCache: true }
    );
    return res.data;
  },

  async getUnreadCount() {
    const res = await apiFetch<{ unreadCount: number }>('/notifications/unread-count', { skipCache: true });
    return res.data;
  },

  async markRead(id: string) {
    const res = await apiFetch<any>(`/notifications/${id}/read`, { method: 'PATCH' });
    return res.data;
  },

  async markAllRead() {
    const res = await apiFetch<{ success: boolean }>('/notifications/read-all', { method: 'PATCH' });
    return res.data;
  },
};

