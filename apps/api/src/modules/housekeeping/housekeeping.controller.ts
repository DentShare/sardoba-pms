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
import { HousekeepingService } from './housekeeping.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateRoomStatusDto } from './dto/update-room-status.dto';
import { TaskFilterDto } from './dto/task-filter.dto';

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
@ApiTags('Housekeeping')
export class HousekeepingController {
  constructor(private readonly housekeepingService: HousekeepingService) {}

  // ── GET /v1/properties/:propertyId/housekeeping/rooms ─────────────────────

  @Get('properties/:propertyId/housekeeping/rooms')
  @ApiOperation({ summary: 'Get room cleaning statuses grid' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiResponse({ status: 200, description: 'Room cleaning statuses list' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async getRoomStatuses(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    return this.housekeepingService.getRoomStatuses(propertyId);
  }

  // ── PUT /v1/properties/:propertyId/housekeeping/rooms/:roomId/status ──────

  @Put('properties/:propertyId/housekeeping/rooms/:roomId/status')
  @ApiOperation({ summary: 'Update a room cleaning status' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiParam({ name: 'roomId', type: Number })
  @ApiResponse({ status: 200, description: 'Room status updated' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  async updateRoomStatus(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Param('roomId', ParseIntPipe) roomId: number,
    @Body() dto: UpdateRoomStatusDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    return this.housekeepingService.updateRoomStatus(
      propertyId,
      roomId,
      dto.cleaning_status,
      req.user.sub,
    );
  }

  // ── GET /v1/properties/:propertyId/housekeeping/tasks ─────────────────────

  @Get('properties/:propertyId/housekeeping/tasks')
  @ApiOperation({ summary: 'List housekeeping tasks (filterable, paginated)' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiResponse({ status: 200, description: 'Paginated list of tasks' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async listTasks(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Query() filter: TaskFilterDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    return this.housekeepingService.findAllTasks(propertyId, filter);
  }

  // ── POST /v1/properties/:propertyId/housekeeping/tasks ────────────────────

  @Post('properties/:propertyId/housekeeping/tasks')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a cleaning task' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND - room or user not found' })
  async createTask(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Body() dto: CreateTaskDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    return this.housekeepingService.createTask(propertyId, dto);
  }

  // ── GET /v1/housekeeping/tasks/:taskId ────────────────────────────────────

  @Get('housekeeping/tasks/:taskId')
  @ApiOperation({ summary: 'Get a single cleaning task' })
  @ApiParam({ name: 'taskId', type: Number })
  @ApiResponse({ status: 200, description: 'Task details' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  async getTask(
    @Param('taskId', ParseIntPipe) taskId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.housekeepingService.verifyTaskProperty(taskId, req.user.propertyId);
    return this.housekeepingService.findOneTask(taskId);
  }

  // ── PUT /v1/housekeeping/tasks/:taskId ────────────────────────────────────

  @Put('housekeeping/tasks/:taskId')
  @ApiOperation({ summary: 'Update a cleaning task' })
  @ApiParam({ name: 'taskId', type: Number })
  @ApiResponse({ status: 200, description: 'Task updated successfully' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  async updateTask(
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() dto: UpdateTaskDto,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.housekeepingService.verifyTaskProperty(taskId, req.user.propertyId);
    return this.housekeepingService.updateTask(taskId, dto, req.user.sub);
  }

  // ── DELETE /v1/housekeeping/tasks/:taskId ──────────────────────────────────

  @Delete('housekeeping/tasks/:taskId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a cleaning task' })
  @ApiParam({ name: 'taskId', type: Number })
  @ApiResponse({ status: 204, description: 'Task deleted' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  async deleteTask(
    @Param('taskId', ParseIntPipe) taskId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.housekeepingService.verifyTaskProperty(taskId, req.user.propertyId);
    await this.housekeepingService.deleteTask(taskId);
  }

  // ── GET /v1/properties/:propertyId/housekeeping/stats ─────────────────────

  @Get('properties/:propertyId/housekeeping/stats')
  @ApiOperation({ summary: 'Get housekeeping dashboard statistics' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiResponse({ status: 200, description: 'Housekeeping stats by status' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async getStats(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    return this.housekeepingService.getHousekeepingStats(propertyId);
  }

  // ── POST /v1/properties/:propertyId/housekeeping/auto-tasks ───────────────

  @Post('properties/:propertyId/housekeeping/auto-tasks')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Auto-create checkout cleaning tasks for today' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiResponse({ status: 201, description: 'Checkout tasks created' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async autoCreateTasks(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    return this.housekeepingService.autoCreateTasksForCheckouts(propertyId);
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
