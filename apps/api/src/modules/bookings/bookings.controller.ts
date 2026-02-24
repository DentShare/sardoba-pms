import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
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
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { BookingFilterDto } from './dto/booking-filter.dto';
import { CalendarQueryDto } from './dto/calendar-query.dto';

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
@ApiTags('Bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  // ── GET /v1/properties/:propertyId/bookings ─────────────────────────────

  @Get('properties/:propertyId/bookings')
  @ApiOperation({ summary: 'List bookings for a property' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiResponse({ status: 200, description: 'Paginated list of bookings' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async listBookings(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Query() query: BookingFilterDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    return this.bookingsService.findAll(propertyId, query);
  }

  // ── POST /v1/bookings ──────────────────────────────────────────────────

  @Post('bookings')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiResponse({ status: 201, description: 'Booking created successfully' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR / CHECKOUT_BEFORE_CHECKIN' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND (room or guest)' })
  @ApiResponse({ status: 409, description: 'OVERBOOKING_DETECTED' })
  async createBooking(
    @Body() dto: CreateBookingDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, dto.property_id);
    return this.bookingsService.create(dto.property_id, req.user.sub, dto);
  }

  // ── GET /v1/bookings/:id ───────────────────────────────────────────────

  @Get('bookings/:id')
  @ApiOperation({ summary: 'Get booking details' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Booking details with room, guest, payments, history' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  async getBooking(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.bookingsService.findOne(id, req.user.propertyId);
  }

  // ── PATCH /v1/bookings/:id ─────────────────────────────────────────────

  @Patch('bookings/:id')
  @ApiOperation({ summary: 'Update a booking' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Booking updated successfully' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR / CHECKOUT_BEFORE_CHECKIN' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'OVERBOOKING_DETECTED' })
  @ApiResponse({ status: 422, description: 'BOOKING_CANCELLED (cannot modify)' })
  async updateBooking(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBookingDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.bookingsService.update(
      id,
      req.user.propertyId,
      req.user.sub,
      dto,
    );
  }

  // ── POST /v1/bookings/:id/cancel ───────────────────────────────────────

  @Post('bookings/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a booking' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Booking cancelled' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  @ApiResponse({ status: 422, description: 'BOOKING_CANCELLED (cannot cancel)' })
  async cancelBooking(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelBookingDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.bookingsService.cancel(
      id,
      req.user.propertyId,
      req.user.sub,
      dto,
    );
  }

  // ── POST /v1/bookings/:id/check-in ─────────────────────────────────────

  @Post('bookings/:id/check-in')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check in a guest (confirmed -> checked_in)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Guest checked in' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  @ApiResponse({ status: 422, description: 'BOOKING_CANCELLED (invalid status for check-in)' })
  async checkIn(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.bookingsService.checkIn(id, req.user.propertyId, req.user.sub);
  }

  // ── POST /v1/bookings/:id/check-out ────────────────────────────────────

  @Post('bookings/:id/check-out')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check out a guest (checked_in -> checked_out)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Guest checked out' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  @ApiResponse({ status: 422, description: 'BOOKING_CANCELLED (must be checked_in)' })
  async checkOut(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.bookingsService.checkOut(id, req.user.propertyId, req.user.sub);
  }

  // ── GET /v1/properties/:propertyId/calendar ─────────────────────────────

  @Get('properties/:propertyId/calendar')
  @ApiOperation({ summary: 'Get booking calendar for all rooms' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Calendar data with rooms, bookings, and blocks',
  })
  @ApiResponse({ status: 400, description: 'INVALID_DATE_RANGE' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async getCalendar(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Query() query: CalendarQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    return this.bookingsService.getCalendar(
      propertyId,
      query.date_from,
      query.date_to,
      query.room_type,
    );
  }

  // ── Private helpers ────────────────────────────────────────────────────

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
