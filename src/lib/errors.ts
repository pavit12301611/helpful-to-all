/**
 * Typed application errors.
 *
 * Server actions translate these into user-facing results; API routes translate
 * them into HTTP status codes. Never leak internal details to the client.
 */

export type FieldErrors = Record<string, string>;

export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fieldErrors?: FieldErrors;

  constructor(message: string, options: { code?: string; status?: number; fieldErrors?: FieldErrors } = {}) {
    super(message);
    this.name = 'AppError';
    this.code = options.code ?? 'app_error';
    this.status = options.status ?? 400;
    this.fieldErrors = options.fieldErrors;
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Please check the highlighted fields.', fieldErrors: FieldErrors = {}) {
    super(message, { code: 'validation_error', status: 422, fieldErrors });
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'You need to sign in to do that.') {
    super(message, { code: 'unauthorized', status: 401 });
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to do that.') {
    super(message, { code: 'forbidden', status: 403 });
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'We could not find that item.') {
    super(message, { code: 'not_found', status: 404 });
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message = 'That item already exists.') {
    super(message, { code: 'conflict', status: 409 });
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many attempts. Please wait a moment and try again.') {
    super(message, { code: 'rate_limited', status: 429 });
    this.name = 'RateLimitError';
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function errorMessage(error: unknown): string {
  if (isAppError(error)) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}
