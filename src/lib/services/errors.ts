// file: src/lib/services/errors.ts
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNIQUE_VIOLATION'
  | 'CONCURRENCY_RETRY_EXCEEDED'
  | 'FOREIGN_KEY_MISSING'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'PARSE_ERROR'

export class AppError extends Error {
  code: ErrorCode
  cause?: unknown
  constructor(code: ErrorCode, message: string, cause?: unknown) {
    super(message)
    this.code = code
    this.cause = cause
    this.name = 'AppError'
  }
}

export function isAppError(err: unknown, code?: ErrorCode): err is AppError {
  return (
    err instanceof AppError && (code ? err.code === code : true)
  )
}

export function createConflict(message: string, cause?: unknown) {
  return new AppError('CONFLICT', message, cause)
}

export function createNotFound(message: string) {
  return new AppError('NOT_FOUND', message)
}

export function createValidation(message: string) {
  return new AppError('VALIDATION_ERROR', message)
}

export function createParseError(message: string, cause?: unknown) {
  return new AppError('PARSE_ERROR', message, cause)
}
