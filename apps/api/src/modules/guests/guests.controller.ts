import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { SardobaException, ErrorCode } from '@sardoba/shared';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { PropertyGuard } from '@/modules/auth/guards/property.guard';
import { GuestsService } from './guests.service';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';
import { GuestFilterDto } from './dto/guest-filter.dto';

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
@ApiTags('Guests')
@UseGuards(JwtAuthGuard, PropertyGuard)
export class GuestsController {
  constructor(private readonly guestsService: GuestsService) {}

  // ── GET /v1/properties/:propertyId/guests ───────────────────────────────────

  @Get('properties/:propertyId/guests')
  @ApiOperation({ summary: 'List guests for a property with pagination and search' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiResponse({ status: 200, description: 'Paginated list of guests' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async listGuests(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Query() query: GuestFilterDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    return this.guestsService.findAll(propertyId, query);
  }

  // ── POST /v1/guests ─────────────────────────────────────────────────────────

  @Post('guests')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new guest' })
  @ApiResponse({ status: 201, description: 'Guest created successfully' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 409, description: 'GUEST_DUPLICATE_PHONE' })
  async createGuest(
    @Body() dto: CreateGuestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.guestsService.create(req.user.propertyId, dto);
  }

  // ── GET /v1/guests/:id ──────────────────────────────────────────────────────

  @Get('guests/:id')
  @ApiOperation({ summary: 'Get guest profile with bookings history' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Guest profile with decrypted document and bookings' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 404, description: 'GUEST_NOT_FOUND' })
  async getGuest(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.guestsService.findOne(id, req.user.propertyId);
  }

  // ── PUT /v1/guests/:id ──────────────────────────────────────────────────────

  @Put('guests/:id')
  @ApiOperation({ summary: 'Update a guest' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Guest updated successfully' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 404, description: 'GUEST_NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'GUEST_DUPLICATE_PHONE' })
  async updateGuest(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGuestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.guestsService.update(id, req.user.propertyId, dto);
  }

  // ── GET /v1/properties/:propertyId/guests/search ────────────────────────────

  @Get('properties/:propertyId/guests/search')
  @ApiOperation({ summary: 'Autocomplete search for booking form' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiQuery({ name: 'q', required: true, description: 'Search query (name or phone)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max results (default 10)' })
  @ApiResponse({ status: 200, description: 'List of matching guests (id, first_name, last_name, phone)' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async searchGuests(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Query('q') q: string,
    @Query('limit') limit: string | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    const parsedLimit = limit ? Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50) : 10;
    return this.guestsService.search(propertyId, q || '', parsedLimit);
  }

  // ── GET /v1/properties/:propertyId/guests/export ────────────────────────────

  @Get('properties/:propertyId/guests/export')
  @ApiOperation({ summary: 'Export OVIR report as CSV' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiQuery({ name: 'date_from', required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'date_to', required: true, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'CSV file download' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR - missing date_from or date_to' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async exportOvir(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Query('date_from') dateFrom: string,
    @Query('date_to') dateTo: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);

    if (!dateFrom || !dateTo) {
      throw new SardobaException(
        ErrorCode.VALIDATION_ERROR,
        { date_from: dateFrom, date_to: dateTo },
        'date_from and date_to query parameters are required',
      );
    }

    if (dateFrom >= dateTo) {
      throw new SardobaException(
        ErrorCode.INVALID_DATE_RANGE,
        { date_from: dateFrom, date_to: dateTo },
        'date_from must be before date_to',
      );
    }

    const csv = await this.guestsService.exportOvir(propertyId, dateFrom, dateTo);
    const filename = `ovir_${dateFrom}_${dateTo}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

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
