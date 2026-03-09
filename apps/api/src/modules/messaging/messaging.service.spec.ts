import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessagingService } from './messaging.service';
import { MessageTemplate } from '@/database/entities/message-template.entity';
import { NotificationTrigger } from '@/database/entities/notification-trigger.entity';
import { Campaign } from '@/database/entities/campaign.entity';
import { SentMessage } from '@/database/entities/sent-message.entity';
import { SardobaException, ErrorCode } from '@sardoba/shared';

// ── Helpers ─────────────────────────────────────────────────────────────────

const NOW = new Date('2026-02-27T12:00:00Z');

function createMockTemplate(
  overrides: Partial<MessageTemplate> = {},
): MessageTemplate {
  return {
    id: 1,
    propertyId: 42,
    name: 'Booking Confirmation',
    channel: 'sms',
    language: 'ru',
    subject: null,
    body: 'Dear {{guest_name}}, your booking #{{booking_id}} is confirmed.',
    variables: ['guest_name', 'booking_id'],
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
    property: {} as any,
    ...overrides,
  } as MessageTemplate;
}

function createMockTrigger(
  overrides: Partial<NotificationTrigger> = {},
): NotificationTrigger {
  return {
    id: 1,
    propertyId: 42,
    eventType: 'booking_confirmed',
    templateId: 1,
    channel: 'sms',
    delayMinutes: 0,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
    property: {} as any,
    template: undefined as any,
    ...overrides,
  } as NotificationTrigger;
}

function createMockCampaign(
  overrides: Partial<Campaign> = {},
): Campaign {
  return {
    id: 1,
    propertyId: 42,
    name: 'Summer Promotion',
    templateId: 1,
    channel: 'sms',
    segmentFilters: {},
    status: 'draft',
    scheduledAt: null,
    startedAt: null,
    completedAt: null,
    totalRecipients: 0,
    sentCount: 0,
    deliveredCount: 0,
    failedCount: 0,
    createdBy: 1,
    createdAt: NOW,
    updatedAt: NOW,
    property: {} as any,
    template: undefined as any,
    ...overrides,
  } as Campaign;
}

function createMockSentMessage(
  overrides: Partial<SentMessage> = {},
): SentMessage {
  return {
    id: 1,
    propertyId: 42,
    templateId: 1,
    triggerId: null,
    campaignId: null,
    channel: 'sms',
    recipient: '+998901234567',
    subject: null,
    body: 'Dear Aziz, your booking #BK-001 is confirmed.',
    status: 'sent',
    externalId: 'ext-123',
    errorMessage: null,
    cost: 150,
    sentAt: NOW,
    deliveredAt: null,
    createdAt: NOW,
    property: {} as any,
    template: null,
    trigger: null,
    campaign: null,
    ...overrides,
  } as SentMessage;
}

/** Creates a mock QueryBuilder that supports chainable methods and configurable results. */
function createMockQueryBuilder(result: {
  getManyAndCount?: [any[], number];
  getMany?: any[];
  getRawMany?: any[];
  getRawOne?: any;
}) {
  const qb: any = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue(result.getManyAndCount ?? [[], 0]),
    getMany: jest.fn().mockResolvedValue(result.getMany ?? []),
    getRawMany: jest.fn().mockResolvedValue(result.getRawMany ?? []),
    getRawOne: jest.fn().mockResolvedValue(result.getRawOne ?? null),
  };
  return qb;
}

// ── Test Suite ──────────────────────────────────────────────────────────────

describe('MessagingService', () => {
  let service: MessagingService;
  let templateRepo: jest.Mocked<Repository<MessageTemplate>>;
  let triggerRepo: jest.Mocked<Repository<NotificationTrigger>>;
  let campaignRepo: jest.Mocked<Repository<Campaign>>;
  let sentMessageRepo: jest.Mocked<Repository<SentMessage>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        {
          provide: getRepositoryToken(MessageTemplate),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(NotificationTrigger),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Campaign),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SentMessage),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MessagingService>(MessagingService);
    templateRepo = module.get(getRepositoryToken(MessageTemplate));
    triggerRepo = module.get(getRepositoryToken(NotificationTrigger));
    campaignRepo = module.get(getRepositoryToken(Campaign));
    sentMessageRepo = module.get(getRepositoryToken(SentMessage));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEMPLATES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('findAllTemplates', () => {
    it('should return paginated templates with default pagination', async () => {
      const template = createMockTemplate();
      const qb = createMockQueryBuilder({ getManyAndCount: [[template], 1] });
      templateRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAllTemplates(42, {});

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual(
        expect.objectContaining({
          id: 1,
          property_id: 42,
          name: 'Booking Confirmation',
          channel: 'sms',
          language: 'ru',
          body: template.body,
          variables: ['guest_name', 'booking_id'],
          is_active: true,
        }),
      );
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        per_page: 20,
        last_page: 1,
      });

      expect(qb.where).toHaveBeenCalledWith('t.propertyId = :propertyId', { propertyId: 42 });
      expect(qb.orderBy).toHaveBeenCalledWith('t.createdAt', 'DESC');
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(20);
    });

    it('should apply channel filter', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      templateRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAllTemplates(42, { channel: 'email' } as any);

      expect(qb.andWhere).toHaveBeenCalledWith('t.channel = :channel', { channel: 'email' });
    });

    it('should apply language filter', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      templateRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAllTemplates(42, { language: 'uz' } as any);

      expect(qb.andWhere).toHaveBeenCalledWith('t.language = :language', { language: 'uz' });
    });

    it('should apply is_active filter', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      templateRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAllTemplates(42, { is_active: true } as any);

      expect(qb.andWhere).toHaveBeenCalledWith('t.isActive = :isActive', { isActive: true });
    });

    it('should apply search filter on name and body', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      templateRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAllTemplates(42, { search: 'booking' } as any);

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(t.name ILIKE :search OR t.body ILIKE :search)',
        { search: '%booking%' },
      );
    });

    it('should handle custom pagination', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      templateRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAllTemplates(42, { page: 3, per_page: 10 } as any);

      expect(qb.skip).toHaveBeenCalledWith(20); // (3-1)*10
      expect(qb.take).toHaveBeenCalledWith(10);
    });

    it('should return last_page=1 when no results', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      templateRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAllTemplates(42, {});

      expect(result.meta.last_page).toBe(1);
      expect(result.data).toHaveLength(0);
    });

    it('should calculate last_page correctly for multiple pages', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 45] });
      templateRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAllTemplates(42, { per_page: 10 } as any);

      expect(result.meta.last_page).toBe(5); // ceil(45/10) = 5
    });
  });

  describe('findOneTemplate', () => {
    it('should return a single template formatted as response', async () => {
      const template = createMockTemplate();
      templateRepo.findOne.mockResolvedValue(template);

      const result = await service.findOneTemplate(1);

      expect(result).toEqual(
        expect.objectContaining({
          id: 1,
          property_id: 42,
          name: 'Booking Confirmation',
          channel: 'sms',
          language: 'ru',
          subject: null,
          body: template.body,
          variables: ['guest_name', 'booking_id'],
          is_active: true,
          created_at: NOW,
          updated_at: NOW,
        }),
      );
      expect(templateRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should throw NOT_FOUND when template does not exist', async () => {
      templateRepo.findOne.mockResolvedValue(null);

      await expect(service.findOneTemplate(999)).rejects.toThrow(SardobaException);

      try {
        await service.findOneTemplate(999);
      } catch (error) {
        expect(error).toBeInstanceOf(SardobaException);
        expect((error as SardobaException).code).toBe(ErrorCode.NOT_FOUND);
        expect((error as SardobaException).details).toEqual({
          resource: 'message_template',
          id: 999,
        });
      }
    });
  });

  describe('createTemplate', () => {
    it('should create a template with all fields', async () => {
      const template = createMockTemplate();
      templateRepo.create.mockReturnValue(template);
      templateRepo.save.mockResolvedValue(template);

      const result = await service.createTemplate(42, {
        name: 'Booking Confirmation',
        channel: 'sms',
        language: 'ru',
        subject: 'Confirmation',
        body: 'Dear {{guest_name}}, your booking #{{booking_id}} is confirmed.',
        variables: ['guest_name', 'booking_id'],
      });

      expect(templateRepo.create).toHaveBeenCalledWith({
        propertyId: 42,
        name: 'Booking Confirmation',
        channel: 'sms',
        language: 'ru',
        subject: 'Confirmation',
        body: 'Dear {{guest_name}}, your booking #{{booking_id}} is confirmed.',
        variables: ['guest_name', 'booking_id'],
      });
      expect(templateRepo.save).toHaveBeenCalledWith(template);
      expect(result).toEqual(expect.objectContaining({ id: 1, name: 'Booking Confirmation' }));
    });

    it('should apply defaults for optional fields', async () => {
      const template = createMockTemplate();
      templateRepo.create.mockReturnValue(template);
      templateRepo.save.mockResolvedValue(template);

      await service.createTemplate(42, {
        name: 'Simple Template',
        body: 'Hello!',
      });

      expect(templateRepo.create).toHaveBeenCalledWith({
        propertyId: 42,
        name: 'Simple Template',
        channel: 'sms',
        language: 'ru',
        subject: null,
        body: 'Hello!',
        variables: [],
      });
    });

    it('should use email channel when specified', async () => {
      const template = createMockTemplate({ channel: 'email' });
      templateRepo.create.mockReturnValue(template);
      templateRepo.save.mockResolvedValue(template);

      await service.createTemplate(42, {
        name: 'Email Template',
        channel: 'email',
        body: 'Hello via email!',
        subject: 'Welcome',
      });

      expect(templateRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ channel: 'email', subject: 'Welcome' }),
      );
    });
  });

  describe('updateTemplate', () => {
    it('should update only provided fields', async () => {
      const template = createMockTemplate();
      templateRepo.findOne.mockResolvedValue(template);
      templateRepo.save.mockResolvedValue({ ...template, name: 'Updated Name' } as any);

      const result = await service.updateTemplate(1, { name: 'Updated Name' });

      expect(template.name).toBe('Updated Name');
      expect(templateRepo.save).toHaveBeenCalledWith(template);
      expect(result).toEqual(expect.objectContaining({ name: 'Updated Name' }));
    });

    it('should update all optional fields when provided', async () => {
      const template = createMockTemplate();
      templateRepo.findOne.mockResolvedValue(template);
      templateRepo.save.mockResolvedValue(template);

      await service.updateTemplate(1, {
        name: 'New Name',
        channel: 'email',
        language: 'en',
        subject: 'New Subject',
        body: 'New body text',
        variables: ['var1'],
        is_active: false,
      });

      expect(template.name).toBe('New Name');
      expect(template.channel).toBe('email');
      expect(template.language).toBe('en');
      expect(template.subject).toBe('New Subject');
      expect(template.body).toBe('New body text');
      expect(template.variables).toEqual(['var1']);
      expect(template.isActive).toBe(false);
    });

    it('should not change fields that are not provided (undefined)', async () => {
      const template = createMockTemplate({
        name: 'Original Name',
        body: 'Original body',
        channel: 'sms',
      });
      templateRepo.findOne.mockResolvedValue(template);
      templateRepo.save.mockResolvedValue(template);

      await service.updateTemplate(1, { name: 'Changed' });

      expect(template.name).toBe('Changed');
      expect(template.body).toBe('Original body');
      expect(template.channel).toBe('sms');
    });

    it('should throw NOT_FOUND when template does not exist', async () => {
      templateRepo.findOne.mockResolvedValue(null);

      await expect(service.updateTemplate(999, { name: 'Test' })).rejects.toThrow(
        SardobaException,
      );

      try {
        await service.updateTemplate(999, { name: 'Test' });
      } catch (error) {
        expect((error as SardobaException).code).toBe(ErrorCode.NOT_FOUND);
      }
    });
  });

  describe('deleteTemplate', () => {
    it('should remove the template', async () => {
      const template = createMockTemplate();
      templateRepo.findOne.mockResolvedValue(template);
      templateRepo.remove.mockResolvedValue(template);

      await service.deleteTemplate(1);

      expect(templateRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(templateRepo.remove).toHaveBeenCalledWith(template);
    });

    it('should throw NOT_FOUND when template does not exist', async () => {
      templateRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteTemplate(999)).rejects.toThrow(SardobaException);

      try {
        await service.deleteTemplate(999);
      } catch (error) {
        expect((error as SardobaException).code).toBe(ErrorCode.NOT_FOUND);
        expect((error as SardobaException).details).toEqual({
          resource: 'message_template',
          id: 999,
        });
      }
    });
  });

  describe('verifyTemplateProperty', () => {
    it('should return template when property matches', async () => {
      const template = createMockTemplate({ propertyId: 42 });
      templateRepo.findOne.mockResolvedValue(template);

      const result = await service.verifyTemplateProperty(1, 42);

      expect(result).toBe(template);
    });

    it('should throw NOT_FOUND when template does not exist', async () => {
      templateRepo.findOne.mockResolvedValue(null);

      await expect(service.verifyTemplateProperty(999, 42)).rejects.toThrow(SardobaException);

      try {
        await service.verifyTemplateProperty(999, 42);
      } catch (error) {
        expect((error as SardobaException).code).toBe(ErrorCode.NOT_FOUND);
      }
    });

    it('should throw FORBIDDEN when property does not match', async () => {
      const template = createMockTemplate({ propertyId: 99 });
      templateRepo.findOne.mockResolvedValue(template);

      await expect(service.verifyTemplateProperty(1, 42)).rejects.toThrow(SardobaException);

      try {
        await service.verifyTemplateProperty(1, 42);
      } catch (error) {
        expect((error as SardobaException).code).toBe(ErrorCode.FORBIDDEN);
        expect((error as SardobaException).details).toEqual({
          reason: 'Template does not belong to your property',
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TRIGGERS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('findAllTriggers', () => {
    it('should return all triggers for a property with template relation', async () => {
      const template = createMockTemplate();
      const trigger = createMockTrigger({ template });
      triggerRepo.find.mockResolvedValue([trigger]);

      const result = await service.findAllTriggers(42);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual(
        expect.objectContaining({
          id: 1,
          property_id: 42,
          event_type: 'booking_confirmed',
          template_id: 1,
          channel: 'sms',
          delay_minutes: 0,
          is_active: true,
        }),
      );
      // Template should be nested in the response
      expect(result.data[0]).toHaveProperty('template');
      expect((result.data[0] as any).template).toEqual(
        expect.objectContaining({ id: 1, name: 'Booking Confirmation' }),
      );
      expect(triggerRepo.find).toHaveBeenCalledWith({
        where: { propertyId: 42 },
        relations: ['template'],
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty data array when no triggers exist', async () => {
      triggerRepo.find.mockResolvedValue([]);

      const result = await service.findAllTriggers(42);

      expect(result.data).toHaveLength(0);
    });

    it('should omit template in response when template relation is not loaded', async () => {
      const trigger = createMockTrigger({ template: undefined as any });
      triggerRepo.find.mockResolvedValue([trigger]);

      const result = await service.findAllTriggers(42);

      expect(result.data[0]).not.toHaveProperty('template');
    });
  });

  describe('createTrigger', () => {
    it('should create a trigger with defaults', async () => {
      const template = createMockTemplate();
      const trigger = createMockTrigger();
      templateRepo.findOne.mockResolvedValue(template);
      triggerRepo.create.mockReturnValue(trigger);
      triggerRepo.save.mockResolvedValue(trigger);

      const result = await service.createTrigger(42, {
        event_type: 'booking_confirmed',
        template_id: 1,
      } as any);

      expect(templateRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1, propertyId: 42 },
      });
      expect(triggerRepo.create).toHaveBeenCalledWith({
        propertyId: 42,
        eventType: 'booking_confirmed',
        templateId: 1,
        channel: 'sms',
        delayMinutes: 0,
      });
      expect(result).toEqual(expect.objectContaining({ event_type: 'booking_confirmed' }));
    });

    it('should create a trigger with custom channel and delay', async () => {
      const template = createMockTemplate();
      templateRepo.findOne.mockResolvedValue(template);
      triggerRepo.create.mockReturnValue(createMockTrigger({ channel: 'email', delayMinutes: -60 }));
      triggerRepo.save.mockResolvedValue(createMockTrigger({ channel: 'email', delayMinutes: -60 }));

      const result = await service.createTrigger(42, {
        event_type: 'pre_arrival',
        template_id: 1,
        channel: 'email',
        delay_minutes: -60,
      } as any);

      expect(triggerRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'email',
          delayMinutes: -60,
        }),
      );
      expect(result).toEqual(expect.objectContaining({ channel: 'email', delay_minutes: -60 }));
    });

    it('should throw NOT_FOUND when template does not exist for the property', async () => {
      templateRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createTrigger(42, {
          event_type: 'booking_confirmed',
          template_id: 999,
        } as any),
      ).rejects.toThrow(SardobaException);

      try {
        await service.createTrigger(42, {
          event_type: 'booking_confirmed',
          template_id: 999,
        } as any);
      } catch (error) {
        expect((error as SardobaException).code).toBe(ErrorCode.NOT_FOUND);
        expect((error as SardobaException).details).toEqual({
          resource: 'message_template',
          id: 999,
        });
      }
    });

    it('should throw NOT_FOUND when template belongs to a different property', async () => {
      // findOne with { id: 1, propertyId: 42 } returns null because template is on propertyId 99
      templateRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createTrigger(42, {
          event_type: 'check_in',
          template_id: 1,
        } as any),
      ).rejects.toThrow(SardobaException);
    });
  });

  describe('updateTrigger', () => {
    it('should update only provided fields', async () => {
      const trigger = createMockTrigger();
      triggerRepo.findOne.mockResolvedValue(trigger);
      triggerRepo.save.mockResolvedValue(trigger);

      await service.updateTrigger(1, { delay_minutes: 30 });

      expect(trigger.delayMinutes).toBe(30);
      expect(trigger.eventType).toBe('booking_confirmed'); // unchanged
      expect(triggerRepo.save).toHaveBeenCalledWith(trigger);
    });

    it('should update all fields when provided', async () => {
      const trigger = createMockTrigger();
      triggerRepo.findOne.mockResolvedValue(trigger);
      triggerRepo.save.mockResolvedValue(trigger);

      await service.updateTrigger(1, {
        event_type: 'check_out',
        template_id: 5,
        channel: 'email',
        delay_minutes: 120,
        is_active: false,
      } as any);

      expect(trigger.eventType).toBe('check_out');
      expect(trigger.templateId).toBe(5);
      expect(trigger.channel).toBe('email');
      expect(trigger.delayMinutes).toBe(120);
      expect(trigger.isActive).toBe(false);
    });

    it('should throw NOT_FOUND when trigger does not exist', async () => {
      triggerRepo.findOne.mockResolvedValue(null);

      await expect(service.updateTrigger(999, { is_active: false })).rejects.toThrow(
        SardobaException,
      );

      try {
        await service.updateTrigger(999, { is_active: false });
      } catch (error) {
        expect((error as SardobaException).code).toBe(ErrorCode.NOT_FOUND);
        expect((error as SardobaException).details).toEqual({
          resource: 'notification_trigger',
          id: 999,
        });
      }
    });
  });

  describe('deleteTrigger', () => {
    it('should remove the trigger', async () => {
      const trigger = createMockTrigger();
      triggerRepo.findOne.mockResolvedValue(trigger);
      triggerRepo.remove.mockResolvedValue(trigger);

      await service.deleteTrigger(1);

      expect(triggerRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(triggerRepo.remove).toHaveBeenCalledWith(trigger);
    });

    it('should throw NOT_FOUND when trigger does not exist', async () => {
      triggerRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteTrigger(999)).rejects.toThrow(SardobaException);

      try {
        await service.deleteTrigger(999);
      } catch (error) {
        expect((error as SardobaException).code).toBe(ErrorCode.NOT_FOUND);
        expect((error as SardobaException).details).toEqual({
          resource: 'notification_trigger',
          id: 999,
        });
      }
    });
  });

  describe('verifyTriggerProperty', () => {
    it('should return trigger when property matches', async () => {
      const trigger = createMockTrigger({ propertyId: 42 });
      triggerRepo.findOne.mockResolvedValue(trigger);

      const result = await service.verifyTriggerProperty(1, 42);

      expect(result).toBe(trigger);
    });

    it('should throw NOT_FOUND when trigger does not exist', async () => {
      triggerRepo.findOne.mockResolvedValue(null);

      await expect(service.verifyTriggerProperty(999, 42)).rejects.toThrow(SardobaException);

      try {
        await service.verifyTriggerProperty(999, 42);
      } catch (error) {
        expect((error as SardobaException).code).toBe(ErrorCode.NOT_FOUND);
      }
    });

    it('should throw FORBIDDEN when property does not match', async () => {
      const trigger = createMockTrigger({ propertyId: 99 });
      triggerRepo.findOne.mockResolvedValue(trigger);

      await expect(service.verifyTriggerProperty(1, 42)).rejects.toThrow(SardobaException);

      try {
        await service.verifyTriggerProperty(1, 42);
      } catch (error) {
        expect((error as SardobaException).code).toBe(ErrorCode.FORBIDDEN);
        expect((error as SardobaException).details).toEqual({
          reason: 'Trigger does not belong to your property',
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CAMPAIGNS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('findAllCampaigns', () => {
    it('should return paginated campaigns with template relation', async () => {
      const template = createMockTemplate();
      const campaign = createMockCampaign({ template });
      const qb = createMockQueryBuilder({ getManyAndCount: [[campaign], 1] });
      campaignRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAllCampaigns(42, {});

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual(
        expect.objectContaining({
          id: 1,
          property_id: 42,
          name: 'Summer Promotion',
          status: 'draft',
          channel: 'sms',
        }),
      );
      expect((result.data[0] as any).template).toEqual(
        expect.objectContaining({ name: 'Booking Confirmation' }),
      );
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        per_page: 20,
        last_page: 1,
      });
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('c.template', 'template');
    });

    it('should apply status filter', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      campaignRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAllCampaigns(42, { status: 'sending' } as any);

      expect(qb.andWhere).toHaveBeenCalledWith('c.status = :status', { status: 'sending' });
    });

    it('should apply channel filter', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      campaignRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAllCampaigns(42, { channel: 'email' } as any);

      expect(qb.andWhere).toHaveBeenCalledWith('c.channel = :channel', { channel: 'email' });
    });

    it('should return last_page=1 when empty', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      campaignRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAllCampaigns(42, {});

      expect(result.meta.last_page).toBe(1);
    });
  });

  describe('findOneCampaign', () => {
    it('should return campaign with template relation', async () => {
      const template = createMockTemplate();
      const campaign = createMockCampaign({ template });
      campaignRepo.findOne.mockResolvedValue(campaign);

      const result = await service.findOneCampaign(1);

      expect(result).toEqual(
        expect.objectContaining({
          id: 1,
          name: 'Summer Promotion',
          status: 'draft',
          total_recipients: 0,
          sent_count: 0,
          delivered_count: 0,
          failed_count: 0,
        }),
      );
      expect((result as any).template).toEqual(
        expect.objectContaining({ name: 'Booking Confirmation' }),
      );
      expect(campaignRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['template'],
      });
    });

    it('should throw NOT_FOUND when campaign does not exist', async () => {
      campaignRepo.findOne.mockResolvedValue(null);

      await expect(service.findOneCampaign(999)).rejects.toThrow(SardobaException);

      try {
        await service.findOneCampaign(999);
      } catch (error) {
        expect((error as SardobaException).code).toBe(ErrorCode.NOT_FOUND);
        expect((error as SardobaException).details).toEqual({
          resource: 'campaign',
          id: 999,
        });
      }
    });
  });

  describe('createCampaign', () => {
    it('should create a campaign in draft status', async () => {
      const template = createMockTemplate();
      const campaign = createMockCampaign();
      templateRepo.findOne.mockResolvedValue(template);
      campaignRepo.create.mockReturnValue(campaign);
      campaignRepo.save.mockResolvedValue(campaign);

      const result = await service.createCampaign(
        42,
        {
          name: 'Summer Promotion',
          template_id: 1,
        } as any,
        1,
      );

      expect(templateRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1, propertyId: 42 },
      });
      expect(campaignRepo.create).toHaveBeenCalledWith({
        propertyId: 42,
        name: 'Summer Promotion',
        templateId: 1,
        channel: 'sms',
        segmentFilters: {},
        status: 'draft',
        scheduledAt: null,
        createdBy: 1,
      });
      expect(result).toEqual(expect.objectContaining({ status: 'draft', name: 'Summer Promotion' }));
    });

    it('should create a campaign with all optional fields', async () => {
      const template = createMockTemplate();
      templateRepo.findOne.mockResolvedValue(template);
      campaignRepo.create.mockReturnValue(createMockCampaign());
      campaignRepo.save.mockResolvedValue(createMockCampaign());

      await service.createCampaign(
        42,
        {
          name: 'Email Campaign',
          template_id: 1,
          channel: 'email',
          segment_filters: { guest_type: 'returning' },
          scheduled_at: '2026-03-01T10:00:00Z',
        },
        5,
      );

      expect(campaignRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'email',
          segmentFilters: { guest_type: 'returning' },
          scheduledAt: new Date('2026-03-01T10:00:00Z'),
          createdBy: 5,
        }),
      );
    });

    it('should throw NOT_FOUND when template does not exist', async () => {
      templateRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createCampaign(42, { name: 'Test', template_id: 999 } as any, 1),
      ).rejects.toThrow(SardobaException);

      try {
        await service.createCampaign(42, { name: 'Test', template_id: 999 } as any, 1);
      } catch (error) {
        expect((error as SardobaException).code).toBe(ErrorCode.NOT_FOUND);
        expect((error as SardobaException).details).toEqual({
          resource: 'message_template',
          id: 999,
        });
      }
    });

    it('should throw NOT_FOUND when template belongs to different property', async () => {
      templateRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createCampaign(42, { name: 'Test', template_id: 1 } as any, 1),
      ).rejects.toThrow(SardobaException);
    });
  });

  describe('updateCampaign', () => {
    it('should update a draft campaign', async () => {
      const campaign = createMockCampaign({ status: 'draft' });
      campaignRepo.findOne.mockResolvedValue(campaign);
      campaignRepo.save.mockResolvedValue(campaign);

      await service.updateCampaign(1, { name: 'New Name' });

      expect(campaign.name).toBe('New Name');
      expect(campaignRepo.save).toHaveBeenCalledWith(campaign);
    });

    it('should update all optional fields on a draft campaign', async () => {
      const campaign = createMockCampaign({ status: 'draft' });
      campaignRepo.findOne.mockResolvedValue(campaign);
      campaignRepo.save.mockResolvedValue(campaign);

      await service.updateCampaign(1, {
        name: 'Updated Campaign',
        template_id: 5,
        channel: 'email',
        segment_filters: { vip: true },
        status: 'scheduled',
        scheduled_at: '2026-04-01T08:00:00Z',
      } as any);

      expect(campaign.name).toBe('Updated Campaign');
      expect(campaign.templateId).toBe(5);
      expect(campaign.channel).toBe('email');
      expect(campaign.segmentFilters).toEqual({ vip: true });
      expect(campaign.status).toBe('scheduled');
      expect(campaign.scheduledAt).toEqual(new Date('2026-04-01T08:00:00Z'));
    });

    it('should throw NOT_FOUND when campaign does not exist', async () => {
      campaignRepo.findOne.mockResolvedValue(null);

      await expect(service.updateCampaign(999, { name: 'Test' })).rejects.toThrow(
        SardobaException,
      );

      try {
        await service.updateCampaign(999, { name: 'Test' });
      } catch (error) {
        expect((error as SardobaException).code).toBe(ErrorCode.NOT_FOUND);
      }
    });

    it('should throw VALIDATION_ERROR when campaign is not in draft status', async () => {
      const campaign = createMockCampaign({ status: 'sending' });
      campaignRepo.findOne.mockResolvedValue(campaign);

      await expect(
        service.updateCampaign(1, { name: 'Cannot Update' }),
      ).rejects.toThrow(SardobaException);

      try {
        await service.updateCampaign(1, { name: 'Cannot Update' });
      } catch (error) {
        expect((error as SardobaException).code).toBe(ErrorCode.VALIDATION_ERROR);
        expect((error as SardobaException).details).toEqual(
          expect.objectContaining({
            reason: 'Only draft campaigns can be updated',
            current_status: 'sending',
          }),
        );
      }
    });

    it('should throw VALIDATION_ERROR when trying to update a completed campaign', async () => {
      const campaign = createMockCampaign({ status: 'completed' });
      campaignRepo.findOne.mockResolvedValue(campaign);

      await expect(
        service.updateCampaign(1, { name: 'Cannot Update' }),
      ).rejects.toThrow(SardobaException);
    });

    it('should throw VALIDATION_ERROR when trying to update a cancelled campaign', async () => {
      const campaign = createMockCampaign({ status: 'cancelled' });
      campaignRepo.findOne.mockResolvedValue(campaign);

      await expect(
        service.updateCampaign(1, { name: 'Cannot Update' }),
      ).rejects.toThrow(SardobaException);
    });

    it('should throw VALIDATION_ERROR when trying to update a scheduled campaign', async () => {
      const campaign = createMockCampaign({ status: 'scheduled' });
      campaignRepo.findOne.mockResolvedValue(campaign);

      await expect(
        service.updateCampaign(1, { name: 'Cannot Update' }),
      ).rejects.toThrow(SardobaException);
    });
  });

  describe('startCampaign', () => {
    it('should set status to "sending" when no scheduled time', async () => {
      const campaign = createMockCampaign({ status: 'draft', scheduledAt: null });
      campaignRepo.findOne.mockResolvedValue(campaign);
      campaignRepo.save.mockResolvedValue(campaign);

      const result = await service.startCampaign(1);

      expect(campaign.status).toBe('sending');
      expect(campaign.startedAt).toBeInstanceOf(Date);
      expect(result).toEqual(expect.objectContaining({ status: 'sending' }));
    });

    it('should set status to "scheduled" when scheduled in the future', async () => {
      const futureDate = new Date('2099-01-01T00:00:00Z');
      const campaign = createMockCampaign({ status: 'draft', scheduledAt: futureDate });
      campaignRepo.findOne.mockResolvedValue(campaign);
      campaignRepo.save.mockResolvedValue(campaign);

      const result = await service.startCampaign(1);

      expect(campaign.status).toBe('scheduled');
      expect(campaign.startedAt).toBeNull(); // not started yet
      expect(result).toEqual(expect.objectContaining({ status: 'scheduled' }));
    });

    it('should set status to "sending" when scheduled in the past', async () => {
      const pastDate = new Date('2020-01-01T00:00:00Z');
      const campaign = createMockCampaign({ status: 'draft', scheduledAt: pastDate });
      campaignRepo.findOne.mockResolvedValue(campaign);
      campaignRepo.save.mockResolvedValue(campaign);

      const result = await service.startCampaign(1);

      expect(campaign.status).toBe('sending');
      expect(campaign.startedAt).toBeInstanceOf(Date);
      expect(result).toEqual(expect.objectContaining({ status: 'sending' }));
    });

    it('should throw NOT_FOUND when campaign does not exist', async () => {
      campaignRepo.findOne.mockResolvedValue(null);

      await expect(service.startCampaign(999)).rejects.toThrow(SardobaException);

      try {
        await service.startCampaign(999);
      } catch (error) {
        expect((error as SardobaException).code).toBe(ErrorCode.NOT_FOUND);
      }
    });

    it('should throw VALIDATION_ERROR when campaign is not draft', async () => {
      const campaign = createMockCampaign({ status: 'sending' });
      campaignRepo.findOne.mockResolvedValue(campaign);

      await expect(service.startCampaign(1)).rejects.toThrow(SardobaException);

      try {
        await service.startCampaign(1);
      } catch (error) {
        expect((error as SardobaException).code).toBe(ErrorCode.VALIDATION_ERROR);
        expect((error as SardobaException).details).toEqual(
          expect.objectContaining({
            reason: 'Only draft campaigns can be started',
            current_status: 'sending',
          }),
        );
      }
    });

    it('should throw VALIDATION_ERROR when campaign is already completed', async () => {
      const campaign = createMockCampaign({ status: 'completed' });
      campaignRepo.findOne.mockResolvedValue(campaign);

      await expect(service.startCampaign(1)).rejects.toThrow(SardobaException);
    });

    it('should throw VALIDATION_ERROR when campaign is already scheduled', async () => {
      const campaign = createMockCampaign({ status: 'scheduled' });
      campaignRepo.findOne.mockResolvedValue(campaign);

      await expect(service.startCampaign(1)).rejects.toThrow(SardobaException);
    });

    it('should throw VALIDATION_ERROR when campaign is cancelled', async () => {
      const campaign = createMockCampaign({ status: 'cancelled' });
      campaignRepo.findOne.mockResolvedValue(campaign);

      await expect(service.startCampaign(1)).rejects.toThrow(SardobaException);
    });
  });

  describe('cancelCampaign', () => {
    it('should cancel a draft campaign', async () => {
      const campaign = createMockCampaign({ status: 'draft' });
      campaignRepo.findOne.mockResolvedValue(campaign);
      campaignRepo.save.mockResolvedValue(campaign);

      const result = await service.cancelCampaign(1);

      expect(campaign.status).toBe('cancelled');
      expect(result).toEqual(expect.objectContaining({ status: 'cancelled' }));
    });

    it('should cancel a scheduled campaign', async () => {
      const campaign = createMockCampaign({ status: 'scheduled' });
      campaignRepo.findOne.mockResolvedValue(campaign);
      campaignRepo.save.mockResolvedValue(campaign);

      const result = await service.cancelCampaign(1);

      expect(campaign.status).toBe('cancelled');
      expect(result).toEqual(expect.objectContaining({ status: 'cancelled' }));
    });

    it('should cancel a sending campaign', async () => {
      const campaign = createMockCampaign({ status: 'sending' });
      campaignRepo.findOne.mockResolvedValue(campaign);
      campaignRepo.save.mockResolvedValue(campaign);

      const result = await service.cancelCampaign(1);

      expect(campaign.status).toBe('cancelled');
      expect(result).toEqual(expect.objectContaining({ status: 'cancelled' }));
    });

    it('should throw NOT_FOUND when campaign does not exist', async () => {
      campaignRepo.findOne.mockResolvedValue(null);

      await expect(service.cancelCampaign(999)).rejects.toThrow(SardobaException);

      try {
        await service.cancelCampaign(999);
      } catch (error) {
        expect((error as SardobaException).code).toBe(ErrorCode.NOT_FOUND);
      }
    });

    it('should throw VALIDATION_ERROR when campaign is already completed', async () => {
      const campaign = createMockCampaign({ status: 'completed' });
      campaignRepo.findOne.mockResolvedValue(campaign);

      await expect(service.cancelCampaign(1)).rejects.toThrow(SardobaException);

      try {
        await service.cancelCampaign(1);
      } catch (error) {
        expect((error as SardobaException).code).toBe(ErrorCode.VALIDATION_ERROR);
        expect((error as SardobaException).details).toEqual(
          expect.objectContaining({
            reason: 'Completed campaigns cannot be cancelled',
          }),
        );
      }
    });

    it('should allow cancelling an already cancelled campaign (idempotent)', async () => {
      const campaign = createMockCampaign({ status: 'cancelled' });
      campaignRepo.findOne.mockResolvedValue(campaign);
      campaignRepo.save.mockResolvedValue(campaign);

      const result = await service.cancelCampaign(1);

      expect(campaign.status).toBe('cancelled');
      expect(result).toEqual(expect.objectContaining({ status: 'cancelled' }));
    });
  });

  describe('verifyCampaignProperty', () => {
    it('should return campaign when property matches', async () => {
      const campaign = createMockCampaign({ propertyId: 42 });
      campaignRepo.findOne.mockResolvedValue(campaign);

      const result = await service.verifyCampaignProperty(1, 42);

      expect(result).toBe(campaign);
    });

    it('should throw NOT_FOUND when campaign does not exist', async () => {
      campaignRepo.findOne.mockResolvedValue(null);

      await expect(service.verifyCampaignProperty(999, 42)).rejects.toThrow(SardobaException);

      try {
        await service.verifyCampaignProperty(999, 42);
      } catch (error) {
        expect((error as SardobaException).code).toBe(ErrorCode.NOT_FOUND);
      }
    });

    it('should throw FORBIDDEN when property does not match', async () => {
      const campaign = createMockCampaign({ propertyId: 99 });
      campaignRepo.findOne.mockResolvedValue(campaign);

      await expect(service.verifyCampaignProperty(1, 42)).rejects.toThrow(SardobaException);

      try {
        await service.verifyCampaignProperty(1, 42);
      } catch (error) {
        expect((error as SardobaException).code).toBe(ErrorCode.FORBIDDEN);
        expect((error as SardobaException).details).toEqual({
          reason: 'Campaign does not belong to your property',
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CAMPAIGN STATUS TRANSITIONS (comprehensive matrix)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('campaign status transitions', () => {
    const nonDraftStatuses = ['scheduled', 'sending', 'completed', 'cancelled'] as const;

    describe('start transitions', () => {
      it.each(nonDraftStatuses)(
        'should reject starting a campaign with status "%s"',
        async (status) => {
          const campaign = createMockCampaign({ status });
          campaignRepo.findOne.mockResolvedValue(campaign);

          await expect(service.startCampaign(1)).rejects.toThrow(SardobaException);
        },
      );

      it('should allow starting only from "draft"', async () => {
        const campaign = createMockCampaign({ status: 'draft' });
        campaignRepo.findOne.mockResolvedValue(campaign);
        campaignRepo.save.mockResolvedValue(campaign);

        await expect(service.startCampaign(1)).resolves.toBeDefined();
      });
    });

    describe('update transitions', () => {
      it.each(nonDraftStatuses)(
        'should reject updating a campaign with status "%s"',
        async (status) => {
          const campaign = createMockCampaign({ status });
          campaignRepo.findOne.mockResolvedValue(campaign);

          await expect(service.updateCampaign(1, { name: 'Nope' })).rejects.toThrow(
            SardobaException,
          );
        },
      );

      it('should allow updating only from "draft"', async () => {
        const campaign = createMockCampaign({ status: 'draft' });
        campaignRepo.findOne.mockResolvedValue(campaign);
        campaignRepo.save.mockResolvedValue(campaign);

        await expect(service.updateCampaign(1, { name: 'OK' })).resolves.toBeDefined();
      });
    });

    describe('cancel transitions', () => {
      it('should reject cancelling a completed campaign', async () => {
        const campaign = createMockCampaign({ status: 'completed' });
        campaignRepo.findOne.mockResolvedValue(campaign);

        await expect(service.cancelCampaign(1)).rejects.toThrow(SardobaException);
      });

      const cancellableStatuses = ['draft', 'scheduled', 'sending', 'cancelled'] as const;
      it.each(cancellableStatuses)(
        'should allow cancelling a campaign with status "%s"',
        async (status) => {
          const campaign = createMockCampaign({ status });
          campaignRepo.findOne.mockResolvedValue(campaign);
          campaignRepo.save.mockResolvedValue(campaign);

          await expect(service.cancelCampaign(1)).resolves.toBeDefined();
        },
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SENT MESSAGES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('findAllMessages', () => {
    it('should return paginated sent messages with default pagination', async () => {
      const message = createMockSentMessage();
      const qb = createMockQueryBuilder({ getManyAndCount: [[message], 1] });
      sentMessageRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAllMessages(42, {});

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual(
        expect.objectContaining({
          id: 1,
          property_id: 42,
          template_id: 1,
          trigger_id: null,
          campaign_id: null,
          channel: 'sms',
          recipient: '+998901234567',
          subject: null,
          body: 'Dear Aziz, your booking #BK-001 is confirmed.',
          status: 'sent',
          external_id: 'ext-123',
          error_message: null,
          cost: 150,
          sent_at: NOW,
          delivered_at: null,
          created_at: NOW,
        }),
      );
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        per_page: 20,
        last_page: 1,
      });
    });

    it('should apply status filter', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      sentMessageRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAllMessages(42, { status: 'failed' } as any);

      expect(qb.andWhere).toHaveBeenCalledWith('m.status = :status', { status: 'failed' });
    });

    it('should apply channel filter', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      sentMessageRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAllMessages(42, { channel: 'email' } as any);

      expect(qb.andWhere).toHaveBeenCalledWith('m.channel = :channel', { channel: 'email' });
    });

    it('should apply campaign_id filter', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      sentMessageRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAllMessages(42, { campaign_id: 5 } as any);

      expect(qb.andWhere).toHaveBeenCalledWith('m.campaignId = :campaignId', { campaignId: 5 });
    });

    it('should apply template_id filter', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      sentMessageRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAllMessages(42, { template_id: 3 } as any);

      expect(qb.andWhere).toHaveBeenCalledWith('m.templateId = :templateId', { templateId: 3 });
    });

    it('should apply date_from filter', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      sentMessageRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAllMessages(42, { date_from: '2026-01-01' } as any);

      expect(qb.andWhere).toHaveBeenCalledWith('m.createdAt >= :dateFrom', {
        dateFrom: '2026-01-01',
      });
    });

    it('should apply date_to filter', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      sentMessageRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAllMessages(42, { date_to: '2026-12-31' } as any);

      expect(qb.andWhere).toHaveBeenCalledWith('m.createdAt <= :dateTo', {
        dateTo: '2026-12-31',
      });
    });

    it('should apply all filters simultaneously', async () => {
      const qb = createMockQueryBuilder({ getManyAndCount: [[], 0] });
      sentMessageRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAllMessages(42, {
        status: 'delivered',
        channel: 'sms',
        campaign_id: 2,
        template_id: 3,
        date_from: '2026-01-01',
        date_to: '2026-06-30',
        page: 2,
        per_page: 10,
      } as any);

      expect(qb.andWhere).toHaveBeenCalledTimes(6);
      expect(qb.skip).toHaveBeenCalledWith(10); // (2-1)*10
      expect(qb.take).toHaveBeenCalledWith(10);
    });

    it('should handle message with null cost', async () => {
      const message = createMockSentMessage({ cost: null });
      const qb = createMockQueryBuilder({ getManyAndCount: [[message], 1] });
      sentMessageRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAllMessages(42, {});

      expect(result.data[0]).toEqual(expect.objectContaining({ cost: null }));
    });

    it('should convert cost to number', async () => {
      const message = createMockSentMessage({ cost: 250.50 });
      const qb = createMockQueryBuilder({ getManyAndCount: [[message], 1] });
      sentMessageRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAllMessages(42, {});

      expect(result.data[0]).toEqual(expect.objectContaining({ cost: 250.50 }));
      expect(typeof (result.data[0] as any).cost).toBe('number');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MESSAGING STATS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getMessagingStats', () => {
    it('should return stats grouped by status, channel, and total cost', async () => {
      const byStatusQb = createMockQueryBuilder({
        getRawMany: [
          { status: 'sent', count: 50 },
          { status: 'delivered', count: 45 },
          { status: 'failed', count: 5 },
        ],
      });
      const byChannelQb = createMockQueryBuilder({
        getRawMany: [
          { channel: 'sms', count: 80 },
          { channel: 'email', count: 20 },
        ],
      });
      const totalCostQb = createMockQueryBuilder({
        getRawOne: { total_cost: '15000' },
      });

      sentMessageRepo.createQueryBuilder
        .mockReturnValueOnce(byStatusQb)
        .mockReturnValueOnce(byChannelQb)
        .mockReturnValueOnce(totalCostQb);

      const result = await service.getMessagingStats(42);

      expect(result.by_status).toEqual([
        { status: 'sent', count: 50 },
        { status: 'delivered', count: 45 },
        { status: 'failed', count: 5 },
      ]);
      expect(result.by_channel).toEqual([
        { channel: 'sms', count: 80 },
        { channel: 'email', count: 20 },
      ]);
      expect(result.total_cost).toBe(15000);
    });

    it('should return zero total_cost when no messages exist', async () => {
      const emptyQb = createMockQueryBuilder({ getRawMany: [] });
      const costQb = createMockQueryBuilder({ getRawOne: { total_cost: '0' } });

      sentMessageRepo.createQueryBuilder
        .mockReturnValueOnce(emptyQb)
        .mockReturnValueOnce(emptyQb)
        .mockReturnValueOnce(costQb);

      const result = await service.getMessagingStats(42);

      expect(result.by_status).toEqual([]);
      expect(result.by_channel).toEqual([]);
      expect(result.total_cost).toBe(0);
    });

    it('should handle null total_cost gracefully', async () => {
      const emptyQb = createMockQueryBuilder({ getRawMany: [] });
      const costQb = createMockQueryBuilder({ getRawOne: null });

      sentMessageRepo.createQueryBuilder
        .mockReturnValueOnce(emptyQb)
        .mockReturnValueOnce(emptyQb)
        .mockReturnValueOnce(costQb);

      const result = await service.getMessagingStats(42);

      expect(result.total_cost).toBe(0);
    });

    it('should filter all queries by propertyId', async () => {
      const qb = createMockQueryBuilder({ getRawMany: [], getRawOne: { total_cost: '0' } });
      sentMessageRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getMessagingStats(42);

      // createQueryBuilder is called 3 times (byStatus, byChannel, totalCost)
      expect(sentMessageRepo.createQueryBuilder).toHaveBeenCalledTimes(3);
      // Each query should have 'where' called with propertyId
      expect(qb.where).toHaveBeenCalledWith('m.propertyId = :propertyId', { propertyId: 42 });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESPONSE FORMATTING (private helpers tested via public methods)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('response formatting', () => {
    it('should format template response with snake_case keys', async () => {
      const template = createMockTemplate({
        id: 7,
        propertyId: 10,
        name: 'Test Template',
        channel: 'email',
        language: 'en',
        subject: 'Subject Line',
        body: 'Body text',
        variables: ['var1', 'var2'],
        isActive: false,
      });
      templateRepo.findOne.mockResolvedValue(template);

      const result = await service.findOneTemplate(7);

      expect(result).toEqual({
        id: 7,
        property_id: 10,
        name: 'Test Template',
        channel: 'email',
        language: 'en',
        subject: 'Subject Line',
        body: 'Body text',
        variables: ['var1', 'var2'],
        is_active: false,
        created_at: NOW,
        updated_at: NOW,
      });
    });

    it('should format campaign response with all counting fields', async () => {
      const campaign = createMockCampaign({
        id: 3,
        totalRecipients: 100,
        sentCount: 95,
        deliveredCount: 90,
        failedCount: 5,
        status: 'completed',
        startedAt: new Date('2026-02-27T10:00:00Z'),
        completedAt: new Date('2026-02-27T10:05:00Z'),
        scheduledAt: new Date('2026-02-27T10:00:00Z'),
      });
      campaignRepo.findOne.mockResolvedValue(campaign);

      const result = await service.findOneCampaign(3);

      expect(result).toEqual(
        expect.objectContaining({
          id: 3,
          status: 'completed',
          total_recipients: 100,
          sent_count: 95,
          delivered_count: 90,
          failed_count: 5,
          started_at: new Date('2026-02-27T10:00:00Z'),
          completed_at: new Date('2026-02-27T10:05:00Z'),
          scheduled_at: new Date('2026-02-27T10:00:00Z'),
        }),
      );
    });

    it('should include nested template in trigger response when loaded', async () => {
      const template = createMockTemplate({ id: 2, name: 'Nested Template' });
      const trigger = createMockTrigger({ template });
      triggerRepo.find.mockResolvedValue([trigger]);

      const result = await service.findAllTriggers(42);

      expect(result.data[0]).toHaveProperty('template');
      expect((result.data[0] as any).template).toEqual(
        expect.objectContaining({ id: 2, name: 'Nested Template' }),
      );
    });

    it('should include nested template in campaign response when loaded', async () => {
      const template = createMockTemplate({ id: 3, name: 'Campaign Template' });
      const campaign = createMockCampaign({ template });
      campaignRepo.findOne.mockResolvedValue(campaign);

      const result = await service.findOneCampaign(1);

      expect((result as any).template).toEqual(
        expect.objectContaining({ id: 3, name: 'Campaign Template' }),
      );
    });

    it('should omit template in campaign response when not loaded', async () => {
      const campaign = createMockCampaign({ template: undefined as any });
      campaignRepo.findOne.mockResolvedValue(campaign);

      const result = await service.findOneCampaign(1);

      expect(result).not.toHaveProperty('template');
    });
  });
});
