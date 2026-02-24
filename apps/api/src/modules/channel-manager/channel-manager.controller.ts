import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  Req,
  Headers,
  RawBodyRequest,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { SardobaException, ErrorCode } from '@sardoba/shared';
import { ChannelManagerService } from './channel-manager.service';
import { BookingComService } from './channels/booking-com.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { UpdateMappingsDto } from './dto/update-mappings.dto';

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
@ApiTags('Channel Manager')
export class ChannelManagerController {
  constructor(
    private readonly channelManagerService: ChannelManagerService,
    private readonly bookingComService: BookingComService,
  ) {}

  // ── GET /v1/properties/:propertyId/channels ─────────────────────────────

  @Get('properties/:propertyId/channels')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List channels for a property' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiResponse({ status: 200, description: 'List of channels' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async listChannels(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    return this.channelManagerService.findAll(propertyId);
  }

  // ── POST /v1/properties/:propertyId/channels ───────────────────────────

  @Post('properties/:propertyId/channels')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new channel' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiResponse({ status: 201, description: 'Channel created' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 409, description: 'ALREADY_EXISTS' })
  async createChannel(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Body() dto: CreateChannelDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    return this.channelManagerService.create(propertyId, dto);
  }

  // ── PUT /v1/channels/:id ────────────────────────────────────────────────

  @Put('channels/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a channel' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Channel updated' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 404, description: 'CHANNEL_NOT_FOUND' })
  async updateChannel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateChannelDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.channelManagerService.update(id, req.user.propertyId, dto);
  }

  // ── DELETE /v1/channels/:id ─────────────────────────────────────────────

  @Delete('channels/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate a channel (soft delete)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Channel deactivated' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 404, description: 'CHANNEL_NOT_FOUND' })
  async deactivateChannel(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.channelManagerService.remove(id, req.user.propertyId);
  }

  // ── POST /v1/channels/:id/sync ──────────────────────────────────────────

  @Post('channels/:id/sync')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trigger manual sync for a channel' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Sync job queued' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 404, description: 'CHANNEL_NOT_FOUND' })
  @ApiResponse({ status: 503, description: 'CHANNEL_NOT_CONFIGURED' })
  async forceSync(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.channelManagerService.forceSync(id, req.user.propertyId);
  }

  // ── GET /v1/channels/:id/logs ───────────────────────────────────────────

  @Get('channels/:id/logs')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get sync logs for a channel' })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Max number of logs to return (default 100)',
  })
  @ApiResponse({ status: 200, description: 'Sync log entries' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  async getLogs(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
  ) {
    return this.channelManagerService.getLogs(id, limit);
  }

  // ── GET /v1/channels/:id/mappings ───────────────────────────────────────

  @Get('channels/:id/mappings')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get room mappings for a channel' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Room mapping entries' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  async getMappings(@Param('id', ParseIntPipe) id: number) {
    return this.channelManagerService.getMappings(id);
  }

  // ── PUT /v1/channels/:id/mappings ───────────────────────────────────────

  @Put('channels/:id/mappings')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update room mappings for a channel' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Mappings updated' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 404, description: 'CHANNEL_NOT_FOUND / rooms not found' })
  async updateMappings(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMappingsDto,
  ) {
    return this.channelManagerService.updateMappings(id, dto.mappings);
  }

  // ── POST /v1/webhooks/booking-com ───────────────────────────────────────
  // PUBLIC endpoint — no JWT required. Secured via HMAC signature.

  @Post('webhooks/booking-com')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Booking.com webhook endpoint (public, HMAC-secured)',
  })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  @ApiResponse({ status: 401, description: 'WEBHOOK_SIGNATURE_INVALID' })
  @ApiResponse({ status: 404, description: 'CHANNEL_NOT_FOUND' })
  @ApiResponse({ status: 502, description: 'CHANNEL_SYNC_FAILED' })
  async bookingComWebhook(
    @Body() body: any,
    @Headers('x-booking-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    if (!signature) {
      throw new SardobaException(
        ErrorCode.WEBHOOK_SIGNATURE_INVALID,
        {},
        'Missing X-Booking-Signature header',
      );
    }

    // Use raw body for signature verification
    const rawBody = req.rawBody ?? JSON.stringify(body);

    return this.bookingComService.processWebhook(body, rawBody, signature);
  }

  // ── Private helpers ─────────────────────────────────────────────────────

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
