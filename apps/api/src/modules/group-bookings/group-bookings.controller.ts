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
import { SardobaException, ErrorCode } from '@sardoba/shared';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { GroupBookingsService } from './group-bookings.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupFilterDto } from './dto/group-filter.dto';
import { CreateAgencyDto } from './dto/create-agency.dto';
import { UpdateAgencyDto } from './dto/update-agency.dto';

interface AuthenticatedRequest {
  user: {
    sub: number;
    role: string;
    propertyId: number;
  };
}

@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Group Bookings')
export class GroupBookingsController {
  constructor(private readonly groupBookingsService: GroupBookingsService) {}

  // ── GET /v1/properties/:propertyId/groups ────────────────────────────────

  @Get('properties/:propertyId/groups')
  @ApiOperation({ summary: 'List group bookings for a property' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiResponse({ status: 200, description: 'Paginated list of group bookings' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async listGroups(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Query() filter: GroupFilterDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    return this.groupBookingsService.findAllGroups(propertyId, filter);
  }

  // ── POST /v1/properties/:propertyId/groups ───────────────────────────────

  @Post('properties/:propertyId/groups')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new group booking' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiResponse({ status: 201, description: 'Group booking created successfully' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR / INVALID_DATE_RANGE' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async createGroup(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Body() dto: CreateGroupDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    return this.groupBookingsService.createGroup(propertyId, dto, req.user.sub);
  }

  // ── GET /v1/groups/:id ───────────────────────────────────────────────────

  @Get('groups/:id')
  @ApiOperation({ summary: 'Get group booking details' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Group booking details' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  async getGroup(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.groupBookingsService.verifyGroupProperty(id, req.user.propertyId);
    return this.groupBookingsService.findOneGroup(id);
  }

  // ── PUT /v1/groups/:id ───────────────────────────────────────────────────

  @Put('groups/:id')
  @ApiOperation({ summary: 'Update a group booking' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Group booking updated successfully' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  async updateGroup(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGroupDto,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.groupBookingsService.verifyGroupProperty(id, req.user.propertyId);
    return this.groupBookingsService.updateGroup(id, dto);
  }

  // ── POST /v1/groups/:id/confirm ──────────────────────────────────────────

  @Post('groups/:id/confirm')
  @ApiOperation({ summary: 'Confirm a group booking' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Group booking confirmed' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  @ApiResponse({ status: 422, description: 'GROUP_INVALID_STATUS' })
  async confirmGroup(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.groupBookingsService.verifyGroupProperty(id, req.user.propertyId);
    return this.groupBookingsService.confirmGroup(id, req.user.sub);
  }

  // ── POST /v1/groups/:id/check-in ─────────────────────────────────────────

  @Post('groups/:id/check-in')
  @ApiOperation({ summary: 'Bulk check-in all rooms in a group' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Group checked in successfully' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  @ApiResponse({ status: 422, description: 'GROUP_INVALID_STATUS' })
  async checkInGroup(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.groupBookingsService.verifyGroupProperty(id, req.user.propertyId);
    return this.groupBookingsService.checkInGroup(id, req.user.sub);
  }

  // ── POST /v1/groups/:id/cancel ───────────────────────────────────────────

  @Post('groups/:id/cancel')
  @ApiOperation({ summary: 'Cancel a group booking and all rooms' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Group booking cancelled' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  @ApiResponse({ status: 422, description: 'GROUP_INVALID_STATUS' })
  async cancelGroup(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.groupBookingsService.verifyGroupProperty(id, req.user.propertyId);
    return this.groupBookingsService.cancelGroup(id, req.user.sub);
  }

  // ── GET /v1/properties/:propertyId/groups/stats ──────────────────────────

  @Get('properties/:propertyId/groups/stats')
  @ApiOperation({ summary: 'Get group booking statistics' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiResponse({ status: 200, description: 'Group booking statistics' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async getGroupStats(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    return this.groupBookingsService.getGroupStats(propertyId);
  }

  // ── GET /v1/properties/:propertyId/agencies ──────────────────────────────

  @Get('properties/:propertyId/agencies')
  @ApiOperation({ summary: 'List agencies for a property' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiResponse({ status: 200, description: 'List of agencies' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async listAgencies(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    return this.groupBookingsService.findAllAgencies(propertyId);
  }

  // ── POST /v1/properties/:propertyId/agencies ─────────────────────────────

  @Post('properties/:propertyId/agencies')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new agency' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiResponse({ status: 201, description: 'Agency created successfully' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async createAgency(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Body() dto: CreateAgencyDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    return this.groupBookingsService.createAgency(propertyId, dto);
  }

  // ── PUT /v1/agencies/:id ─────────────────────────────────────────────────

  @Put('agencies/:id')
  @ApiOperation({ summary: 'Update an agency' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Agency updated successfully' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  async updateAgency(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAgencyDto,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.groupBookingsService.verifyAgencyProperty(id, req.user.propertyId);
    return this.groupBookingsService.updateAgency(id, dto);
  }

  // ── DELETE /v1/agencies/:id ──────────────────────────────────────────────

  @Delete('agencies/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete an agency (set inactive)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 204, description: 'Agency deleted (soft)' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  async deleteAgency(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.groupBookingsService.verifyAgencyProperty(id, req.user.propertyId);
    await this.groupBookingsService.deleteAgency(id);
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
