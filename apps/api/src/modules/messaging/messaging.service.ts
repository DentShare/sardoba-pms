import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageTemplate } from '@/database/entities/message-template.entity';
import { NotificationTrigger } from '@/database/entities/notification-trigger.entity';
import { Campaign } from '@/database/entities/campaign.entity';
import { SentMessage } from '@/database/entities/sent-message.entity';
import { SardobaException, ErrorCode } from '@sardoba/shared';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { TemplateFilterDto } from './dto/template-filter.dto';
import { CreateTriggerDto } from './dto/create-trigger.dto';
import { UpdateTriggerDto } from './dto/update-trigger.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CampaignFilterDto } from './dto/campaign-filter.dto';
import { MessageFilterDto } from './dto/message-filter.dto';

@Injectable()
export class MessagingService {
  constructor(
    @InjectRepository(MessageTemplate)
    private readonly templateRepository: Repository<MessageTemplate>,
    @InjectRepository(NotificationTrigger)
    private readonly triggerRepository: Repository<NotificationTrigger>,
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    @InjectRepository(SentMessage)
    private readonly sentMessageRepository: Repository<SentMessage>,
  ) {}

  // ── Templates ──────────────────────────────────────────────────────────────

  async findAllTemplates(propertyId: number, filter: TemplateFilterDto) {
    const page = filter.page ?? 1;
    const perPage = filter.per_page ?? 20;
    const skip = (page - 1) * perPage;

    const qb = this.templateRepository
      .createQueryBuilder('t')
      .where('t.propertyId = :propertyId', { propertyId });

    if (filter.channel) {
      qb.andWhere('t.channel = :channel', { channel: filter.channel });
    }

    if (filter.language) {
      qb.andWhere('t.language = :language', { language: filter.language });
    }

    if (filter.is_active !== undefined) {
      qb.andWhere('t.isActive = :isActive', { isActive: filter.is_active });
    }

    if (filter.search) {
      qb.andWhere('(t.name ILIKE :search OR t.body ILIKE :search)', {
        search: `%${filter.search}%`,
      });
    }

    qb.orderBy('t.createdAt', 'DESC');

    const [templates, total] = await qb.skip(skip).take(perPage).getManyAndCount();

    return {
      data: templates.map((t) => this.templateToResponse(t)),
      meta: {
        total,
        page,
        per_page: perPage,
        last_page: Math.ceil(total / perPage) || 1,
      },
    };
  }

  async findOneTemplate(templateId: number): Promise<Record<string, unknown>> {
    const template = await this.templateRepository.findOne({
      where: { id: templateId },
    });

    if (!template) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'message_template',
        id: templateId,
      });
    }

    return this.templateToResponse(template);
  }

  async createTemplate(
    propertyId: number,
    dto: CreateTemplateDto,
  ): Promise<Record<string, unknown>> {
    const template = this.templateRepository.create({
      propertyId,
      name: dto.name,
      channel: dto.channel ?? 'sms',
      language: dto.language ?? 'ru',
      subject: dto.subject ?? null,
      body: dto.body,
      variables: dto.variables ?? [],
    });

    const saved = await this.templateRepository.save(template);
    return this.templateToResponse(saved);
  }

  async updateTemplate(
    templateId: number,
    dto: UpdateTemplateDto,
  ): Promise<Record<string, unknown>> {
    const template = await this.templateRepository.findOne({
      where: { id: templateId },
    });

    if (!template) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'message_template',
        id: templateId,
      });
    }

    if (dto.name !== undefined) template.name = dto.name;
    if (dto.channel !== undefined) template.channel = dto.channel;
    if (dto.language !== undefined) template.language = dto.language;
    if (dto.subject !== undefined) template.subject = dto.subject;
    if (dto.body !== undefined) template.body = dto.body;
    if (dto.variables !== undefined) template.variables = dto.variables;
    if (dto.is_active !== undefined) template.isActive = dto.is_active;

    const saved = await this.templateRepository.save(template);
    return this.templateToResponse(saved);
  }

  async deleteTemplate(templateId: number): Promise<void> {
    const template = await this.templateRepository.findOne({
      where: { id: templateId },
    });

    if (!template) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'message_template',
        id: templateId,
      });
    }

    await this.templateRepository.remove(template);
  }

  async verifyTemplateProperty(templateId: number, propertyId: number): Promise<MessageTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id: templateId },
    });

    if (!template) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'message_template',
        id: templateId,
      });
    }

    if (template.propertyId !== propertyId) {
      throw new SardobaException(ErrorCode.FORBIDDEN, {
        reason: 'Template does not belong to your property',
      });
    }

    return template;
  }

  // ── Triggers ───────────────────────────────────────────────────────────────

  async findAllTriggers(propertyId: number) {
    const triggers = await this.triggerRepository.find({
      where: { propertyId },
      relations: ['template'],
      order: { createdAt: 'DESC' },
    });

    return {
      data: triggers.map((t) => this.triggerToResponse(t)),
    };
  }

  async createTrigger(
    propertyId: number,
    dto: CreateTriggerDto,
  ): Promise<Record<string, unknown>> {
    const templateExists = await this.templateRepository.findOne({
      where: { id: dto.template_id, propertyId },
    });

    if (!templateExists) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'message_template',
        id: dto.template_id,
      });
    }

    const trigger = this.triggerRepository.create({
      propertyId,
      eventType: dto.event_type,
      templateId: dto.template_id,
      channel: dto.channel ?? 'sms',
      delayMinutes: dto.delay_minutes ?? 0,
    });

    const saved = await this.triggerRepository.save(trigger);
    return this.triggerToResponse(saved);
  }

  async updateTrigger(
    triggerId: number,
    dto: UpdateTriggerDto,
  ): Promise<Record<string, unknown>> {
    const trigger = await this.triggerRepository.findOne({
      where: { id: triggerId },
    });

    if (!trigger) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'notification_trigger',
        id: triggerId,
      });
    }

    if (dto.event_type !== undefined) trigger.eventType = dto.event_type;
    if (dto.template_id !== undefined) trigger.templateId = dto.template_id;
    if (dto.channel !== undefined) trigger.channel = dto.channel;
    if (dto.delay_minutes !== undefined) trigger.delayMinutes = dto.delay_minutes;
    if (dto.is_active !== undefined) trigger.isActive = dto.is_active;

    const saved = await this.triggerRepository.save(trigger);
    return this.triggerToResponse(saved);
  }

  async deleteTrigger(triggerId: number): Promise<void> {
    const trigger = await this.triggerRepository.findOne({
      where: { id: triggerId },
    });

    if (!trigger) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'notification_trigger',
        id: triggerId,
      });
    }

    await this.triggerRepository.remove(trigger);
  }

  async verifyTriggerProperty(triggerId: number, propertyId: number): Promise<NotificationTrigger> {
    const trigger = await this.triggerRepository.findOne({
      where: { id: triggerId },
    });

    if (!trigger) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'notification_trigger',
        id: triggerId,
      });
    }

    if (trigger.propertyId !== propertyId) {
      throw new SardobaException(ErrorCode.FORBIDDEN, {
        reason: 'Trigger does not belong to your property',
      });
    }

    return trigger;
  }

  // ── Campaigns ──────────────────────────────────────────────────────────────

  async findAllCampaigns(propertyId: number, filter: CampaignFilterDto) {
    const page = filter.page ?? 1;
    const perPage = filter.per_page ?? 20;
    const skip = (page - 1) * perPage;

    const qb = this.campaignRepository
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.template', 'template')
      .where('c.propertyId = :propertyId', { propertyId });

    if (filter.status) {
      qb.andWhere('c.status = :status', { status: filter.status });
    }

    if (filter.channel) {
      qb.andWhere('c.channel = :channel', { channel: filter.channel });
    }

    qb.orderBy('c.createdAt', 'DESC');

    const [campaigns, total] = await qb.skip(skip).take(perPage).getManyAndCount();

    return {
      data: campaigns.map((c) => this.campaignToResponse(c)),
      meta: {
        total,
        page,
        per_page: perPage,
        last_page: Math.ceil(total / perPage) || 1,
      },
    };
  }

  async findOneCampaign(campaignId: number): Promise<Record<string, unknown>> {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId },
      relations: ['template'],
    });

    if (!campaign) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'campaign',
        id: campaignId,
      });
    }

    return this.campaignToResponse(campaign);
  }

  async createCampaign(
    propertyId: number,
    dto: CreateCampaignDto,
    userId: number,
  ): Promise<Record<string, unknown>> {
    const templateExists = await this.templateRepository.findOne({
      where: { id: dto.template_id, propertyId },
    });

    if (!templateExists) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'message_template',
        id: dto.template_id,
      });
    }

    const campaign = this.campaignRepository.create({
      propertyId,
      name: dto.name,
      templateId: dto.template_id,
      channel: dto.channel ?? 'sms',
      segmentFilters: dto.segment_filters ?? {},
      status: 'draft',
      scheduledAt: dto.scheduled_at ? new Date(dto.scheduled_at) : null,
      createdBy: userId,
    });

    const saved = await this.campaignRepository.save(campaign);
    return this.campaignToResponse(saved);
  }

  async updateCampaign(
    campaignId: number,
    dto: UpdateCampaignDto,
  ): Promise<Record<string, unknown>> {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'campaign',
        id: campaignId,
      });
    }

    if (campaign.status !== 'draft') {
      throw new SardobaException(
        ErrorCode.VALIDATION_ERROR,
        { reason: 'Only draft campaigns can be updated', current_status: campaign.status },
        'Only draft campaigns can be updated',
      );
    }

    if (dto.name !== undefined) campaign.name = dto.name;
    if (dto.template_id !== undefined) campaign.templateId = dto.template_id;
    if (dto.channel !== undefined) campaign.channel = dto.channel;
    if (dto.segment_filters !== undefined) campaign.segmentFilters = dto.segment_filters;
    if (dto.status !== undefined) campaign.status = dto.status;
    if (dto.scheduled_at !== undefined) campaign.scheduledAt = new Date(dto.scheduled_at);

    const saved = await this.campaignRepository.save(campaign);
    return this.campaignToResponse(saved);
  }

  async startCampaign(campaignId: number): Promise<Record<string, unknown>> {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'campaign',
        id: campaignId,
      });
    }

    if (campaign.status !== 'draft') {
      throw new SardobaException(
        ErrorCode.VALIDATION_ERROR,
        { reason: 'Only draft campaigns can be started', current_status: campaign.status },
        'Only draft campaigns can be started',
      );
    }

    if (campaign.scheduledAt && campaign.scheduledAt > new Date()) {
      campaign.status = 'scheduled';
    } else {
      campaign.status = 'sending';
      campaign.startedAt = new Date();
    }

    const saved = await this.campaignRepository.save(campaign);
    return this.campaignToResponse(saved);
  }

  async cancelCampaign(campaignId: number): Promise<Record<string, unknown>> {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'campaign',
        id: campaignId,
      });
    }

    if (campaign.status === 'completed') {
      throw new SardobaException(
        ErrorCode.VALIDATION_ERROR,
        { reason: 'Completed campaigns cannot be cancelled' },
        'Completed campaigns cannot be cancelled',
      );
    }

    campaign.status = 'cancelled';
    const saved = await this.campaignRepository.save(campaign);
    return this.campaignToResponse(saved);
  }

  async verifyCampaignProperty(campaignId: number, propertyId: number): Promise<Campaign> {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'campaign',
        id: campaignId,
      });
    }

    if (campaign.propertyId !== propertyId) {
      throw new SardobaException(ErrorCode.FORBIDDEN, {
        reason: 'Campaign does not belong to your property',
      });
    }

    return campaign;
  }

  // ── Sent Messages ─────────────────────────────────────────────────────────

  async findAllMessages(propertyId: number, filter: MessageFilterDto) {
    const page = filter.page ?? 1;
    const perPage = filter.per_page ?? 20;
    const skip = (page - 1) * perPage;

    const qb = this.sentMessageRepository
      .createQueryBuilder('m')
      .where('m.propertyId = :propertyId', { propertyId });

    if (filter.status) {
      qb.andWhere('m.status = :status', { status: filter.status });
    }

    if (filter.channel) {
      qb.andWhere('m.channel = :channel', { channel: filter.channel });
    }

    if (filter.campaign_id) {
      qb.andWhere('m.campaignId = :campaignId', { campaignId: filter.campaign_id });
    }

    if (filter.template_id) {
      qb.andWhere('m.templateId = :templateId', { templateId: filter.template_id });
    }

    if (filter.date_from) {
      qb.andWhere('m.createdAt >= :dateFrom', { dateFrom: filter.date_from });
    }

    if (filter.date_to) {
      qb.andWhere('m.createdAt <= :dateTo', { dateTo: filter.date_to });
    }

    qb.orderBy('m.createdAt', 'DESC');

    const [messages, total] = await qb.skip(skip).take(perPage).getManyAndCount();

    return {
      data: messages.map((m) => this.messageToResponse(m)),
      meta: {
        total,
        page,
        per_page: perPage,
        last_page: Math.ceil(total / perPage) || 1,
      },
    };
  }

  async getMessagingStats(propertyId: number) {
    const byStatus = await this.sentMessageRepository
      .createQueryBuilder('m')
      .select('m.status', 'status')
      .addSelect('COUNT(*)::int', 'count')
      .where('m.propertyId = :propertyId', { propertyId })
      .groupBy('m.status')
      .getRawMany();

    const byChannel = await this.sentMessageRepository
      .createQueryBuilder('m')
      .select('m.channel', 'channel')
      .addSelect('COUNT(*)::int', 'count')
      .where('m.propertyId = :propertyId', { propertyId })
      .groupBy('m.channel')
      .getRawMany();

    const totalCost = await this.sentMessageRepository
      .createQueryBuilder('m')
      .select('COALESCE(SUM(m.cost), 0)', 'total_cost')
      .where('m.propertyId = :propertyId', { propertyId })
      .getRawOne();

    return {
      by_status: byStatus,
      by_channel: byChannel,
      total_cost: Number(totalCost?.total_cost ?? 0),
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private templateToResponse(template: MessageTemplate): Record<string, unknown> {
    return {
      id: template.id,
      property_id: template.propertyId,
      name: template.name,
      channel: template.channel,
      language: template.language,
      subject: template.subject,
      body: template.body,
      variables: template.variables,
      is_active: template.isActive,
      created_at: template.createdAt,
      updated_at: template.updatedAt,
    };
  }

  private triggerToResponse(trigger: NotificationTrigger): Record<string, unknown> {
    const response: Record<string, unknown> = {
      id: trigger.id,
      property_id: trigger.propertyId,
      event_type: trigger.eventType,
      template_id: trigger.templateId,
      channel: trigger.channel,
      delay_minutes: trigger.delayMinutes,
      is_active: trigger.isActive,
      created_at: trigger.createdAt,
      updated_at: trigger.updatedAt,
    };

    if (trigger.template) {
      response.template = this.templateToResponse(trigger.template);
    }

    return response;
  }

  private campaignToResponse(campaign: Campaign): Record<string, unknown> {
    const response: Record<string, unknown> = {
      id: campaign.id,
      property_id: campaign.propertyId,
      name: campaign.name,
      template_id: campaign.templateId,
      channel: campaign.channel,
      segment_filters: campaign.segmentFilters,
      status: campaign.status,
      scheduled_at: campaign.scheduledAt,
      started_at: campaign.startedAt,
      completed_at: campaign.completedAt,
      total_recipients: campaign.totalRecipients,
      sent_count: campaign.sentCount,
      delivered_count: campaign.deliveredCount,
      failed_count: campaign.failedCount,
      created_by: campaign.createdBy,
      created_at: campaign.createdAt,
      updated_at: campaign.updatedAt,
    };

    if (campaign.template) {
      response.template = this.templateToResponse(campaign.template);
    }

    return response;
  }

  private messageToResponse(message: SentMessage): Record<string, unknown> {
    return {
      id: message.id,
      property_id: message.propertyId,
      template_id: message.templateId,
      trigger_id: message.triggerId,
      campaign_id: message.campaignId,
      channel: message.channel,
      recipient: message.recipient,
      subject: message.subject,
      body: message.body,
      status: message.status,
      external_id: message.externalId,
      error_message: message.errorMessage,
      cost: message.cost ? Number(message.cost) : null,
      sent_at: message.sentAt,
      delivered_at: message.deliveredAt,
      created_at: message.createdAt,
    };
  }
}
