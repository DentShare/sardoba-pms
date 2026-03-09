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
  Res,
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
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { Response } from 'express';
import { SardobaException, ErrorCode } from '@sardoba/shared';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { PropertyGuard } from '@/modules/auth/guards/property.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { UploadService } from '@/modules/uploads/upload.service';
import { GuestTipsService } from '@/modules/ai/guest-tips.service';
import { PassportOcrService } from '@/modules/ai/passport-ocr.service';
import { GuestsService } from './guests.service';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';
import { GuestFilterDto } from './dto/guest-filter.dto';
import { AddTagsDto } from './dto/add-tags.dto';
import { SetBlacklistDto } from './dto/set-blacklist.dto';

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

@Controller()
@ApiBearerAuth()
@ApiTags('Guests')
@UseGuards(JwtAuthGuard, PropertyGuard)
export class GuestsController {
  constructor(
    private readonly guestsService: GuestsService,
    private readonly uploadService: UploadService,
    private readonly guestTipsService: GuestTipsService,
    private readonly passportOcrService: PassportOcrService,
  ) {}

  // ── GET /v1/properties/:propertyId/guests ───────────────────────────────────

  @Get('properties/:propertyId/guests')
  @ApiOperation({ summary: 'List guests for a property with pagination and search' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiResponse({ status: 200, description: 'Paginated list of guests' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async listGuests(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Query() query: GuestFilterDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    return this.guestsService.findAll(propertyId, query);
  }

  // ── POST /v1/guests ─────────────────────────────────────────────────────────

  @Post('guests')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new guest' })
  @ApiResponse({ status: 201, description: 'Guest created successfully' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 409, description: 'GUEST_DUPLICATE_PHONE' })
  async createGuest(
    @Body() dto: CreateGuestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.guestsService.create(req.user.propertyId, dto);
  }

  // ── GET /v1/guests/:id ──────────────────────────────────────────────────────

  @Get('guests/:id')
  @ApiOperation({ summary: 'Get guest profile with bookings history' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Guest profile with decrypted document and bookings' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 404, description: 'GUEST_NOT_FOUND' })
  async getGuest(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.guestsService.findOne(id, req.user.propertyId);
  }

  // ── PUT /v1/guests/:id ──────────────────────────────────────────────────────

  @Put('guests/:id')
  @ApiOperation({ summary: 'Update a guest' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Guest updated successfully' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 404, description: 'GUEST_NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'GUEST_DUPLICATE_PHONE' })
  async updateGuest(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGuestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.guestsService.update(id, req.user.propertyId, dto);
  }

  // ── POST /v1/guests/:id/documents ─────────────────────────────────────────

  @Post('guests/:id/documents')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload a document photo/scan for a guest' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Document uploaded, returns URL' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR - invalid file' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 404, description: 'GUEST_NOT_FOUND' })
  async uploadDocument(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthenticatedRequest,
  ) {
    // Verify guest exists and belongs to this property
    await this.guestsService.findOne(id, req.user.propertyId);
    const url = this.uploadService.saveDocument(file);
    return { url };
  }

  // ── GET /v1/properties/:propertyId/guests/search ────────────────────────────

  @Get('properties/:propertyId/guests/search')
  @ApiOperation({ summary: 'Autocomplete search for booking form' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiQuery({ name: 'q', required: true, description: 'Search query (name or phone)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max results (default 10)' })
  @ApiResponse({ status: 200, description: 'List of matching guests (id, first_name, last_name, phone)' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async searchGuests(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Query('q') q: string,
    @Query('limit') limit: string | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    const parsedLimit = limit ? Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50) : 10;
    return this.guestsService.search(propertyId, q || '', parsedLimit);
  }

  // ── GET /v1/properties/:propertyId/guests/export ────────────────────────────

  @Get('properties/:propertyId/guests/export')
  @ApiOperation({ summary: 'Export OVIR report as CSV' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiQuery({ name: 'date_from', required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'date_to', required: true, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'CSV file download' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR - missing date_from or date_to' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async exportOvir(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Query('date_from') dateFrom: string,
    @Query('date_to') dateTo: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);

    if (!dateFrom || !dateTo) {
      throw new SardobaException(
        ErrorCode.VALIDATION_ERROR,
        { date_from: dateFrom, date_to: dateTo },
        'date_from and date_to query parameters are required',
      );
    }

    if (dateFrom >= dateTo) {
      throw new SardobaException(
        ErrorCode.INVALID_DATE_RANGE,
        { date_from: dateFrom, date_to: dateTo },
        'date_from must be before date_to',
      );
    }

    const csv = await this.guestsService.exportOvir(propertyId, dateFrom, dateTo);
    const filename = `ovir_${dateFrom}_${dateTo}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  // ── GET /v1/properties/:propertyId/guests/blacklist ─────────────────────────

  @Get('properties/:propertyId/guests/blacklist')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'List all blacklisted guests for a property' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiResponse({ status: 200, description: 'List of blacklisted guests' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async listBlacklisted(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    return this.guestsService.findBlacklisted(propertyId);
  }

  // ── POST /v1/guests/:id/tags ──────────────────────────────────────────────

  @Post('guests/:id/tags')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Add tags to a guest' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Tags added successfully' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'GUEST_NOT_FOUND' })
  async addTags(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddTagsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.guestsService.addTags(req.user.propertyId, id, dto.tags);
  }

  // ── DELETE /v1/guests/:id/tags/:tag ───────────────────────────────────────

  @Delete('guests/:id/tags/:tag')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Remove a specific tag from a guest' })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'tag', type: String, description: 'Tag name to remove' })
  @ApiResponse({ status: 200, description: 'Tag removed successfully' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'GUEST_NOT_FOUND' })
  async removeTag(
    @Param('id', ParseIntPipe) id: number,
    @Param('tag') tag: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.guestsService.removeTag(req.user.propertyId, id, tag);
  }

  // ── POST /v1/guests/:id/blacklist ─────────────────────────────────────────

  @Post('guests/:id/blacklist')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Add a guest to the blacklist' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Guest blacklisted successfully' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'GUEST_NOT_FOUND' })
  async setBlacklist(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetBlacklistDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.guestsService.setBlacklist(req.user.propertyId, id, dto.reason);
  }

  // ── DELETE /v1/guests/:id/blacklist ───────────────────────────────────────

  @Delete('guests/:id/blacklist')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Remove a guest from the blacklist' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Guest removed from blacklist' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'GUEST_NOT_FOUND' })
  async removeBlacklist(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.guestsService.removeBlacklist(req.user.propertyId, id);
  }

  // ── GET /v1/guests/:id/tips ──────────────────────────────────────────────────

  @Get('guests/:id/tips')
  @ApiOperation({ summary: 'Get AI-generated guest tips for staff' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Guest tips (AI-generated or fallback)' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 404, description: 'GUEST_NOT_FOUND' })
  async getGuestTips(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.guestTipsService.getTips(req.user.propertyId, id);
  }

  // ── POST /v1/guests/passport-ocr ───────────────────────────────────────────

  @Post('guests/passport-ocr')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Extract passport data from image via AI OCR' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Extracted passport data with confidence score' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR — no image or invalid format' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 503, description: 'AI_SERVICE_UNAVAILABLE' })
  async passportOcr(
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new SardobaException(
        ErrorCode.VALIDATION_ERROR,
        { image: 'Image file is required' },
        'No image file provided. Upload a passport photo as multipart/form-data with field name "image".',
      );
    }
    return this.passportOcrService.extractFromImage(file.buffer, file.mimetype);
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

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
