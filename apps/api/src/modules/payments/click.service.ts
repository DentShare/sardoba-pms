import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { Booking } from '@/database/entities/booking.entity';
import { PaymentsService } from './payments.service';

/**
 * Click error codes per Click Merchant API specification.
 */
enum ClickError {
  SUCCESS = 0,
  SIGN_CHECK_FAILED = -1,
  INVALID_AMOUNT = -2,
  ACTION_NOT_FOUND = -3,
  ALREADY_PAID = -4,
  ORDER_NOT_FOUND = -5,
  TRANSACTION_ERROR = -6,
  INVALID_ACTION = -7,
  CANCELLED = -9,
}

/**
 * Click "Prepare" request body (sent to prepare URL).
 */
interface ClickPrepareBody {
  click_trans_id: number;
  service_id: number;
  click_paydoc_id: number;
  merchant_trans_id: string; // our booking ID
  amount: number;           // in UZS (will convert to tiyin)
  action: number;           // 0 = prepare
  error: number;
  error_note: string;
  sign_time: string;
  sign_string: string;
  merchant_prepare_id?: number;
}

/**
 * Click "Complete" request body (sent to complete URL).
 */
interface ClickCompleteBody {
  click_trans_id: number;
  service_id: number;
  click_paydoc_id: number;
  merchant_trans_id: string; // our booking ID
  merchant_prepare_id: number;
  amount: number;            // in UZS
  action: number;            // 1 = complete
  error: number;
  error_note: string;
  sign_time: string;
  sign_string: string;
}

/**
 * In-memory store for Click prepare records.
 * In production, use a database table (click_transactions).
 */
interface ClickPrepareRecord {
  clickTransId: number;
  bookingId: number;
  amount: number; // in tiyin
  prepareId: number;
  completed: boolean;
  cancelled: boolean;
}

@Injectable()
export class ClickService {
  private readonly logger = new Logger(ClickService.name);
  private readonly merchantId: string;
  private readonly serviceId: string;
  private readonly secretKey: string;

  private nextPrepareId = 1;
  private readonly prepareRecords = new Map<number, ClickPrepareRecord>();

  constructor(
    private readonly configService: ConfigService,
    private readonly paymentsService: PaymentsService,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
  ) {
    this.merchantId = this.configService.get<string>('CLICK_MERCHANT_ID', '');
    this.serviceId = this.configService.get<string>('CLICK_SERVICE_ID', '');
    this.secretKey = this.configService.get<string>('CLICK_SECRET_KEY', '');
  }

  // ── handlePrepare ──────────────────────────────────────────────────────────

  /**
   * Handle Click "Prepare" callback.
   *
   * Click sends a POST when the user initiates payment.
   * We validate the signature, check the order, and return a prepare ID.
   *
   * Sign string for Prepare:
   *   MD5(click_trans_id + service_id + secret_key + merchant_trans_id + amount + action + sign_time)
   */
  async handlePrepare(body: ClickPrepareBody): Promise<Record<string, unknown>> {
    const {
      click_trans_id,
      service_id,
      click_paydoc_id,
      merchant_trans_id,
      amount,
      action,
      error: reqError,
      sign_time,
      sign_string,
    } = body;

    // Verify signature
    const expectedSign = this.generatePrepareSignature(
      click_trans_id,
      service_id,
      merchant_trans_id,
      amount,
      action,
      sign_time,
    );

    if (sign_string !== expectedSign) {
      this.logger.warn(`Click Prepare: signature mismatch for trans_id=${click_trans_id}`);
      return this.clickResponse(
        click_trans_id,
        merchant_trans_id,
        ClickError.SIGN_CHECK_FAILED,
        'Signature verification failed',
        0,
      );
    }

    // Validate action
    if (action !== 0) {
      return this.clickResponse(
        click_trans_id,
        merchant_trans_id,
        ClickError.INVALID_ACTION,
        'Invalid action for prepare',
        0,
      );
    }

    // If Click reports an error in the request itself
    if (reqError < 0) {
      return this.clickResponse(
        click_trans_id,
        merchant_trans_id,
        ClickError.TRANSACTION_ERROR,
        `Click reported error: ${reqError}`,
        0,
      );
    }

    // Validate booking
    const bookingId = Number(merchant_trans_id);
    if (isNaN(bookingId) || bookingId <= 0) {
      return this.clickResponse(
        click_trans_id,
        merchant_trans_id,
        ClickError.ORDER_NOT_FOUND,
        'Invalid booking ID',
        0,
      );
    }

    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
    });

    if (!booking) {
      return this.clickResponse(
        click_trans_id,
        merchant_trans_id,
        ClickError.ORDER_NOT_FOUND,
        'Booking not found',
        0,
      );
    }

    if (booking.status === 'cancelled' || booking.status === 'no_show') {
      return this.clickResponse(
        click_trans_id,
        merchant_trans_id,
        ClickError.CANCELLED,
        `Booking has status '${booking.status}'`,
        0,
      );
    }

    // Click sends amount in UZS (som), convert to tiyin for comparison
    const amountTiyin = Math.round(amount * 100);
    const remaining = Number(booking.totalAmount) - Number(booking.paidAmount);

    if (amountTiyin > remaining) {
      return this.clickResponse(
        click_trans_id,
        merchant_trans_id,
        ClickError.INVALID_AMOUNT,
        'Amount exceeds remaining balance',
        0,
      );
    }

    if (remaining <= 0) {
      return this.clickResponse(
        click_trans_id,
        merchant_trans_id,
        ClickError.ALREADY_PAID,
        'Order already fully paid',
        0,
      );
    }

    // Create prepare record
    const prepareId = this.nextPrepareId++;
    const record: ClickPrepareRecord = {
      clickTransId: click_trans_id,
      bookingId,
      amount: amountTiyin,
      prepareId,
      completed: false,
      cancelled: false,
    };
    this.prepareRecords.set(prepareId, record);

    this.logger.log(
      `Click Prepare: trans_id=${click_trans_id}, booking=#${bookingId}, amount=${amountTiyin} tiyin, prepareId=${prepareId}`,
    );

    return this.clickResponse(
      click_trans_id,
      merchant_trans_id,
      ClickError.SUCCESS,
      'Success',
      prepareId,
    );
  }

  // ── handleComplete ─────────────────────────────────────────────────────────

  /**
   * Handle Click "Complete" callback.
   *
   * Click sends this after the user confirms payment.
   * If error=0, we create the actual Payment record.
   *
   * Sign string for Complete:
   *   MD5(click_trans_id + service_id + secret_key + merchant_trans_id + merchant_prepare_id + amount + action + sign_time)
   */
  async handleComplete(body: ClickCompleteBody): Promise<Record<string, unknown>> {
    const {
      click_trans_id,
      service_id,
      click_paydoc_id,
      merchant_trans_id,
      merchant_prepare_id,
      amount,
      action,
      error: reqError,
      sign_time,
      sign_string,
    } = body;

    // Verify signature
    const expectedSign = this.generateCompleteSignature(
      click_trans_id,
      service_id,
      merchant_trans_id,
      merchant_prepare_id,
      amount,
      action,
      sign_time,
    );

    if (sign_string !== expectedSign) {
      this.logger.warn(`Click Complete: signature mismatch for trans_id=${click_trans_id}`);
      return this.clickResponse(
        click_trans_id,
        merchant_trans_id,
        ClickError.SIGN_CHECK_FAILED,
        'Signature verification failed',
        merchant_prepare_id,
      );
    }

    // Validate action
    if (action !== 1) {
      return this.clickResponse(
        click_trans_id,
        merchant_trans_id,
        ClickError.INVALID_ACTION,
        'Invalid action for complete',
        merchant_prepare_id,
      );
    }

    // Find prepare record
    const record = this.prepareRecords.get(merchant_prepare_id);
    if (!record) {
      return this.clickResponse(
        click_trans_id,
        merchant_trans_id,
        ClickError.TRANSACTION_ERROR,
        'Prepare record not found',
        merchant_prepare_id,
      );
    }

    if (record.completed) {
      return this.clickResponse(
        click_trans_id,
        merchant_trans_id,
        ClickError.ALREADY_PAID,
        'Transaction already completed',
        merchant_prepare_id,
      );
    }

    if (record.cancelled) {
      return this.clickResponse(
        click_trans_id,
        merchant_trans_id,
        ClickError.CANCELLED,
        'Transaction was cancelled',
        merchant_prepare_id,
      );
    }

    // If Click reports an error (user cancelled, etc.)
    if (reqError < 0) {
      record.cancelled = true;
      this.prepareRecords.set(merchant_prepare_id, record);

      this.logger.log(
        `Click Complete cancelled by Click: trans_id=${click_trans_id}, error=${reqError}`,
      );

      return this.clickResponse(
        click_trans_id,
        merchant_trans_id,
        ClickError.TRANSACTION_ERROR,
        `Click error: ${reqError}`,
        merchant_prepare_id,
      );
    }

    // Create actual payment
    const payment = await this.paymentsService.createFromWebhook(
      record.bookingId,
      record.amount,
      'click',
      `click:${click_trans_id}`,
    );

    if (!payment) {
      this.logger.error(
        `Click Complete: failed to create payment for booking #${record.bookingId}`,
      );
      return this.clickResponse(
        click_trans_id,
        merchant_trans_id,
        ClickError.TRANSACTION_ERROR,
        'Failed to create payment',
        merchant_prepare_id,
      );
    }

    record.completed = true;
    this.prepareRecords.set(merchant_prepare_id, record);

    this.logger.log(
      `Click Complete: trans_id=${click_trans_id}, payment=#${payment.id}, booking=#${record.bookingId}`,
    );

    return this.clickResponse(
      click_trans_id,
      merchant_trans_id,
      ClickError.SUCCESS,
      'Success',
      merchant_prepare_id,
    );
  }

  // ── Signature generation ───────────────────────────────────────────────────

  /**
   * Generate MD5 signature for Prepare request verification.
   */
  private generatePrepareSignature(
    clickTransId: number,
    serviceId: number,
    merchantTransId: string,
    amount: number,
    action: number,
    signTime: string,
  ): string {
    const data = `${clickTransId}${serviceId}${this.secretKey}${merchantTransId}${amount}${action}${signTime}`;
    return createHash('md5').update(data).digest('hex');
  }

  /**
   * Generate MD5 signature for Complete request verification.
   */
  private generateCompleteSignature(
    clickTransId: number,
    serviceId: number,
    merchantTransId: string,
    merchantPrepareId: number,
    amount: number,
    action: number,
    signTime: string,
  ): string {
    const data = `${clickTransId}${serviceId}${this.secretKey}${merchantTransId}${merchantPrepareId}${amount}${action}${signTime}`;
    return createHash('md5').update(data).digest('hex');
  }

  // ── Response helper ────────────────────────────────────────────────────────

  /**
   * Build a standard Click response object.
   */
  private clickResponse(
    clickTransId: number,
    merchantTransId: string,
    error: ClickError,
    errorNote: string,
    merchantPrepareId: number,
  ): Record<string, unknown> {
    return {
      click_trans_id: clickTransId,
      merchant_trans_id: merchantTransId,
      merchant_prepare_id: merchantPrepareId,
      error,
      error_note: errorNote,
    };
  }
}
