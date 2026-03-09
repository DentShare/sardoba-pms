import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SardobaException, ErrorCode } from '@sardoba/shared';
import { Property } from '@/database/entities/property.entity';
import { WidgetEvent } from '@/database/entities/widget-event.entity';

@Injectable()
export class MiniSiteSettingsService {
  private readonly logger = new Logger(MiniSiteSettingsService.name);

  constructor(
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @InjectRepository(WidgetEvent)
    private readonly widgetEventRepository: Repository<WidgetEvent>,
  ) {}

  async getSettings(propertyId: number) {
    const property = await this.propertyRepository.findOne({
      where: { id: propertyId },
    });
    if (!property) {
      throw new SardobaException(ErrorCode.NOT_FOUND, { resource: 'property', id: propertyId });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'https://app.sardoba.uz';
    const widgetUrl = process.env.WIDGET_URL || 'https://widget.sardoba.uz';

    return {
      slug: property.slug,
      booking_enabled: property.bookingEnabled,
      widget_enabled: property.widgetEnabled,
      mini_site_enabled: property.miniSiteEnabled,
      mini_site_config: property.miniSiteConfig,
      mini_site_url: property.slug ? `${frontendUrl}/book/${property.slug}` : null,
      embed_code: property.slug
        ? `<script>\nwindow.SardobaWidget = { slug: '${property.slug}', lang: 'ru' };\n</script>\n<script src="${widgetUrl}/embed.js" async></script>`
        : null,
    };
  }

  async updateSettings(
    propertyId: number,
    dto: {
      widget_enabled?: boolean;
      mini_site_enabled?: boolean;
      mini_site_config?: Record<string, unknown>;
    },
  ) {
    const property = await this.propertyRepository.findOne({
      where: { id: propertyId },
    });
    if (!property) {
      throw new SardobaException(ErrorCode.NOT_FOUND, { resource: 'property', id: propertyId });
    }

    if (dto.widget_enabled !== undefined) property.widgetEnabled = dto.widget_enabled;
    if (dto.mini_site_enabled !== undefined) property.miniSiteEnabled = dto.mini_site_enabled;
    if (dto.mini_site_config !== undefined) {
      property.miniSiteConfig = { ...property.miniSiteConfig, ...dto.mini_site_config };
    }

    await this.propertyRepository.save(property);

    return this.getSettings(propertyId);
  }

  async updateSlug(propertyId: number, slug: string) {
    const normalized = slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (normalized.length < 3 || normalized.length > 100) {
      throw new SardobaException(
        ErrorCode.VALIDATION_ERROR,
        { slug: normalized },
        'Slug must be between 3 and 100 characters',
      );
    }

    const existing = await this.propertyRepository.findOne({
      where: { slug: normalized },
    });
    if (existing && existing.id !== propertyId) {
      throw new SardobaException(
        ErrorCode.ALREADY_EXISTS,
        { slug: normalized },
        'This slug is already taken',
      );
    }

    await this.propertyRepository.update(propertyId, { slug: normalized });

    return { slug: normalized };
  }

  async getStats(propertyId: number) {
    const totalViews = await this.widgetEventRepository.count({
      where: { propertyId, eventType: 'page_view' },
    });
    const totalSearches = await this.widgetEventRepository.count({
      where: { propertyId, eventType: 'search' },
    });
    const totalBookingsStarted = await this.widgetEventRepository.count({
      where: { propertyId, eventType: 'booking_started' },
    });
    const totalBookingsCompleted = await this.widgetEventRepository.count({
      where: { propertyId, eventType: 'booking_completed' },
    });

    return {
      total_views: totalViews,
      total_searches: totalSearches,
      total_bookings_started: totalBookingsStarted,
      total_bookings_completed: totalBookingsCompleted,
      conversion_rate:
        totalViews > 0
          ? Math.round((totalBookingsCompleted / totalViews) * 10000) / 100
          : 0,
    };
  }

  async trackEvent(
    propertyId: number,
    eventType: string,
    meta: Record<string, unknown> = {},
    ipHash?: string,
    roomId?: number,
  ) {
    const event = this.widgetEventRepository.create({
      propertyId,
      eventType,
      meta,
      ipHash: ipHash ?? null,
      roomId: roomId ?? null,
    });
    await this.widgetEventRepository.save(event);
  }
}
