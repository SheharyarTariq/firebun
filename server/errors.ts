/**
 * Thrown by services for expected domain failures ("discount exceeds staff limit",
 * "order already cancelled"). Actions catch it and return `fail(error.message)`.
 * Anything else that is thrown is a bug and should surface as a generic error.
 */
export class ServiceError extends Error {
  readonly fieldErrors?: Record<string, string>;

  constructor(message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = "ServiceError";
    this.fieldErrors = fieldErrors;
  }
}

export function isServiceError(error: unknown): error is ServiceError {
  return error instanceof ServiceError;
}
