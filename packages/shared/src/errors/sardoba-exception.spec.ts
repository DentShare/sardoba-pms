import { SardobaException } from './sardoba-exception';
import { ErrorCode } from './error-codes';

describe('SardobaException', () => {
  it('should create exception with correct code', () => {
    const err = new SardobaException(ErrorCode.ROOM_NOT_AVAILABLE);
    expect(err.code).toBe('ROOM_NOT_AVAILABLE');
    expect(err.httpStatus).toBe(409);
    expect(err.name).toBe('SardobaException');
  });

  it('should include details when provided', () => {
    const details = { blocked_dates: ['2025-03-10', '2025-03-11'] };
    const err = new SardobaException(ErrorCode.ROOM_NOT_AVAILABLE, details);
    expect(err.details).toEqual(details);
  });

  it('should use custom message when provided', () => {
    const err = new SardobaException(
      ErrorCode.NOT_FOUND,
      undefined,
      'Booking not found',
    );
    expect(err.message).toBe('Booking not found');
  });

  it('should serialize to JSON correctly', () => {
    const err = new SardobaException(ErrorCode.VALIDATION_ERROR, { field: 'email' });
    const json = err.toJSON();
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.details).toEqual({ field: 'email' });
  });

  it('should map auth errors to 401', () => {
    const err = new SardobaException(ErrorCode.AUTH_REQUIRED);
    expect(err.httpStatus).toBe(401);
  });

  it('should map forbidden to 403', () => {
    const err = new SardobaException(ErrorCode.FORBIDDEN);
    expect(err.httpStatus).toBe(403);
  });

  it('should map rate limit to 429', () => {
    const err = new SardobaException(ErrorCode.RATE_LIMIT_EXCEEDED);
    expect(err.httpStatus).toBe(429);
  });
});
