export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  timestamp: string;
}

export interface ApiResponse<T = unknown> {
  success: true;
  data: T;
  error: null;
  meta?: PaginationMeta | { timestamp: string };
}

export interface ApiErrorDetail {
  field?: string;
  issue: string;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: ApiErrorDetail[];
}

export interface ApiErrorResponse {
  success: false;
  data: null;
  error: ApiErrorPayload;
  meta: {
    timestamp: string;
  };
}
