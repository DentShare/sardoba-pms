import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
import { timingSafeEqual } from 'crypto';
import { Booking } from '@/database/entities/booking.entity';
import { Payment } from '@/database/entities/payment.entity';
import { PaymeTransaction } from '@/database/entities/payme-transaction.entity';
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

  constructor(
    private readonly configService: ConfigService,
    private readonly paymentsService: PaymentsService,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(PaymeTransaction)
    private readonly transactionRepo: Repository<PaymeTransaction>,
    private readonly dataSource: DataSource,
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
    const existing = await this.transactionRepo.findOne({
      where: { transactionId },
    });
    if (existing) {
      if (existing.state === 1) {
        // Return existing transaction
        return this.successResponse(requestId, {
          create_time: Number(existing.createTime),
          transaction: existing.transactionId,
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

    // Create transaction record in DB
    const transaction = this.transactionRepo.create({
      transactionId,
      bookingId,
      amount,
      state: 1,
      createTime: time || Date.now(),
      performTime: null,
      cancelTime: null,
      cancelReason: null,
    });

    await this.transactionRepo.save(transaction);

    this.logger.log(
      `Payme CreateTransaction: txn=${transactionId}, booking=#${bookingId}, amount=${amount}`,
    );

    return this.successResponse(requestId, {
      create_time: Number(transaction.createTime),
      transaction: transaction.transactionId,
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

    const transaction = await this.transactionRepo.findOne({
      where: { transactionId },
    });
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
        transaction: transaction.transactionId,
        perform_time: Number(transaction.performTime),
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
      Number(transaction.amount),
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
    const performTime = Date.now();
    transaction.state = 2;
    transaction.performTime = performTime;
    await this.transactionRepo.save(transaction);

    this.logger.log(
      `Payme PerformTransaction: txn=${transactionId}, payment=#${payment.id}`,
    );

    return this.successResponse(requestId, {
      transaction: transaction.transactionId,
      perform_time: performTime,
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

    const transaction = await this.transactionRepo.findOne({
      where: { transactionId },
    });
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
        transaction: transaction.transactionId,
        cancel_time: Number(transaction.cancelTime),
        state: transaction.state,
      });
    }

    if (transaction.state === 1) {
      // Cancel before perform — no money was transferred
      transaction.state = -1;
    } else if (transaction.state === 2) {
      // Cancel after perform — refund: reverse the payment
      transaction.state = -2;

      await this.refundPayment(transactionId, transaction.bookingId, Number(transaction.amount));
    }

    const cancelTime = Date.now();
    transaction.cancelTime = cancelTime;
    transaction.cancelReason = reason ?? null;
    await this.transactionRepo.save(transaction);

    this.logger.log(
      `Payme CancelTransaction: txn=${transactionId}, state=${transaction.state}, reason=${reason}`,
    );

    return this.successResponse(requestId, {
      transaction: transaction.transactionId,
      cancel_time: cancelTime,
      state: transaction.state,
    });
  }

  // ── CheckTransaction ───────────────────────────────────────────────────────

  /**
   * Returns the current state of a transaction.
   */
  private async checkTransaction(
    requestId: number,
    params: Record<string, any>,
  ): Promise<Record<string, unknown>> {
    const transactionId = params.id;

    const transaction = await this.transactionRepo.findOne({
      where: { transactionId },
    });
    if (!transaction) {
      return this.errorResponse(
        requestId,
        PaymeError.TRANSACTION_NOT_FOUND,
        'Transaction not found',
      );
    }

    return this.successResponse(requestId, {
      create_time: Number(transaction.createTime),
      perform_time: Number(transaction.performTime ?? 0),
      cancel_time: Number(transaction.cancelTime ?? 0),
      transaction: transaction.transactionId,
      state: transaction.state,
      reason: transaction.cancelReason,
    });
  }

  // ── GetStatement ───────────────────────────────────────────────────────────

  /**
   * Returns a list of transactions for a given time range.
   */
  private async getStatement(
    requestId: number,
    params: Record<string, any>,
  ): Promise<Record<string, unknown>> {
    const from = params.from;
    const to = params.to;

    const dbTransactions = await this.transactionRepo.find({
      where: {
        createTime: Between(from, to),
      },
    });

    const transactions: Record<string, unknown>[] = dbTransactions.map((txn) => ({
      id: txn.transactionId,
      time: Number(txn.createTime),
      amount: Number(txn.amount),
      account: { booking_id: txn.bookingId },
      create_time: Number(txn.createTime),
      perform_time: Number(txn.performTime ?? 0),
      cancel_time: Number(txn.cancelTime ?? 0),
      transaction: txn.transactionId,
      state: txn.state,
      reason: txn.cancelReason,
    }));

    return this.successResponse(requestId, { transactions });
  }

  // ── Refund ───────────────────────────────────────────────────────────────────

  /**
   * Reverse a completed payment after Payme cancellation.
   * Finds the payment by reference, deletes it, and updates booking.paidAmount.
   * Wrapped in a database transaction for atomicity.
   */
  private async refundPayment(
    transactionId: string,
    bookingId: number,
    amount: number,
  ): Promise<void> {
    const reference = `payme:${transactionId}`;

    const payment = await this.paymentRepository.findOne({
      where: { bookingId, reference },
    });

    if (payment) {
      await this.dataSource.transaction(async (manager) => {
        // Remove the payment record
        await manager.remove(payment);

        // Decrease booking.paidAmount
        const booking = await manager.findOne(Booking, {
          where: { id: bookingId },
        });

        if (booking) {
          const updatedPaid = Math.max(0, Number(booking.paidAmount) - amount);
          await manager.update(Booking, bookingId, {
            paidAmount: updatedPaid,
          });
        }
      });

      this.logger.log(
        `Payme refund completed: txn=${transactionId}, booking=#${bookingId}, amount=${amount}`,
      );
    } else {
      this.logger.warn(
        `Payme refund: payment not found for ref=${reference}, booking=#${bookingId}. Manual review needed.`,
      );
    }
  }

  // ── Auth & helpers ─────────────────────────────────────────────────────────

  /**
   * Verify Basic auth header against configured merchant credentials.
   * Expected format: "Basic base64(merchantId:secretKey)"
   * Uses crypto.timingSafeEqual to prevent timing attacks.
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

    // Use timing-safe comparison to prevent timing attacks
    const decodedBuf = Buffer.from(decoded, 'utf-8');
    const expectedBuf = Buffer.from(expected, 'utf-8');

    if (decodedBuf.length !== expectedBuf.length) {
      return false;
    }

    return timingSafeEqual(decodedBuf, expectedBuf);
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
