import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  Req,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SardobaException, ErrorCode } from '@sardoba/shared';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { MiniSiteSettingsService } from './mini-site-settings.service';

interface AuthenticatedRequest {
  user: {
    sub: number;
    role: string;
    propertyId: number;
  };
}

@Controller('properties/:id/mini-site')
@UseGuards(JwtAuthGuard)
@ApiTags('Mini-Site Settings')
@ApiBearerAuth()
export class MiniSiteSettingsController {
  constructor(private readonly miniSiteSettingsService: MiniSiteSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get mini-site settings' })
  async getSettings(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user, id);
    return this.miniSiteSettingsService.getSettings(id);
  }

  @Put()
  @ApiOperation({ summary: 'Update mini-site settings' })
  async updateSettings(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    dto: {
      widget_enabled?: boolean;
      mini_site_enabled?: boolean;
      mini_site_config?: Record<string, unknown>;
    },
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user, id);
    return this.miniSiteSettingsService.updateSettings(id, dto);
  }

  @Post('slug')
  @ApiOperation({ summary: 'Set or change mini-site slug' })
  async updateSlug(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { slug: string },
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user, id);
    return this.miniSiteSettingsService.updateSlug(id, dto.slug);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get widget/mini-site analytics' })
  async getStats(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user, id);
    return this.miniSiteSettingsService.getStats(id);
  }

  private verifyPropertyAccess(
    user: { role: string; propertyId: number },
    requestedPropertyId: number,
  ): void {
    if (user.role === 'super_admin') return;
    if (user.propertyId !== requestedPropertyId) {
      throw new SardobaException(ErrorCode.FORBIDDEN, {
        reason: 'Access denied to this property',
      });
    }
  }
}
