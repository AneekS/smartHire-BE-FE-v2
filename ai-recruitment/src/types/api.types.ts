export type ApiSuccess<T> = { success: true; data: T };
export type ApiFailure = { success: false; error: string; details?: unknown };
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

/** Phase 5 routes that return `{ data, meta? }` without `success`. */
export interface V1Envelope<T, M = Record<string, unknown>> {
  data: T;
  meta?: M;
}

export function isApiSuccess<T>(res: ApiResponse<T>): res is ApiSuccess<T> {
  return res.success === true;
}

export function unwrapApiData<T>(res: ApiResponse<T>): T {
  if (!isApiSuccess(res)) {
    throw new Error(res.error);
  }
  return res.data;
}
