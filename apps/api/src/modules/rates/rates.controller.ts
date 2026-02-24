import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
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
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { PropertyGuard } from '@/modules/auth/guards/property.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { RatesService } from './rates.service';
import { CreateRateDto } from './dto/create-rate.dto';
import { UpdateRateDto } from './dto/update-rate.dto';
import { RateQueryDto } from './dto/rate-query.dto';
import { CalculateRateDto } from './dto/calculate-rate.dto';

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
@ApiTags('Rates')
@UseGuards(JwtAuthGuard, PropertyGuard)
export class RatesController {
  constructor(private readonly ratesService: RatesService) {}

  // ── GET /v1/properties/:propertyId/rates ───────────────────────────────────

  @Get('properties/:propertyId/rates')
  @ApiOperation({ summary: 'List rates for a property' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiResponse({ status: 200, description: 'Paginated list of rates' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async listRates(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Query() query: RateQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    return this.ratesService.findAll(propertyId, query);
  }

  // ── POST /v1/rates ─────────────────────────────────────────────────────────

  @Post('rates')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Create a new rate' })
  @ApiResponse({ status: 201, description: 'Rate created successfully' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 409, description: 'RATE_CONFLICT' })
  async createRate(
    @Body() dto: CreateRateDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, dto.property_id);
    return this.ratesService.create(dto.property_id, dto);
  }

  // ── PUT /v1/rates/:id ──────────────────────────────────────────────────────

  @Put('rates/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Update a rate' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Rate updated successfully' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'RATE_NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'RATE_CONFLICT' })
  async updateRate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRateDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.ratesService.update(id, req.user.propertyId, dto);
  }

  // ── DELETE /v1/rates/:id ───────────────────────────────────────────────────

  @Delete('rates/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Soft-delete a rate (sets is_active=false)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 204, description: 'Rate deactivated' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'RATE_NOT_FOUND' })
  async deleteRate(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.ratesService.remove(id, req.user.propertyId);
  }

  // ── POST /v1/properties/:propertyId/rates/calculate ────────────────────────

  @Post('properties/:propertyId/rates/calculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Calculate price for a room stay using the rate priority system',
  })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiResponse({ status: 200, description: 'Price calculation result' })
  @ApiResponse({ status: 400, description: 'INVALID_DATE_RANGE' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'RATE_NOT_FOUND or NOT_FOUND' })
  @ApiResponse({ status: 422, description: 'RATE_NOT_APPLICABLE' })
  async calculateRate(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Body() dto: CalculateRateDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    return this.ratesService.calculate(
      propertyId,
      dto.room_id,
      dto.check_in,
      dto.check_out,
      dto.rate_id,
    );
  }

  // ── Private helpers ────────────────────────────────────────────────────────

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
