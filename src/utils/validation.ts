import { ZodError } from 'zod';
import { ApiErrorCode, FieldError } from '../types/common';

export interface AppNormalizedError {
  code: ApiErrorCode;
  message: string;
  fieldErrors: FieldError[];
}

export function normalizeError(error: unknown): AppNormalizedError {
  if (error instanceof ZodError) {
    const fieldErrors: FieldError[] = error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    return {
      code: 'VALIDATION_ERROR',
      message: fieldErrors[0]?.message ?? 'Validation failed',
      fieldErrors,
    };
  }

  if (typeof error === 'object' && error !== null && 'code' in error && 'message' in error) {
    const custom = error as { code: string; message: string; fieldErrors?: FieldError[] };
    return {
      code: (custom.code as ApiErrorCode) || 'INTERNAL_ERROR',
      message: custom.message || 'An error occurred',
      fieldErrors: custom.fieldErrors || [],
    };
  }

  if (error instanceof Error) {
    return {
      code: 'INTERNAL_ERROR',
      message: error.message,
      fieldErrors: [],
    };
  }

  return {
    code: 'INTERNAL_ERROR',
    message: String(error) || 'An unexpected error occurred',
    fieldErrors: [],
  };
}
