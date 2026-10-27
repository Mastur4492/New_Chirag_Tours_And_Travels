import {
  DestinationDto,
  TourPackageDto,
  QuotationPublicDto,
  PublicEnquiryResultDto,
} from '@chirag/types';
import { PublicEnquirySchemaInput } from '@chirag/validation';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// In-memory client cache for fast tab navigation (10s TTL for real-time admin sync)
const customerMemoryCache = new Map<string, { data: any; timestamp: number }>();

export function clearCustomerCache() {
  customerMemoryCache.clear();
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const isGet = !init?.method || init.method.toUpperCase() === 'GET';

  if (isGet) {
    const cached = customerMemoryCache.get(url);
    if (cached && Date.now() - cached.timestamp < 10000) {
      return cached.data as T;
    }
  }

  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...init?.headers,
    },
  });

  const body = (await res.json().catch(() => null)) as ApiResponse<T> | null;

  if (!res.ok || !body?.success) {
    const errorMsg =
      body?.error?.message ||
      (body?.error?.details && Array.isArray(body.error.details)
        ? body.error.details.map((d: any) => d.message || d).join(', ')
        : `Request failed with status ${res.status}`);
    throw new Error(errorMsg);
  }

  if (isGet) {
    customerMemoryCache.set(url, {
      data: body.data,
      timestamp: Date.now(),
    });
  }

  return body.data;
}

export const customerApi = {
  async getDestinations(): Promise<DestinationDto[]> {
    return requestJson<DestinationDto[]>('/api/proxy/destinations?isActive=true&limit=50&_t=' + Date.now());
  },

  async getDestinationBySlug(slug: string): Promise<DestinationDto> {
    return requestJson<DestinationDto>(`/api/proxy/destinations/slug/${encodeURIComponent(slug)}`);
  },

  async getPackages(query?: { destinationId?: string; search?: string }): Promise<TourPackageDto[]> {
    const params = new URLSearchParams();
    if (query?.destinationId) params.set('destinationId', query.destinationId);
    if (query?.search) params.set('search', query.search);
    params.set('limit', '50');
    const queryString = params.toString();
    const result = await requestJson<any>(
      `/api/proxy/packages${queryString ? `?${queryString}` : ''}`
    );
    if (Array.isArray(result)) return result;
    return result?.packages || [];
  },

  async getHotels(query?: { destinationId?: string; starRating?: number; search?: string }): Promise<any[]> {
    const params = new URLSearchParams();
    if (query?.destinationId) params.set('destinationId', query.destinationId);
    if (query?.starRating) params.set('starRating', String(query.starRating));
    if (query?.search) params.set('search', query.search);
    params.set('limit', '50');
    const queryString = params.toString();
    const result = await requestJson<any>(
      `/api/proxy/hotels${queryString ? `?${queryString}` : ''}`
    );
    if (Array.isArray(result)) return result;
    return result?.items || result || [];
  },

  async getPackageBySlug(slug: string): Promise<TourPackageDto> {
    return requestJson<TourPackageDto>(`/api/proxy/packages/slug/${encodeURIComponent(slug)}`);
  },

  async getVehicles(): Promise<any[]> {
    const result = await requestJson<any>('/api/proxy/transport/vehicles?status=AVAILABLE&limit=50&_t=' + Date.now());
    if (Array.isArray(result)) return result;
    return result?.items || result || [];
  },

  async getTransportTariffs(): Promise<any[]> {
    const result = await requestJson<any>('/api/proxy/transport/tariffs?isActive=true&limit=50&_t=' + Date.now());
    if (Array.isArray(result)) return result;
    return result?.items || result || [];
  },

  async submitPublicEnquiry(payload: PublicEnquirySchemaInput): Promise<PublicEnquiryResultDto> {
    return requestJson<PublicEnquiryResultDto>('/api/proxy/leads/public-enquiry', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getPublicQuote(token: string): Promise<QuotationPublicDto> {
    return requestJson<QuotationPublicDto>(`/api/proxy/quotations/public/${encodeURIComponent(token)}`);
  },

  async acceptPublicQuote(token: string, agreedToTerms: boolean = true): Promise<QuotationPublicDto> {
    return requestJson<QuotationPublicDto>(
      `/api/proxy/quotations/public/${encodeURIComponent(token)}/accept`,
      {
        method: 'POST',
        body: JSON.stringify({ agreedToTerms }),
      }
    );
  },

  async requestQuoteChanges(token: string, message: string): Promise<QuotationPublicDto> {
    return requestJson<QuotationPublicDto>(
      `/api/proxy/quotations/public/${encodeURIComponent(token)}/request-changes`,
      {
        method: 'POST',
        body: JSON.stringify({ message }),
      }
    );
  },
};
