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
import { MessagingService } from './messaging.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { TemplateFilterDto } from './dto/template-filter.dto';
import { CreateTriggerDto } from './dto/create-trigger.dto';
import { UpdateTriggerDto } from './dto/update-trigger.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CampaignFilterDto } from './dto/campaign-filter.dto';
import { MessageFilterDto } from './dto/message-filter.dto';

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
@ApiTags('Messaging')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  // ── Templates ──────────────────────────────────────────────────────────────

  // ── GET /v1/properties/:propertyId/messaging/templates ─────────────────────

  @Get('properties/:propertyId/messaging/templates')
  @ApiOperation({ summary: 'List message templates for a property' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiResponse({ status: 200, description: 'Paginated list of templates' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async listTemplates(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Query() query: TemplateFilterDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    return this.messagingService.findAllTemplates(propertyId, query);
  }

  // ── POST /v1/properties/:propertyId/messaging/templates ────────────────────

  @Post('properties/:propertyId/messaging/templates')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new message template' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async createTemplate(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Body() dto: CreateTemplateDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    return this.messagingService.createTemplate(propertyId, dto);
  }

  // ── GET /v1/messaging/templates/:id ────────────────────────────────────────

  @Get('messaging/templates/:id')
  @ApiOperation({ summary: 'Get template details' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Template details' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  async getTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.messagingService.verifyTemplateProperty(id, req.user.propertyId);
    return this.messagingService.findOneTemplate(id);
  }

  // ── PUT /v1/messaging/templates/:id ────────────────────────────────────────

  @Put('messaging/templates/:id')
  @ApiOperation({ summary: 'Update a message template' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Template updated successfully' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  async updateTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTemplateDto,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.messagingService.verifyTemplateProperty(id, req.user.propertyId);
    return this.messagingService.updateTemplate(id, dto);
  }

  // ── DELETE /v1/messaging/templates/:id ─────────────────────────────────────

  @Delete('messaging/templates/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a message template' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 204, description: 'Template deleted' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  async deleteTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.messagingService.verifyTemplateProperty(id, req.user.propertyId);
    await this.messagingService.deleteTemplate(id);
  }

  // ── Triggers ───────────────────────────────────────────────────────────────

  // ── GET /v1/properties/:propertyId/messaging/triggers ──────────────────────

  @Get('properties/:propertyId/messaging/triggers')
  @ApiOperation({ summary: 'List notification triggers for a property' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiResponse({ status: 200, description: 'List of triggers with template info' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async listTriggers(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    return this.messagingService.findAllTriggers(propertyId);
  }

  // ── POST /v1/properties/:propertyId/messaging/triggers ─────────────────────

  @Post('properties/:propertyId/messaging/triggers')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a notification trigger' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiResponse({ status: 201, description: 'Trigger created successfully' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async createTrigger(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Body() dto: CreateTriggerDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    return this.messagingService.createTrigger(propertyId, dto);
  }

  // ── PUT /v1/messaging/triggers/:id ─────────────────────────────────────────

  @Put('messaging/triggers/:id')
  @ApiOperation({ summary: 'Update a notification trigger' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Trigger updated successfully' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  async updateTrigger(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTriggerDto,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.messagingService.verifyTriggerProperty(id, req.user.propertyId);
    return this.messagingService.updateTrigger(id, dto);
  }

  // ── DELETE /v1/messaging/triggers/:id ──────────────────────────────────────

  @Delete('messaging/triggers/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a notification trigger' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 204, description: 'Trigger deleted' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  async deleteTrigger(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.messagingService.verifyTriggerProperty(id, req.user.propertyId);
    await this.messagingService.deleteTrigger(id);
  }

  // ── Campaigns ──────────────────────────────────────────────────────────────

  // ── GET /v1/properties/:propertyId/messaging/campaigns ─────────────────────

  @Get('properties/:propertyId/messaging/campaigns')
  @ApiOperation({ summary: 'List campaigns for a property' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiResponse({ status: 200, description: 'Paginated list of campaigns' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async listCampaigns(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Query() query: CampaignFilterDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    return this.messagingService.findAllCampaigns(propertyId, query);
  }

  // ── POST /v1/properties/:propertyId/messaging/campaigns ────────────────────

  @Post('properties/:propertyId/messaging/campaigns')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new campaign' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiResponse({ status: 201, description: 'Campaign created successfully' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async createCampaign(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Body() dto: CreateCampaignDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    return this.messagingService.createCampaign(propertyId, dto, req.user.sub);
  }

  // ── GET /v1/messaging/campaigns/:id ────────────────────────────────────────

  @Get('messaging/campaigns/:id')
  @ApiOperation({ summary: 'Get campaign details' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Campaign details with template info' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  async getCampaign(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.messagingService.verifyCampaignProperty(id, req.user.propertyId);
    return this.messagingService.findOneCampaign(id);
  }

  // ── PUT /v1/messaging/campaigns/:id ────────────────────────────────────────

  @Put('messaging/campaigns/:id')
  @ApiOperation({ summary: 'Update a campaign (only if draft)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Campaign updated successfully' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  async updateCampaign(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCampaignDto,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.messagingService.verifyCampaignProperty(id, req.user.propertyId);
    return this.messagingService.updateCampaign(id, dto);
  }

  // ── POST /v1/messaging/campaigns/:id/start ─────────────────────────────────

  @Post('messaging/campaigns/:id/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start or schedule a campaign' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Campaign started/scheduled' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR - campaign not in draft status' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  async startCampaign(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.messagingService.verifyCampaignProperty(id, req.user.propertyId);
    return this.messagingService.startCampaign(id);
  }

  // ── POST /v1/messaging/campaigns/:id/cancel ────────────────────────────────

  @Post('messaging/campaigns/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a campaign' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Campaign cancelled' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR - campaign already completed' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  async cancelCampaign(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.messagingService.verifyCampaignProperty(id, req.user.propertyId);
    return this.messagingService.cancelCampaign(id);
  }

  // ── Messages & Stats ──────────────────────────────────────────────────────

  // ── GET /v1/properties/:propertyId/messaging/messages ──────────────────────

  @Get('properties/:propertyId/messaging/messages')
  @ApiOperation({ summary: 'List sent messages for a property' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiResponse({ status: 200, description: 'Paginated list of sent messages' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async listMessages(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Query() query: MessageFilterDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    return this.messagingService.findAllMessages(propertyId, query);
  }

  // ── GET /v1/properties/:propertyId/messaging/stats ─────────────────────────

  @Get('properties/:propertyId/messaging/stats')
  @ApiOperation({ summary: 'Get messaging statistics for a property' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiResponse({ status: 200, description: 'Messaging statistics by status and channel' })
  @ApiResponse({ status: 401, description: 'AUTH_REQUIRED' })
  @ApiResponse({ status: 403, description: 'FORBIDDEN' })
  async getStats(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    this.verifyPropertyAccess(req.user.propertyId, propertyId);
    return this.messagingService.getMessagingStats(propertyId);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

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
