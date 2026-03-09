import {
  Controller,
  Get,
  Post,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { TelegramService } from './telegram/telegram.service';
import { WhatsAppService } from './whatsapp/whatsapp.service';

/**
 * Request interface extending Express Request with JWT user payload.
 */
interface AuthenticatedRequest {
  user: {
    sub: number;
    role: string;
    propertyId: number;
  };
}

@Controller('notifications')
@ApiBearerAuth()
@ApiTags('Notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly telegramService: TelegramService,
    private readonly whatsAppService: WhatsAppService,
  ) {}

  // ── GET /v1/notifications/status ────────────────────────────────────────

  @Get('status')
  @ApiOperation({ summary: 'Get notification system status' })
  @ApiResponse({
    status: 200,
    description: 'Notification system status with channel readiness',
  })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  async getStatus(@Req() req: AuthenticatedRequest) {
    const telegramReady = this.telegramService.isReady();
    const whatsappReady = this.whatsAppService.isConfigured();

    return {
      telegram: {
        configured: telegramReady,
        status: telegramReady ? 'active' : 'not_configured',
      },
      whatsapp: {
        configured: whatsappReady,
        status: whatsappReady ? 'active' : 'not_configured',
      },
      propertyId: req.user.propertyId,
    };
  }

  // ── POST /v1/notifications/test ─────────────────────────────────────────

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a test notification to all active channels' })
  @ApiResponse({
    status: 200,
    description: 'Test notification results per channel',
  })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  async sendTestNotification(@Req() req: AuthenticatedRequest) {
    const propertyId = req.user.propertyId;

    const testMessage =
      `<b>Sardoba PMS - Тестовое уведомление</b>\n\n` +
      `Если вы видите это сообщение, уведомления работают корректно.\n` +
      `Property ID: ${propertyId}`;

    const telegramSent = await this.notificationsService.sendToTelegramRecipients(
      propertyId,
      testMessage,
    );

    return {
      telegram: {
        sent: telegramSent,
        message:
          telegramSent > 0
            ? `Отправлено ${telegramSent} получателям`
            : 'Нет активных Telegram-получателей',
      },
      whatsapp: {
        configured: this.whatsAppService.isConfigured(),
        message: this.whatsAppService.isConfigured()
          ? 'WhatsApp готов (тест отправляется только через Telegram)'
          : 'WhatsApp не настроен',
      },
    };
  }
}
