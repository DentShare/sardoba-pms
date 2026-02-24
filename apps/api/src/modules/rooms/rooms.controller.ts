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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { SardobaException, ErrorCode } from '@sardoba/shared';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { RoomQueryDto } from './dto/room-query.dto';
import { CreateRoomBlockDto } from './dto/create-room-block.dto';
import { AvailabilityQueryDto } from './dto/availability-query.dto';

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
@ApiTags('Rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  // ── GET /v1/properties/:propertyId/rooms ──────────────────────────────────

  @Get('properties/:propertyId/rooms')
  @ApiOperation({ summary: 'List rooms for a property' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiResponse({ status: 200, description: 'Paginated list of rooms' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async listRooms(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Query() query: RoomQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    return this.roomsService.findAll(propertyId, query);
  }

  // ── POST /v1/properties/:propertyId/rooms ─────────────────────────────────

  @Post('properties/:propertyId/rooms')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new room' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiResponse({ status: 201, description: 'Room created successfully' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async createRoom(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Body() dto: CreateRoomDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    return this.roomsService.create(propertyId, dto);
  }

  // ── GET /v1/rooms/:id ─────────────────────────────────────────────────────

  @Get('rooms/:id')
  @ApiOperation({ summary: 'Get room details' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Room details' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  async getRoom(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.roomsService.verifyRoomProperty(id, req.user.propertyId);
    return this.roomsService.findOne(id);
  }

  // ── PUT /v1/rooms/:id ─────────────────────────────────────────────────────

  @Put('rooms/:id')
  @ApiOperation({ summary: 'Update a room' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Room updated successfully' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  async updateRoom(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoomDto,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.roomsService.verifyRoomProperty(id, req.user.propertyId);
    return this.roomsService.update(id, dto);
  }

  // ── DELETE /v1/rooms/:id ──────────────────────────────────────────────────

  @Delete('rooms/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a room (only if no active bookings)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 204, description: 'Room deleted' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  @ApiResponse({
    status: 400,
    description: 'VALIDATION_ERROR - room has active bookings',
  })
  async deleteRoom(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.roomsService.verifyRoomProperty(id, req.user.propertyId);
    await this.roomsService.remove(id);
  }

  // ── GET /v1/rooms/:id/availability?from=...&to=... ────────────────────────

  @Get('rooms/:id/availability')
  @ApiOperation({ summary: 'Check room availability for a date range' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Availability check result with blocked/booked dates',
  })
  @ApiResponse({ status: 400, description: 'INVALID_DATE_RANGE' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  async checkAvailability(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: AvailabilityQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.roomsService.verifyRoomProperty(id, req.user.propertyId);
    return this.roomsService.checkAvailability(id, query.from, query.to);
  }

  // ── POST /v1/rooms/:id/blocks ─────────────────────────────────────────────

  @Post('rooms/:id/blocks')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a room block (block dates)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 201, description: 'Room block created' })
  @ApiResponse({ status: 400, description: 'INVALID_DATE_RANGE' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  @ApiResponse({
    status: 409,
    description: 'ROOM_NOT_AVAILABLE - overlapping block exists',
  })
  async createBlock(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateRoomBlockDto,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.roomsService.verifyRoomProperty(id, req.user.propertyId);
    return this.roomsService.createBlock(id, dto, req.user.sub);
  }

  // ── DELETE /v1/rooms/:id/blocks/:blockId ──────────────────────────────────

  @Delete('rooms/:id/blocks/:blockId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a room block' })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'blockId', type: Number })
  @ApiResponse({ status: 204, description: 'Room block removed' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  async removeBlock(
    @Param('id', ParseIntPipe) id: number,
    @Param('blockId', ParseIntPipe) blockId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.roomsService.verifyRoomProperty(id, req.user.propertyId);
    await this.roomsService.removeBlock(id, blockId);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

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
