import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  Req,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { SardobaException, ErrorCode } from '@sardoba/shared';
import { AnalyticsService } from './analytics.service';
import { ExportService } from './export.service';
import { AnalyticsQueryDto, ExportQueryDto } from './dto/analytics-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PropertyGuard } from '../auth/guards/property.guard';

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

// ── Analytics Controller ──────────────────────────────────────────────────────

@Controller('v1/properties/:propertyId/analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // ── GET /v1/properties/:propertyId/analytics/summary ──────────────────

  @Get('summary')
  @ApiOperation({ summary: 'Get analytics summary with key metrics' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiResponse({ status: 200, description: 'Summary metrics' })
  @ApiResponse({ status: 400, description: 'INVALID_DATE_RANGE' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async getSummary(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Query() query: AnalyticsQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    return this.analyticsService.getSummary(
      propertyId,
      query.date_from,
      query.date_to,
      query.compare_from,
      query.compare_to,
    );
  }

  // ── GET /v1/properties/:propertyId/analytics/occupancy ────────────────

  @Get('occupancy')
  @ApiOperation({ summary: 'Get daily occupancy data' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiResponse({ status: 200, description: 'Daily occupancy rows' })
  @ApiResponse({ status: 400, description: 'INVALID_DATE_RANGE' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async getOccupancy(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Query() query: AnalyticsQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    return this.analyticsService.getOccupancy(
      propertyId,
      query.date_from,
      query.date_to,
    );
  }

  // ── GET /v1/properties/:propertyId/analytics/revenue ──────────────────

  @Get('revenue')
  @ApiOperation({ summary: 'Get monthly revenue breakdown' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiResponse({ status: 200, description: 'Monthly revenue rows' })
  @ApiResponse({ status: 400, description: 'INVALID_DATE_RANGE' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async getRevenue(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Query() query: AnalyticsQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    return this.analyticsService.getRevenue(
      propertyId,
      query.date_from,
      query.date_to,
    );
  }

  // ── GET /v1/properties/:propertyId/analytics/sources ──────────────────

  @Get('sources')
  @ApiOperation({ summary: 'Get booking source breakdown' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiResponse({ status: 200, description: 'Source breakdown rows' })
  @ApiResponse({ status: 400, description: 'INVALID_DATE_RANGE' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async getSources(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Query() query: AnalyticsQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    return this.analyticsService.getSources(
      propertyId,
      query.date_from,
      query.date_to,
    );
  }

  // ── GET /v1/properties/:propertyId/analytics/guests ───────────────────

  @Get('guests')
  @ApiOperation({ summary: 'Get guest statistics' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiResponse({ status: 200, description: 'Guest statistics' })
  @ApiResponse({ status: 400, description: 'INVALID_DATE_RANGE' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async getGuests(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Query() query: AnalyticsQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    return this.analyticsService.getGuestStats(
      propertyId,
      query.date_from,
      query.date_to,
    );
  }

  // ── GET /v1/properties/:propertyId/analytics/rooms ────────────────────

  @Get('rooms')
  @ApiOperation({ summary: 'Get per-room revenue ranking' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiResponse({ status: 200, description: 'Room stats rows' })
  @ApiResponse({ status: 400, description: 'INVALID_DATE_RANGE' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async getRooms(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Query() query: AnalyticsQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    return this.analyticsService.getRoomStats(
      propertyId,
      query.date_from,
      query.date_to,
    );
  }

  // ── Private helpers ───────────────────────────────────────────────────

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

// ── Reports Controller ────────────────────────────────────────────────────────

@Controller('v1/properties/:propertyId/reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Reports')
export class ReportsController {
  constructor(private readonly exportService: ExportService) {}

  // ── GET /v1/properties/:propertyId/reports/export ─────────────────────

  @Get('export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export analytics report as Excel file' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Excel file download',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {},
    },
  })
  @ApiResponse({ status: 400, description: 'INVALID_DATE_RANGE' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async exportReport(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Query() query: ExportQueryDto,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);

    // Generate a meaningful filename
    const filename = `report_${query.date_from}_${query.date_to}.xlsx`;

    const buffer = await this.exportService.generateExcel(
      propertyId,
      query.date_from,
      query.date_to,
      `Property #${propertyId}`,
    );

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  // ── Private helpers ───────────────────────────────────────────────────

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
