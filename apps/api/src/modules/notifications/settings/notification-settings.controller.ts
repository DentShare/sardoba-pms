import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { SardobaException, ErrorCode } from '@sardoba/shared';
import { NotificationSettingsService } from './notification-settings.service';
import { UpdateNotificationSettingsDto } from '../dto/update-settings.dto';

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

@Controller('v1')
@ApiBearerAuth()
@ApiTags('Notification Settings')
export class NotificationSettingsController {
  constructor(
    private readonly settingsService: NotificationSettingsService,
  ) {}

  // ── GET /v1/properties/:propertyId/notification-settings ─────────────────

  @Get('properties/:propertyId/notification-settings')
  @ApiOperation({ summary: 'Get notification settings for a property' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiResponse({ status: 200, description: 'Notification settings' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async getSettings(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    return this.settingsService.getSettings(propertyId);
  }

  // ── PUT /v1/properties/:propertyId/notification-settings ─────────────────

  @Put('properties/:propertyId/notification-settings')
  @ApiOperation({ summary: 'Update notification settings for a property' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiResponse({ status: 200, description: 'Updated notification settings' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async updateSettings(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Body() dto: UpdateNotificationSettingsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    return this.settingsService.updateSettings(propertyId, dto);
  }

  // ── POST /v1/properties/:propertyId/notification-settings/test ──────────

  @Post('properties/:propertyId/notification-settings/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send test notification to all active recipients' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiResponse({ status: 200, description: 'Test results per recipient' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async sendTestMessage(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    return this.settingsService.sendTestMessage(propertyId);
  }

  // ── POST /v1/auth/telegram/connect ──────────────────────────────────────

  @Post('auth/telegram/connect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate a one-time Telegram connection token' })
  @ApiResponse({
    status: 200,
    description: 'Returns token, deep link, and expiration time',
  })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND (property)' })
  async generateConnectToken(@Req() req: AuthenticatedRequest) {
    return this.settingsService.generateConnectToken(req.user.propertyId);
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private verifyPropertyAccess(
    userPropertyId: number,
    requestedPropertyId: number,
  ): void {
    if (userPropertyId !== requestedPropertyId) {
      throw new SardobaException(ErrorCode.FORBIDDEN, {
        reason: 'Access denied to this property',
      });
    }
  }
}
