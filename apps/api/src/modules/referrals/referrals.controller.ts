import {
  Controller,
  Get,
  Post,
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
import { ReferralsService } from './referrals.service';
import { CreateReferralDto } from './dto/create-referral.dto';

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

@Controller('referrals')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiTags('Referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  // ── GET /v1/referrals ───────────────────────────────────────────────────────

  @Get()
  @Roles('owner', 'admin')
  @ApiOperation({
    summary: 'List all property referrals',
    description: 'Returns all referrals for the current property with referrer/referred guest details.',
  })
  @ApiResponse({ status: 200, description: 'List of referrals' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async findAll(@Req() req: AuthenticatedRequest) {
    return this.referralsService.getPropertyReferrals(req.user.propertyId);
  }

  // ── GET /v1/referrals/stats ─────────────────────────────────────────────────

  @Get('stats')
  @Roles('owner', 'admin')
  @ApiOperation({
    summary: 'Get referral statistics',
    description: 'Returns aggregate stats: total referrals, applied bonuses, total bonus value.',
  })
  @ApiResponse({ status: 200, description: 'Referral statistics' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async getStats(@Req() req: AuthenticatedRequest) {
    return this.referralsService.getStats(req.user.propertyId);
  }

  // ── POST /v1/referrals/generate/:guestId ────────────────────────────────────

  @Post('generate/:guestId')
  @Roles('owner', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate a referral code for a guest',
    description: 'Creates a unique referral code and link for a guest. Returns existing code if one already exists.',
  })
  @ApiParam({ name: 'guestId', type: Number })
  @ApiResponse({ status: 200, description: 'Referral code and link' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'Guest NOT_FOUND' })
  async generateCode(
    @Param('guestId', ParseIntPipe) guestId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.referralsService.generateCode(req.user.propertyId, guestId);
  }

  // ── GET /v1/referrals/guest/:guestId ────────────────────────────────────────

  @Get('guest/:guestId')
  @Roles('owner', 'admin')
  @ApiOperation({
    summary: 'List referrals by a specific guest',
    description: 'Returns all referrals where the specified guest is the referrer.',
  })
  @ApiParam({ name: 'guestId', type: Number })
  @ApiResponse({ status: 200, description: 'List of referrals by the guest' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async getGuestReferrals(
    @Param('guestId', ParseIntPipe) guestId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.referralsService.getGuestReferrals(
      req.user.propertyId,
      guestId,
    );
  }

  // ── POST /v1/referrals ──────────────────────────────────────────────────────

  @Post()
  @Roles('owner', 'admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a referral record',
    description: 'Creates a new referral record when a referred guest books.',
  })
  @ApiResponse({ status: 201, description: 'Referral created' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  async create(
    @Body() dto: CreateReferralDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.referralsService.createReferral(req.user.propertyId, dto);
  }

  // ── POST /v1/referrals/:id/apply-bonus ──────────────────────────────────────

  @Post(':id/apply-bonus')
  @Roles('owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Apply referral bonus',
    description: 'Marks the bonus as applied for the specified referral.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Bonus applied successfully' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'Referral NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'Bonus ALREADY_EXISTS (already applied)' })
  async applyBonus(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.referralsService.applyBonus(req.user.propertyId, id);
  }
}
