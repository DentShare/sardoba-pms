import {
  Controller,
  Get,
  Post,
  Patch,
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
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { PropertyGuard } from '@/modules/auth/guards/property.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { HolidayCalendarService } from './holiday-calendar.service';
import { CreateHolidayRuleDto } from './dto/create-holiday-rule.dto';
import { UpdateHolidayRuleDto } from './dto/update-holiday-rule.dto';

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

@Controller('calendar')
@ApiBearerAuth()
@ApiTags('Calendar')
@UseGuards(JwtAuthGuard, PropertyGuard)
export class HolidayCalendarController {
  constructor(
    private readonly holidayCalendarService: HolidayCalendarService,
  ) {}

  // ── GET /v1/calendar/holidays ─────────────────────────────────────────────

  @Get('holidays')
  @ApiOperation({ summary: 'List all holiday rules for the property' })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description: 'Filter by year (e.g. 2026)',
  })
  @ApiResponse({ status: 200, description: 'List of holiday rules' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  async listHolidays(
    @Req() req: AuthenticatedRequest,
    @Query('year') year?: string,
  ) {
    const parsedYear = year ? parseInt(year, 10) : undefined;
    const rules = await this.holidayCalendarService.findAll(
      req.user.propertyId,
      parsedYear,
    );
    return { data: rules };
  }

  // ── POST /v1/calendar/holidays ────────────────────────────────────────────

  @Post('holidays')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Create a new holiday rule' })
  @ApiResponse({ status: 201, description: 'Holiday rule created' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR or INVALID_DATE_RANGE' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async createHoliday(
    @Body() dto: CreateHolidayRuleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.holidayCalendarService.create(req.user.propertyId, dto);
  }

  // ── PATCH /v1/calendar/holidays/:id ───────────────────────────────────────

  @Patch('holidays/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Update a holiday rule' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Holiday rule updated' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR or INVALID_DATE_RANGE' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  async updateHoliday(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateHolidayRuleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.holidayCalendarService.update(req.user.propertyId, id, dto);
  }

  // ── DELETE /v1/calendar/holidays/:id ──────────────────────────────────────

  @Delete('holidays/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Delete a holiday rule' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 204, description: 'Holiday rule deleted' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  async deleteHoliday(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.holidayCalendarService.remove(req.user.propertyId, id);
  }

  // ── POST /v1/calendar/holidays/seed ───────────────────────────────────────

  @Post('holidays/seed')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({
    summary: 'Seed default Uzbekistan holidays for the current year',
    description:
      'Creates holiday rules from a built-in list of Uzbekistan holidays. ' +
      'Only works if no holiday rules exist for this property yet.',
  })
  @ApiResponse({ status: 200, description: 'Holidays seeded (or skipped if already exist)' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async seedHolidays(@Req() req: AuthenticatedRequest) {
    const currentYear = new Date().getFullYear();
    await this.holidayCalendarService.seedDefaultHolidays(
      req.user.propertyId,
      currentYear,
    );
    return { message: `Default holidays seeded for year ${currentYear}` };
  }
}
