

/**
 * Represents an error returned by the API.
 */
export interface BackendAPIError {
  userMessage: string;
  errorCode: number;
  internalMessage?: string;
  retriable: boolean;
}

/**
 * Represents an internal error with additional properties for error code, retriability, and an optional internal message.
 *
 * @extends {Error}
 */
export class InternalError extends Error {
  errorCode: number;
  retriable: boolean;
  internalMessage?: string;

  constructor(message: string, errorCode: number, retriable: boolean, internalMessage?: string) {
    super(message);
    this.errorCode = errorCode;
    this.retriable = retriable;
    this.internalMessage = internalMessage;
  }

  /**
   * Creates an `InternalError` instance from an `APIError` object.
   *
   * @param apiError - The `APIError` object containing error details.
   * @param defaultErrorCode - The default error code to use if `apiError` does not have an error code. Defaults to 500.
   * @returns An `InternalError` instance populated with the details from the `APIError`.
   */
  static fromAPIError(apiError: BackendAPIError, defaultErrorCode: number = 500): InternalError {
    const errorCode = apiError.errorCode || defaultErrorCode;
    return new InternalError(apiError.userMessage, errorCode, apiError.retriable, apiError.internalMessage);
  }
}

