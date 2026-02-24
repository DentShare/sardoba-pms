import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { Booking } from '@/database/entities/booking.entity';
import { formatMoney, formatDateShort } from '@sardoba/shared';

/**
 * WhatsApp Business API service for sending template messages
 * via the Meta Graph API.
 *
 * Requires WHATSAPP_API_URL, WHATSAPP_TOKEN, and WHATSAPP_PHONE_NUMBER_ID
 * environment variables to be configured.
 */
@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly apiUrl: string;
  private readonly token: string;
  private readonly phoneNumberId: string;

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.get<string>(
      'WHATSAPP_API_URL',
      'https://graph.facebook.com/v18.0',
    );
    this.token = this.configService.get<string>('WHATSAPP_TOKEN', '');
    this.phoneNumberId = this.configService.get<string>(
      'WHATSAPP_PHONE_NUMBER_ID',
      '',
    );
  }

  /**
   * Check if WhatsApp integration is configured.
   */
  isConfigured(): boolean {
    return !!(this.token && this.phoneNumberId);
  }

  /**
   * Send a booking confirmation message to a guest's phone number.
   *
   * Uses WhatsApp template messages which must be pre-approved
   * in the Meta Business Manager.
   *
   * @param phone - Guest phone number in international format (e.g. +998901234567)
   * @param booking - Booking entity with related data
   */
  async sendConfirmation(phone: string, booking: Booking): Promise<boolean> {
    if (!this.isConfigured()) {
      this.logger.warn(
        'WhatsApp is not configured. Skipping confirmation message.',
      );
      return false;
    }

    // Normalize phone number: remove spaces, dashes; ensure no leading +
    const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '').replace(/^\+/, '');

    const totalFormatted = formatMoney(Number(booking.totalAmount));
    const checkIn = formatDateShort(booking.checkIn);
    const checkOut = formatDateShort(booking.checkOut);

    const url = `${this.apiUrl}/${this.phoneNumberId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      to: normalizedPhone,
      type: 'template',
      template: {
        name: 'booking_confirmation',
        language: {
          code: 'ru',
        },
        components: [
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                text: booking.bookingNumber,
              },
              {
                type: 'text',
                text: checkIn,
              },
              {
                type: 'text',
                text: checkOut,
              },
              {
                type: 'text',
                text: String(booking.nights),
              },
              {
                type: 'text',
                text: totalFormatted,
              },
            ],
          },
        ],
      },
    };

    try {
      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      this.logger.log(
        `WhatsApp confirmation sent to ${normalizedPhone} for booking #${booking.bookingNumber} (messageId=${response.data?.messages?.[0]?.id ?? 'unknown'})`,
      );
      return true;
    } catch (error) {
      if (error instanceof AxiosError) {
        const errData = error.response?.data;
        this.logger.error(
          `WhatsApp API error [${error.response?.status}]: ${JSON.stringify(errData)} (phone=${normalizedPhone}, booking=#${booking.bookingNumber})`,
        );
      } else {
        this.logger.error(
          `Failed to send WhatsApp message to ${normalizedPhone}`,
          error,
        );
      }
      return false;
    }
  }

  /**
   * Send a plain text message (for testing or simple notifications).
   * Note: This requires an active conversation window (24h after user message)
   * or an approved template.
   */
  async sendTextMessage(phone: string, text: string): Promise<boolean> {
    if (!this.isConfigured()) {
      this.logger.warn('WhatsApp is not configured. Skipping text message.');
      return false;
    }

    const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '').replace(/^\+/, '');
    const url = `${this.apiUrl}/${this.phoneNumberId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      to: normalizedPhone,
      type: 'text',
      text: {
        body: text,
      },
    };

    try {
      await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      this.logger.log(`WhatsApp text message sent to ${normalizedPhone}`);
      return true;
    } catch (error) {
      if (error instanceof AxiosError) {
        this.logger.error(
          `WhatsApp API error [${error.response?.status}]: ${JSON.stringify(error.response?.data)}`,
        );
      } else {
        this.logger.error(
          `Failed to send WhatsApp text to ${normalizedPhone}`,
          error,
        );
      }
      return false;
    }
  }
}
