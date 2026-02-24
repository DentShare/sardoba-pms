import { ErrorCode } from './error-codes';

/**
 * HTTP status code mapping for error codes.
 * Used by SardobaException to determine the HTTP status code.
 */
const ERROR_HTTP_MAP: Record<ErrorCode, number> = {
  // 401 Unauthorized
  [ErrorCode.AUTH_REQUIRED]: 401,
  [ErrorCode.INVALID_CREDENTIALS]: 401,
  [ErrorCode.TOKEN_EXPIRED]: 401,
  [ErrorCode.TOKEN_INVALID]: 401,
  [ErrorCode.REFRESH_TOKEN_EXPIRED]: 401,

  // 403 Forbidden
  [ErrorCode.FORBIDDEN]: 403,

  // 404 Not Found
  [ErrorCode.NOT_FOUND]: 404,

  // 400 Bad Request
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.INVALID_DATE_RANGE]: 400,
  [ErrorCode.CHECKIN_BEFORE_TODAY]: 400,
  [ErrorCode.CHECKOUT_BEFORE_CHECKIN]: 400,

  // Rate errors
  [ErrorCode.RATE_NOT_FOUND]: 404,
  [ErrorCode.RATE_NOT_APPLICABLE]: 422,
  [ErrorCode.RATE_CONFLICT]: 409,

  // Guest errors
  [ErrorCode.GUEST_NOT_FOUND]: 404,
  [ErrorCode.GUEST_DUPLICATE_PHONE]: 409,

  // 409 Conflict
  [ErrorCode.ROOM_NOT_AVAILABLE]: 409,
  [ErrorCode.OVERBOOKING_DETECTED]: 409,
  [ErrorCode.ALREADY_EXISTS]: 409,

  // 422 Unprocessable Entity
  [ErrorCode.BOOKING_CANCELLED]: 422,
  [ErrorCode.OVERPAYMENT]: 422,
  [ErrorCode.REFUND_EXCEEDS_PAID]: 422,
  [ErrorCode.PAYMENT_FAILED]: 422,

  // 429 Too Many Requests
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,

  // Channel Manager
  [ErrorCode.CHANNEL_NOT_FOUND]: 404,
  [ErrorCode.WEBHOOK_SIGNATURE_INVALID]: 401,

  // 502 Bad Gateway
  [ErrorCode.CHANNEL_SYNC_FAILED]: 502,
  [ErrorCode.CHANNEL_AUTH_FAILED]: 502,

  // 503 Service Unavailable
  [ErrorCode.CHANNEL_NOT_CONFIGURED]: 503,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,

  // 500 Internal Server Error
  [ErrorCode.INTERNAL_ERROR]: 500,
};

/**
 * Base exception class for Sardoba PMS.
 *
 * Usage:
 *   throw new SardobaException(ErrorCode.ROOM_NOT_AVAILABLE, {
 *     blocked_dates: ['2025-03-10', '2025-03-11'],
 *   });
 *
 * This class is framework-agnostic in its core structure.
 * When used with NestJS, import the NestJS-aware variant or
 * use the HttpException wrapper in the API app.
 */
export class SardobaException extends Error {
  public readonly code: ErrorCode;
  public readonly httpStatus: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    details?: Record<string, unknown>,
    message?: string,
  ) {
    super(message ?? code);
    this.code = code;
    this.httpStatus = ERROR_HTTP_MAP[code] ?? 500;
    this.details = details;
    this.name = 'SardobaException';

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, SardobaException.prototype);
  }

  /**
   * Serialize to the standard API error format.
   */
  toJSON(): { error: { code: string; message: string; details?: Record<string, unknown> } } {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}
