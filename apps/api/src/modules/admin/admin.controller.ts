import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { AdminService } from './admin.service';
import {
  AdminPropertiesQueryDto,
  AdminBookingsQueryDto,
  AdminUsersQueryDto,
  AdminLogsQueryDto,
  UpdateUserStatusDto,
} from './dto/admin-query.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── PLATFORM STATS ──────────────────────────────────────────────────────────

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('stats/mrr-history')
  getMrrHistory() {
    return this.adminService.getMrrHistory();
  }

  // ─── PROPERTIES ───────────────────────────────────────────────────────────────

  @Get('properties')
  listProperties(@Query() query: AdminPropertiesQueryDto) {
    return this.adminService.listProperties(query);
  }

  @Get('properties/:id')
  getProperty(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getProperty(id);
  }

  // ─── BOOKINGS ─────────────────────────────────────────────────────────────────

  @Get('bookings')
  listBookings(@Query() query: AdminBookingsQueryDto) {
    return this.adminService.listBookings(query);
  }

  // ─── USERS ────────────────────────────────────────────────────────────────────

  @Get('users')
  listUsers(@Query() query: AdminUsersQueryDto) {
    return this.adminService.listUsers(query);
  }

  @Patch('users/:id/status')
  updateUserStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(id, dto.status === 'active');
  }

  // ─── ANALYTICS ────────────────────────────────────────────────────────────────

  @Get('analytics/overview')
  getAnalyticsOverview() {
    return this.adminService.getAnalyticsOverview();
  }

  // ─── LOGS ─────────────────────────────────────────────────────────────────────

  @Get('logs')
  listLogs(@Query() query: AdminLogsQueryDto) {
    return this.adminService.listLogs(query);
  }

  // ─── SYSTEM HEALTH ────────────────────────────────────────────────────────────

  @Get('system/health')
  getSystemHealth() {
    return this.adminService.getSystemHealth();
  }
}
