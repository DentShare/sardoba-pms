import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { PublicBookingService } from './public-booking.service';
import { PublicBookingDto } from './dto/public-booking.dto';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { CalculatePriceDto } from './dto/calculate-price.dto';
import { TrackWidgetEventDto } from './dto/track-event.dto';
import { PublicValidatePromoDto } from './dto/public-validate-promo.dto';

/**
 * Public booking endpoints - NO authentication required.
 * All routes are marked with @Public() to skip JwtAuthGuard.
 *
 * Base path: /v1/book/:slug
 */
@Controller('book')
@ApiTags('Public Booking')
@Public()
export class PublicBookingController {
  constructor(private readonly publicBookingService: PublicBookingService) {}

  // ── GET /v1/book/:slug ────────────────────────────────────────────────────

  @Get(':slug')
  @ApiOperation({
    summary: 'Get hotel info for public booking page',
    description:
      'Returns property details, active rooms, photos, and available extras. ' +
      'No authentication required.',
  })
  @ApiParam({ name: 'slug', type: String, description: 'Hotel URL slug' })
  @ApiResponse({
    status: 200,
    description: 'Hotel info with rooms and extras',
  })
  @ApiResponse({ status: 404, description: 'Hotel not found or booking disabled' })
  async getHotel(@Param('slug') slug: string) {
    return this.publicBookingService.getHotelBySlug(slug);
  }

  // ── GET /v1/book/:slug/rooms?check_in=...&check_out=... ───────────────────

  @Get(':slug/rooms')
  @ApiOperation({
    summary: 'Get available rooms with prices for a date range',
    description:
      'Returns all rooms with availability status and calculated prices. ' +
      'No authentication required.',
  })
  @ApiParam({ name: 'slug', type: String, description: 'Hotel URL slug' })
  @ApiQuery({ name: 'check_in', type: String, description: 'Check-in date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'check_out', type: String, description: 'Check-out date (YYYY-MM-DD)' })
  @ApiResponse({
    status: 200,
    description: 'List of rooms with availability and prices',
  })
  @ApiResponse({ status: 400, description: 'Invalid date range' })
  @ApiResponse({ status: 404, description: 'Hotel not found or booking disabled' })
  async getAvailableRooms(
    @Param('slug') slug: string,
    @Query() query: CheckAvailabilityDto,
  ) {
    return this.publicBookingService.getAvailableRooms(
      slug,
      query.check_in,
      query.check_out,
    );
  }

  // ── POST /v1/book/:slug/calculate ─────────────────────────────────────────

  @Post(':slug/calculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Calculate total price with extras',
    description:
      'Returns detailed price breakdown including room rate and selected extras. ' +
      'No authentication required.',
  })
  @ApiParam({ name: 'slug', type: String, description: 'Hotel URL slug' })
  @ApiResponse({
    status: 200,
    description: 'Price breakdown with room, extras, and grand total',
  })
  @ApiResponse({ status: 400, description: 'Invalid date range' })
  @ApiResponse({ status: 404, description: 'Hotel, room, or extra not found' })
  async calculatePrice(
    @Param('slug') slug: string,
    @Body() dto: CalculatePriceDto,
  ) {
    return this.publicBookingService.calculatePrice(
      slug,
      dto.room_id,
      dto.check_in,
      dto.check_out,
      dto.adults,
      dto.extras,
    );
  }

  // ── POST /v1/book/:slug ──────────────────────────────────────────────────

  @Post(':slug')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a public booking (no auth)',
    description:
      'Creates a booking from the public booking page. Guest is found or created by phone. ' +
      'Booking source is set to "website". No authentication required.',
  })
  @ApiParam({ name: 'slug', type: String, description: 'Hotel URL slug' })
  @ApiResponse({ status: 201, description: 'Booking created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or invalid dates' })
  @ApiResponse({ status: 404, description: 'Hotel, room, or extra not found' })
  @ApiResponse({ status: 409, description: 'Room not available (overbooking)' })
  async createBooking(
    @Param('slug') slug: string,
    @Body() dto: PublicBookingDto,
  ) {
    return this.publicBookingService.createPublicBooking(slug, dto);
  }

  // ── GET /v1/book/:slug/confirmation/:bookingNumber ────────────────────────

  @Get(':slug/confirmation/:bookingNumber')
  @ApiOperation({
    summary: 'Get booking confirmation details',
    description:
      'Returns booking confirmation with property, room, and guest info. ' +
      'No authentication required.',
  })
  @ApiParam({ name: 'slug', type: String, description: 'Hotel URL slug' })
  @ApiParam({ name: 'bookingNumber', type: String, description: 'Booking number (e.g. BK-2025-0001)' })
  @ApiResponse({
    status: 200,
    description: 'Booking confirmation details',
  })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async getConfirmation(
    @Param('slug') slug: string,
    @Param('bookingNumber') bookingNumber: string,
  ) {
    return this.publicBookingService.getConfirmation(slug, bookingNumber);
  }

  // ── GET /v1/book/:slug/payment-info/:bookingNumber ──────────────────────

  @Get(':slug/payment-info/:bookingNumber')
  @ApiOperation({
    summary: 'Get payment methods and URLs for a booking',
    description:
      'Returns available online payment methods (Payme, Click) with redirect URLs. ' +
      'No authentication required.',
  })
  @ApiParam({ name: 'slug', type: String, description: 'Hotel URL slug' })
  @ApiParam({ name: 'bookingNumber', type: String, description: 'Booking number' })
  @ApiResponse({ status: 200, description: 'Payment methods and URLs' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async getPaymentInfo(
    @Param('slug') slug: string,
    @Param('bookingNumber') bookingNumber: string,
  ) {
    return this.publicBookingService.getPaymentInfo(slug, bookingNumber);
  }

  // ── POST /v1/book/:slug/validate-promo ──────────────────────────────────

  @Post(':slug/validate-promo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate a promo code for public booking',
    description:
      'Checks if a promo code is valid for the given booking parameters and returns ' +
      'the calculated discount. No authentication required.',
  })
  @ApiParam({ name: 'slug', type: String, description: 'Hotel URL slug' })
  @ApiResponse({
    status: 200,
    description: 'Validation result with discount amount',
  })
  @ApiResponse({ status: 404, description: 'Hotel not found or booking disabled' })
  async validatePromoCode(
    @Param('slug') slug: string,
    @Body() dto: PublicValidatePromoDto,
  ) {
    return this.publicBookingService.validatePromoCode(slug, dto);
  }

  // ── POST /v1/book/:slug/events ──────────────────────────────────────────

  @Post(':slug/events')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Track widget/mini-site event',
    description: 'Records analytics events from the booking widget or mini-site. No auth required.',
  })
  @ApiParam({ name: 'slug', type: String })
  async trackEvent(
    @Param('slug') slug: string,
    @Body() dto: TrackWidgetEventDto,
    @Req() req: Request,
  ) {
    await this.publicBookingService.trackWidgetEvent(slug, dto.event_type, dto.meta ?? {}, req);
  }
}
