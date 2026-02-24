import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '@/database/entities/booking.entity';
import { Payment } from '@/database/entities/payment.entity';
import { PaymentsService } from './payments.service';

/**
 * Payme JSON-RPC 2.0 error codes.
 * Per Payme Merchant API specification.
 */
enum PaymeError {
  INVALID_JSON_RPC = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_AMOUNT = -31001,
  TRANSACTION_NOT_FOUND = -31003,
  UNABLE_TO_PERFORM = -31008,
  ORDER_NOT_FOUND = -31050,
  ORDER_ALREADY_PAID = -31051,
  AUTHORIZATION_FAILED = -32504,
  TRANSACTION_ALREADY_CANCELLED = -31007,
  TRANSACTION_CANNOT_CANCEL = -31007,
}

/**
 * Payme transaction states:
 *   1 = created (waiting for payment)
 *   2 = completed (payment performed)
 *  -1 = cancelled after creation
 *  -2 = cancelled after completion
 */
interface PaymeTransaction {
  id: string;
  bookingId: number;
  amount: number;
  state: 1 | 2 | -1 | -2;
  createTime: number;
  performTime: number;
  cancelTime: number;
  reason: number | null;
}

/**
 * Payme JSON-RPC request body.
 */
interface PaymeRequest {
  id: number;
  method: string;
  params: Record<string, any>;
}

@Injectable()
export class PaymeService {
  private readonly logger = new Logger(PaymeService.name);
  private readonly merchantId: string;
  private readonly secretKey: string;

  /**
   * In-memory storage for Payme transactions.
   * In production, this should be a database table (payme_transactions).
   * For now, using a Map to keep the implementation simple and functional.
   */
  private readonly transactions = new Map<string, PaymeTransaction>();

  constructor(
    private readonly configService: ConfigService,
    private readonly paymentsService: PaymentsService,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {
    this.merchantId = this.configService.get<string>('PAYME_MERCHANT_ID', '');
    this.secretKey = this.configService.get<string>('PAYME_SECRET_KEY', '');
  }

  // ── handleWebhook ──────────────────────────────────────────────────────────

  /**
   * Main entry point for Payme JSON-RPC 2.0 webhooks.
   *
   * Payme sends POST requests with Basic auth header:
   *   Authorization: Basic base64(merchantId:secretKey)
   *
   * Request body is JSON-RPC 2.0:
   *   { "id": 1, "method": "CheckPerformTransaction", "params": { ... } }
   */
  async handleWebhook(
    body: PaymeRequest,
    authHeader: string | undefined,
  ): Promise<Record<string, unknown>> {
    // Verify authentication
    if (!this.verifyAuth(authHeader)) {
      return this.errorResponse(body.id, PaymeError.AUTHORIZATION_FAILED, 'Authorization failed');
    }

    const { method, params } = body;

    switch (method) {
      case 'CheckPerformTransaction':
        return this.checkPerformTransaction(body.id, params);
      case 'CreateTransaction':
        return this.createTransaction(body.id, params);
      case 'PerformTransaction':
        return this.performTransaction(body.id, params);
      case 'CancelTransaction':
        return this.cancelTransaction(body.id, params);
      case 'CheckTransaction':
        return this.checkTransaction(body.id, params);
      case 'GetStatement':
        return this.getStatement(body.id, params);
      default:
        return this.errorResponse(body.id, PaymeError.METHOD_NOT_FOUND, `Method '${method}' not found`);
    }
  }

  // ── CheckPerformTransaction ────────────────────────────────────────────────

  /**
   * Validates whether a transaction can be performed for the given order.
   * Checks: booking exists, amount matches, booking is payable.
   */
  private async checkPerformTransaction(
    requestId: number,
    params: Record<string, any>,
  ): Promise<Record<string, unknown>> {
    const bookingId = this.extractBookingId(params);
    const amount = params.amount; // in tiyin

    if (!bookingId) {
      return this.errorResponse(requestId, PaymeError.ORDER_NOT_FOUND, 'Order not found');
    }

    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
    });

    if (!booking) {
      return this.errorResponse(requestId, PaymeError.ORDER_NOT_FOUND, 'Order (booking) not found');
    }

    // Check if booking is in a payable state
    if (booking.status === 'cancelled' || booking.status === 'no_show') {
      return this.errorResponse(
        requestId,
        PaymeError.UNABLE_TO_PERFORM,
        `Booking has status '${booking.status}'`,
      );
    }

    // Validate amount: amount should not exceed remaining balance
    const remaining = Number(booking.totalAmount) - Number(booking.paidAmount);
    if (amount > remaining) {
      return this.errorResponse(
        requestId,
        PaymeError.INVALID_AMOUNT,
        'Amount exceeds remaining balance',
      );
    }

    if (amount <= 0) {
      return this.errorResponse(
        requestId,
        PaymeError.INVALID_AMOUNT,
        'Amount must be positive',
      );
    }

    return this.successResponse(requestId, { allow: true });
  }

  // ── CreateTransaction ──────────────────────────────────────────────────────

  /**
   * Creates a Payme transaction. This reserves the payment but does not
   * actually perform it (money is not yet transferred).
   */
  private async createTransaction(
    requestId: number,
    params: Record<string, any>,
  ): Promise<Record<string, unknown>> {
    const transactionId = params.id;
    const bookingId = this.extractBookingId(params);
    const amount = params.amount;
    const time = params.time;

    // Check if transaction already exists
    const existing = this.transactions.get(transactionId);
    if (existing) {
      if (existing.state === 1) {
        // Return existing transaction
        return this.successResponse(requestId, {
          create_time: existing.createTime,
          transaction: existing.id,
          state: existing.state,
        });
      }
      return this.errorResponse(
        requestId,
        PaymeError.UNABLE_TO_PERFORM,
        'Transaction has already been processed',
      );
    }

    if (!bookingId) {
      return this.errorResponse(requestId, PaymeError.ORDER_NOT_FOUND, 'Order not found');
    }

    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
    });

    if (!booking) {
      return this.errorResponse(requestId, PaymeError.ORDER_NOT_FOUND, 'Order (booking) not found');
    }

    if (booking.status === 'cancelled' || booking.status === 'no_show') {
      return this.errorResponse(
        requestId,
        PaymeError.UNABLE_TO_PERFORM,
        `Booking has status '${booking.status}'`,
      );
    }

    // Check if already fully paid
    const remaining = Number(booking.totalAmount) - Number(booking.paidAmount);
    if (remaining <= 0) {
      return this.errorResponse(
        requestId,
        PaymeError.ORDER_ALREADY_PAID,
        'Order is already fully paid',
      );
    }

    if (amount > remaining || amount <= 0) {
      return this.errorResponse(requestId, PaymeError.INVALID_AMOUNT, 'Invalid amount');
    }

    // Create transaction record
    const transaction: PaymeTransaction = {
      id: transactionId,
      bookingId,
      amount,
      state: 1,
      createTime: time || Date.now(),
      performTime: 0,
      cancelTime: 0,
      reason: null,
    };

    this.transactions.set(transactionId, transaction);

    this.logger.log(
      `Payme CreateTransaction: txn=${transactionId}, booking=#${bookingId}, amount=${amount}`,
    );

    return this.successResponse(requestId, {
      create_time: transaction.createTime,
      transaction: transaction.id,
      state: transaction.state,
    });
  }

  // ── PerformTransaction ─────────────────────────────────────────────────────

  /**
   * Performs (completes) a previously created transaction.
   * This is where we actually create the Payment record.
   */
  private async performTransaction(
    requestId: number,
    params: Record<string, any>,
  ): Promise<Record<string, unknown>> {
    const transactionId = params.id;

    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      return this.errorResponse(
        requestId,
        PaymeError.TRANSACTION_NOT_FOUND,
        'Transaction not found',
      );
    }

    if (transaction.state === 2) {
      // Already performed - return success (idempotent)
      return this.successResponse(requestId, {
        transaction: transaction.id,
        perform_time: transaction.performTime,
        state: transaction.state,
      });
    }

    if (transaction.state !== 1) {
      return this.errorResponse(
        requestId,
        PaymeError.UNABLE_TO_PERFORM,
        'Transaction cannot be performed (cancelled or invalid state)',
      );
    }

    // Create the actual Payment record
    const payment = await this.paymentsService.createFromWebhook(
      transaction.bookingId,
      transaction.amount,
      'payme',
      `payme:${transactionId}`,
    );

    if (!payment) {
      return this.errorResponse(
        requestId,
        PaymeError.UNABLE_TO_PERFORM,
        'Failed to create payment',
      );
    }

    // Update transaction state
    transaction.state = 2;
    transaction.performTime = Date.now();
    this.transactions.set(transactionId, transaction);

    this.logger.log(
      `Payme PerformTransaction: txn=${transactionId}, payment=#${payment.id}`,
    );

    return this.successResponse(requestId, {
      transaction: transaction.id,
      perform_time: transaction.performTime,
      state: transaction.state,
    });
  }

  // ── CancelTransaction ──────────────────────────────────────────────────────

  /**
   * Cancels a Payme transaction.
   * If already performed (state=2), sets state to -2 (cancel after perform).
   * If only created (state=1), sets state to -1 (cancel before perform).
   */
  private async cancelTransaction(
    requestId: number,
    params: Record<string, any>,
  ): Promise<Record<string, unknown>> {
    const transactionId = params.id;
    const reason = params.reason;

    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      return this.errorResponse(
        requestId,
        PaymeError.TRANSACTION_NOT_FOUND,
        'Transaction not found',
      );
    }

    // Already cancelled
    if (transaction.state === -1 || transaction.state === -2) {
      return this.successResponse(requestId, {
        transaction: transaction.id,
        cancel_time: transaction.cancelTime,
        state: transaction.state,
      });
    }

    if (transaction.state === 1) {
      // Cancel before perform
      transaction.state = -1;
    } else if (transaction.state === 2) {
      // Cancel after perform (refund scenario)
      transaction.state = -2;

      // TODO: Handle refund logic here if needed
      // For now, we log the cancellation. A full refund flow would
      // reverse the payment and update booking.paidAmount.
      this.logger.warn(
        `Payme CancelTransaction after perform: txn=${transactionId}, booking=#${transaction.bookingId}. Refund may be needed.`,
      );
    }

    transaction.cancelTime = Date.now();
    transaction.reason = reason ?? null;
    this.transactions.set(transactionId, transaction);

    this.logger.log(
      `Payme CancelTransaction: txn=${transactionId}, state=${transaction.state}, reason=${reason}`,
    );

    return this.successResponse(requestId, {
      transaction: transaction.id,
      cancel_time: transaction.cancelTime,
      state: transaction.state,
    });
  }

  // ── CheckTransaction ───────────────────────────────────────────────────────

  /**
   * Returns the current state of a transaction.
   */
  private checkTransaction(
    requestId: number,
    params: Record<string, any>,
  ): Record<string, unknown> {
    const transactionId = params.id;

    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      return this.errorResponse(
        requestId,
        PaymeError.TRANSACTION_NOT_FOUND,
        'Transaction not found',
      );
    }

    return this.successResponse(requestId, {
      create_time: transaction.createTime,
      perform_time: transaction.performTime,
      cancel_time: transaction.cancelTime,
      transaction: transaction.id,
      state: transaction.state,
      reason: transaction.reason,
    });
  }

  // ── GetStatement ───────────────────────────────────────────────────────────

  /**
   * Returns a list of transactions for a given time range.
   */
  private getStatement(
    requestId: number,
    params: Record<string, any>,
  ): Record<string, unknown> {
    const from = params.from;
    const to = params.to;

    const transactions: Record<string, unknown>[] = [];
    for (const txn of this.transactions.values()) {
      if (txn.createTime >= from && txn.createTime <= to) {
        transactions.push({
          id: txn.id,
          time: txn.createTime,
          amount: txn.amount,
          account: { booking_id: txn.bookingId },
          create_time: txn.createTime,
          perform_time: txn.performTime,
          cancel_time: txn.cancelTime,
          transaction: txn.id,
          state: txn.state,
          reason: txn.reason,
        });
      }
    }

    return this.successResponse(requestId, { transactions });
  }

  // ── Auth & helpers ─────────────────────────────────────────────────────────

  /**
   * Verify Basic auth header against configured merchant credentials.
   * Expected format: "Basic base64(merchantId:secretKey)"
   */
  verifyAuth(authHeader: string | undefined): boolean {
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return false;
    }

    const encoded = authHeader.slice(6); // Remove "Basic "
    let decoded: string;

    try {
      decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    } catch {
      return false;
    }

    const expected = `${this.merchantId}:${this.secretKey}`;
    return decoded === expected;
  }

  /**
   * Extract booking_id from Payme account params.
   * Payme sends account as: { "account": { "booking_id": "123" } }
   */
  private extractBookingId(params: Record<string, any>): number | null {
    const account = params.account;
    if (!account) return null;

    const bookingId = Number(account.booking_id ?? account.order_id);
    if (isNaN(bookingId) || bookingId <= 0) return null;

    return bookingId;
  }

  /**
   * Build a JSON-RPC 2.0 success response.
   */
  private successResponse(
    requestId: number,
    result: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      jsonrpc: '2.0',
      id: requestId,
      result,
    };
  }

  /**
   * Build a JSON-RPC 2.0 error response.
   */
  private errorResponse(
    requestId: number,
    code: PaymeError,
    message: string,
  ): Record<string, unknown> {
    return {
      jsonrpc: '2.0',
      id: requestId,
      error: {
        code,
        message: { en: message, ru: message, uz: message },
      },
    };
  }
}
