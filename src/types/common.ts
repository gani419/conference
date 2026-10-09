export type ISODateTime = string;
export type AvatarId = string;

export interface FieldError {
  path: string;
  message: string;
}

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'EMAIL_NOT_CONFIRMED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'MEETING_NOT_STARTED'
  | 'MEETING_CANCELLED'
  | 'MEETING_ENDED'
  | 'NETWORK_ERROR'
  | 'ABORTED'
  | 'INTERNAL_ERROR';

export type ApiResult<T> =
  | {
      success: true;
      data: T;
      requestId: string;
      serverTime: ISODateTime;
    }
  | {
      success: false;
      error: {
        code: ApiErrorCode;
        message: string;
        fieldErrors: FieldError[];
      };
      requestId: string;
      serverTime: ISODateTime;
    };

export interface RequestContext {
  accessToken: string | null;
  requestId: string;
  signal?: AbortSignal | undefined;
}

export interface PageRequest {
  page: number;
  pageSize: number;
}

export interface PageResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  hasMore: boolean;
}
