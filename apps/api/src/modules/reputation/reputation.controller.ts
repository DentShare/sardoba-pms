import {
  Controller,
  Get,
  Post,
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
import { ReputationService } from './reputation.service';
import { UpsertScoreDto } from './dto/upsert-score.dto';

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

@Controller('reputation')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiTags('Reputation')
export class ReputationController {
  constructor(private readonly reputationService: ReputationService) {}

  // ── GET /v1/reputation ──────────────────────────────────────────────────────

  @Get()
  @Roles('owner', 'admin', 'viewer')
  @ApiOperation({
    summary: 'Get reputation overview',
    description: 'Returns all review scores for the property grouped by platform with weighted average.',
  })
  @ApiResponse({ status: 200, description: 'Reputation overview with scores and weighted average' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async getOverview(@Req() req: AuthenticatedRequest) {
    return this.reputationService.getOverview(req.user.propertyId);
  }

  // ── POST /v1/reputation/scores ──────────────────────────────────────────────

  @Post('scores')
  @Roles('owner', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Add or update a review score',
    description: 'Creates or updates a review score for a specific platform. Upserts by platform.',
  })
  @ApiResponse({ status: 200, description: 'Review score upserted successfully' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async upsertScore(
    @Body() dto: UpsertScoreDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.reputationService.upsertScore(req.user.propertyId, dto);
  }

  // ── DELETE /v1/reputation/scores/:id ────────────────────────────────────────

  @Delete('scores/:id')
  @Roles('owner', 'admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove a review score',
    description: 'Permanently deletes a review score entry.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 204, description: 'Review score removed' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  async removeScore(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.reputationService.removeScore(req.user.propertyId, id);
  }
}
