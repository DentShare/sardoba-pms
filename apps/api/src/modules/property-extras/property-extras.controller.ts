import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
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
import { PropertyExtrasService } from './property-extras.service';
import { CreateExtraDto } from './dto/create-extra.dto';
import { UpdateExtraDto } from './dto/update-extra.dto';

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

@Controller('v1/properties/:propertyId/extras')
@ApiBearerAuth()
@ApiTags('Property Extras')
export class PropertyExtrasController {
  constructor(private readonly extrasService: PropertyExtrasService) {}

  // ── GET /v1/properties/:propertyId/extras ─────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List all extras for a property' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiResponse({ status: 200, description: 'List of extras' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async listExtras(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    return this.extrasService.findAll(propertyId);
  }

  // ── GET /v1/properties/:propertyId/extras/:id ────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Get a single extra by ID' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Extra details' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  async getExtra(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    return this.extrasService.findOne(id, propertyId);
  }

  // ── POST /v1/properties/:propertyId/extras ───────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new extra service' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiResponse({ status: 201, description: 'Extra created successfully' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async createExtra(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Body() dto: CreateExtraDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    return this.extrasService.create(propertyId, dto);
  }

  // ── PUT /v1/properties/:propertyId/extras/:id ────────────────────────────

  @Put(':id')
  @ApiOperation({ summary: 'Update an extra service' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Extra updated successfully' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  async updateExtra(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExtraDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    return this.extrasService.update(id, propertyId, dto);
  }

  // ── DELETE /v1/properties/:propertyId/extras/:id ─────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deactivate an extra (soft delete)',
    description: 'Sets is_active=false. Does not physically remove to preserve booking references.',
  })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 204, description: 'Extra deactivated' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  async removeExtra(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    await this.extrasService.remove(id, propertyId);
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
