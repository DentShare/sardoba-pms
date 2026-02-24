import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Req,
  Headers,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { SardobaException, ErrorCode } from '@sardoba/shared';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PaymentsService } from './payments.service';
import { PaymeService } from './payme.service';
import { ClickService } from './click.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

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
@ApiTags('Payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly paymeService: PaymeService,
    private readonly clickService: ClickService,
  ) {}

  // ── GET /v1/bookings/:bookingId/payments ─────────────────────────────────

  @Get('bookings/:bookingId/payments')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List payments for a booking' })
  @ApiParam({ name: 'bookingId', type: Number })
  @ApiResponse({ status: 200, description: 'Payment list with balance info' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND (booking)' })
  async listPayments(
    @Param('bookingId', ParseIntPipe) bookingId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.paymentsService.findByBooking(bookingId, req.user.propertyId);
  }

  // ── POST /v1/bookings/:bookingId/payments ────────────────────────────────

  @Post('bookings/:bookingId/payments')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a payment to a booking' })
  @ApiParam({ name: 'bookingId', type: Number })
  @ApiResponse({ status: 201, description: 'Payment created' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND (booking)' })
  @ApiResponse({ status: 422, description: 'OVERPAYMENT / BOOKING_CANCELLED' })
  async createPayment(
    @Param('bookingId', ParseIntPipe) bookingId: number,
    @Body() dto: CreatePaymentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.paymentsService.create(
      bookingId,
      req.user.propertyId,
      req.user.sub,
      dto,
    );
  }

  // ── DELETE /v1/payments/:id ──────────────────────────────────────────────

  @Delete('payments/:id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Delete a payment (owner/admin only)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Payment deleted' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN (insufficient role)' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND (payment)' })
  async deletePayment(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.paymentsService.remove(id, req.user.sub);
  }

  // ── POST /v1/webhooks/payme ──────────────────────────────────────────────

  @Post('webhooks/payme')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiTags('Webhooks')
  @ApiOperation({ summary: 'Payme JSON-RPC 2.0 webhook (public, no JWT)' })
  @ApiResponse({ status: 200, description: 'JSON-RPC 2.0 response' })
  async paymeWebhook(
    @Body() body: any,
    @Headers('authorization') authHeader: string | undefined,
  ) {
    return this.paymeService.handleWebhook(body, authHeader);
  }

  // ── POST /v1/webhooks/click/prepare ──────────────────────────────────────

  @Post('webhooks/click/prepare')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiTags('Webhooks')
  @ApiOperation({ summary: 'Click prepare callback (public, no JWT)' })
  @ApiResponse({ status: 200, description: 'Click prepare response' })
  async clickPrepare(@Body() body: any) {
    return this.clickService.handlePrepare(body);
  }

  // ── POST /v1/webhooks/click/complete ─────────────────────────────────────

  @Post('webhooks/click/complete')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiTags('Webhooks')
  @ApiOperation({ summary: 'Click complete callback (public, no JWT)' })
  @ApiResponse({ status: 200, description: 'Click complete response' })
  async clickComplete(@Body() body: any) {
    return this.clickService.handleComplete(body);
  }
}
