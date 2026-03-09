import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { PromoCodesService } from './promo-codes.service';
import { CreatePromoCodeDto } from './dto/create-promo-code.dto';
import { UpdatePromoCodeDto } from './dto/update-promo-code.dto';
import { ValidatePromoCodeDto } from './dto/validate-promo-code.dto';

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

@Controller('promo-codes')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiTags('Promo Codes')
export class PromoCodesController {
  constructor(private readonly promoCodesService: PromoCodesService) {}

  // ── GET /v1/promo-codes ─────────────────────────────────────────────────

  @Get()
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'List all promo codes for the property' })
  @ApiResponse({ status: 200, description: 'List of promo codes' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async findAll(@Req() req: AuthenticatedRequest) {
    return this.promoCodesService.findAll(req.user.propertyId);
  }

  // ── GET /v1/promo-codes/:id ─────────────────────────────────────────────

  @Get(':id')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Get a single promo code by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Promo code details' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.promoCodesService.findOne(req.user.propertyId, id);
  }

  // ── POST /v1/promo-codes ────────────────────────────────────────────────

  @Post()
  @Roles('owner')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new promo code' })
  @ApiResponse({ status: 201, description: 'Promo code created successfully' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 409, description: 'ALREADY_EXISTS' })
  async create(
    @Body() dto: CreatePromoCodeDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.promoCodesService.create(req.user.propertyId, dto);
  }

  // ── PATCH /v1/promo-codes/:id ───────────────────────────────────────────

  @Patch(':id')
  @Roles('owner')
  @ApiOperation({ summary: 'Update an existing promo code' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Promo code updated successfully' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'ALREADY_EXISTS' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePromoCodeDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.promoCodesService.update(req.user.propertyId, id, dto);
  }

  // ── DELETE /v1/promo-codes/:id ──────────────────────────────────────────

  @Delete(':id')
  @Roles('owner')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deactivate a promo code (soft delete)',
    description: 'Sets is_active=false. Does not physically remove to preserve booking references.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 204, description: 'Promo code deactivated' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.promoCodesService.remove(req.user.propertyId, id);
  }

  // ── POST /v1/promo-codes/validate ───────────────────────────────────────

  @Post('validate')
  @Roles('owner', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate a promo code',
    description: 'Checks if a promo code is valid and returns the calculated discount.',
  })
  @ApiResponse({ status: 200, description: 'Validation result with discount' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async validatePromoCode(
    @Body() dto: ValidatePromoCodeDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.promoCodesService.validate(req.user.propertyId, dto);
  }

  // ── GET /v1/promo-codes/:id/stats ───────────────────────────────────────

  @Get(':id/stats')
  @Roles('owner', 'admin')
  @ApiOperation({
    summary: 'Get promo code usage statistics',
    description: 'Returns used count and total discount amount from bookings.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Promo code statistics' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  async getStats(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.promoCodesService.getStats(req.user.propertyId, id);
  }
}
