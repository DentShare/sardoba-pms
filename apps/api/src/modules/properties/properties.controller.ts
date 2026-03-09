import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiQuery,
} from '@nestjs/swagger';
import { SardobaException, ErrorCode } from '@sardoba/shared';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { UploadService } from '@/modules/uploads/upload.service';
import { PropertiesService } from './properties.service';
import { UpdateFloorPlansDto } from './dto/update-floor-plans.dto';

interface AuthenticatedRequest {
  user: {
    sub: number;
    role: string;
    propertyId: number;
  };
}

@Controller('properties')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Properties')
export class PropertiesController {
  constructor(
    private readonly propertiesService: PropertiesService,
    private readonly uploadService: UploadService,
  ) {}

  // ── GET /v1/properties/booking-page ───────────────────────────────────────
  // Must be above /:id to avoid conflict

  @Get('booking-page')
  @ApiOperation({ summary: 'Get booking page configuration for current property' })
  @ApiResponse({ status: 200, description: 'Booking page config' })
  async getBookingPage(@Req() req: AuthenticatedRequest) {
    return this.propertiesService.getBookingPage(req.user.propertyId);
  }

  // ── PATCH /v1/properties/booking-page ─────────────────────────────────────

  @Patch('booking-page')
  @ApiOperation({ summary: 'Update booking page configuration' })
  @ApiResponse({ status: 200, description: 'Updated booking page config' })
  async updateBookingPage(
    @Body() dto: Record<string, unknown>,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.propertiesService.updateBookingPage(req.user.propertyId, dto);
  }

  // ── GET /v1/properties/floor-plans ────────────────────────────────────────

  @Get('floor-plans')
  @ApiOperation({ summary: 'Get floor plans for current property' })
  @ApiResponse({ status: 200, description: 'Floor plans config' })
  async getFloorPlans(@Req() req: AuthenticatedRequest) {
    return this.propertiesService.getFloorPlans(req.user.propertyId);
  }

  // ── PUT /v1/properties/floor-plans ────────────────────────────────────────

  @Put('floor-plans')
  @ApiOperation({ summary: 'Save floor plans for current property' })
  @ApiResponse({ status: 200, description: 'Saved floor plans config' })
  async updateFloorPlans(
    @Body() dto: UpdateFloorPlansDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.propertiesService.updateFloorPlans(req.user.propertyId, dto);
  }

  // ── GET /v1/properties/:id ────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Get property details' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Property details' })
  async getProperty(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, id);
    return this.propertiesService.findOne(id);
  }

  // ── PATCH /v1/properties/:id ──────────────────────────────────────────────

  @Patch(':id')
  @ApiOperation({ summary: 'Update property settings' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Updated property' })
  async updateProperty(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Record<string, unknown>,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, id);
    return this.propertiesService.update(id, dto);
  }

  // ── POST /v1/properties/:id/photos ────────────────────────────────────────

  @Post(':id/photos')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload a photo for a property (cover or gallery)' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({ name: 'type', required: false, enum: ['cover', 'gallery'], description: 'Photo type (default: gallery)' })
  @ApiResponse({ status: 200, description: 'Photo uploaded, returns URL' })
  async uploadPhoto(
    @Param('id', ParseIntPipe) id: number,
    @Query('type') type: 'cover' | 'gallery' = 'gallery',
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, id);
    const url = this.uploadService.saveImage(file);
    await this.propertiesService.addPhoto(id, url, type);
    return { url };
  }

  // ── DELETE /v1/properties/:id/photos ─────────────────────────────────────

  @Delete(':id/photos')
  @ApiOperation({ summary: 'Delete a property photo' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Photo removed' })
  async deletePhoto(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { url: string; type?: 'cover' | 'gallery' },
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, id);
    this.uploadService.deleteFile(body.url);
    await this.propertiesService.removePhoto(id, body.url, body.type ?? 'gallery');
    return { success: true };
  }

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
