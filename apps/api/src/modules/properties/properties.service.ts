import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SardobaException, ErrorCode } from '@sardoba/shared';
import { Property } from '@/database/entities/property.entity';
import { Room } from '@/database/entities/room.entity';
import { UpdateFloorPlansDto } from './dto/update-floor-plans.dto';

@Injectable()
export class PropertiesService {
  constructor(
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
  ) {}

  async findOne(id: number): Promise<Record<string, unknown>> {
    const property = await this.propertyRepository.findOne({
      where: { id },
    });

    if (!property) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'property',
        id,
      });
    }

    return this.toResponseFormat(property);
  }

  async update(
    id: number,
    dto: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const property = await this.propertyRepository.findOne({
      where: { id },
    });

    if (!property) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'property',
        id,
      });
    }

    // Map snake_case DTO to camelCase entity
    if (dto.name !== undefined) property.name = dto.name as string;
    if (dto.city !== undefined) property.city = dto.city as string;
    if (dto.address !== undefined) property.address = dto.address as string;
    if (dto.phone !== undefined) property.phone = dto.phone as string;
    if (dto.currency !== undefined) property.currency = dto.currency as string;
    if (dto.timezone !== undefined) property.timezone = dto.timezone as string;
    if (dto.locale !== undefined) property.locale = dto.locale as string;
    if (dto.check_in_time !== undefined) property.checkinTime = dto.check_in_time as string;
    if (dto.check_out_time !== undefined) property.checkoutTime = dto.check_out_time as string;
    if (dto.slug !== undefined) property.slug = dto.slug as string;
    if (dto.description !== undefined) property.description = dto.description as string | null;
    if (dto.description_uz !== undefined) property.descriptionUz = dto.description_uz as string | null;
    if (dto.cover_photo !== undefined) property.coverPhoto = dto.cover_photo as string | null;
    if (dto.photos !== undefined) property.photos = dto.photos as string[];
    if (dto.booking_enabled !== undefined) property.bookingEnabled = dto.booking_enabled as boolean;

    const saved = await this.propertyRepository.save(property);
    return this.toResponseFormat(saved);
  }

  async getBookingPage(propertyId: number): Promise<Record<string, unknown>> {
    const property = await this.propertyRepository.findOne({
      where: { id: propertyId },
    });

    if (!property) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'property',
        id: propertyId,
      });
    }

    return {
      property_name: property.name,
      booking_enabled: property.bookingEnabled,
      slug: property.slug || '',
      description: property.description,
      cover_photo: property.coverPhoto,
      photos: property.photos || [],
    };
  }

  async updateBookingPage(
    propertyId: number,
    dto: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const property = await this.propertyRepository.findOne({
      where: { id: propertyId },
    });

    if (!property) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'property',
        id: propertyId,
      });
    }

    if (dto.booking_enabled !== undefined) property.bookingEnabled = dto.booking_enabled as boolean;
    if (dto.slug !== undefined) property.slug = dto.slug as string;
    if (dto.description !== undefined) property.description = dto.description as string | null;

    const saved = await this.propertyRepository.save(property);

    return {
      property_name: saved.name,
      booking_enabled: saved.bookingEnabled,
      slug: saved.slug || '',
      description: saved.description,
      cover_photo: saved.coverPhoto,
      photos: saved.photos || [],
    };
  }

  // ── Floor Plans ────────────────────────────────────────────────────────────

  async getFloorPlans(propertyId: number): Promise<Record<string, unknown>> {
    const property = await this.propertyRepository.findOne({
      where: { id: propertyId },
    });

    if (!property) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'property',
        id: propertyId,
      });
    }

    const settings = property.settings as Record<string, unknown>;
    return (settings?.floor_plans as Record<string, unknown>) ?? { version: 1, floors: [] };
  }

  async updateFloorPlans(
    propertyId: number,
    dto: UpdateFloorPlansDto,
  ): Promise<Record<string, unknown>> {
    const property = await this.propertyRepository.findOne({
      where: { id: propertyId },
    });

    if (!property) {
      throw new SardobaException(ErrorCode.NOT_FOUND, {
        resource: 'property',
        id: propertyId,
      });
    }

    // Validate room_ids belong to this property
    const roomIds = dto.floors
      .flatMap((f) => f.cells)
      .filter((c) => c.type === 'room' && c.room_id)
      .map((c) => c.room_id!);

    if (roomIds.length > 0) {
      const uniqueIds = [...new Set(roomIds)];
      const existingCount = await this.roomRepository.count({
        where: { propertyId, id: In(uniqueIds) },
      });

      if (existingCount !== uniqueIds.length) {
        throw new SardobaException(ErrorCode.VALIDATION_ERROR, {
          reason: 'One or more room_ids do not belong to this property',
        });
      }
    }

    // Merge into existing settings
    const settings = { ...(property.settings || {}), floor_plans: dto };
    property.settings = settings;

    const saved = await this.propertyRepository.save(property);
    return (saved.settings as Record<string, unknown>).floor_plans as Record<string, unknown>;
  }

  // ── Photo management ─────────────────────────────────────────────────────

  async addPhoto(
    propertyId: number,
    url: string,
    type: 'cover' | 'gallery',
  ): Promise<void> {
    const property = await this.propertyRepository.findOne({ where: { id: propertyId } });
    if (!property) {
      throw new SardobaException(ErrorCode.NOT_FOUND, { resource: 'property', id: propertyId });
    }

    if (type === 'cover') {
      property.coverPhoto = url;
    } else {
      property.photos = [...(property.photos || []), url];
    }

    await this.propertyRepository.save(property);
  }

  async removePhoto(
    propertyId: number,
    url: string,
    type: 'cover' | 'gallery',
  ): Promise<void> {
    const property = await this.propertyRepository.findOne({ where: { id: propertyId } });
    if (!property) {
      throw new SardobaException(ErrorCode.NOT_FOUND, { resource: 'property', id: propertyId });
    }

    if (type === 'cover') {
      property.coverPhoto = null;
    } else {
      property.photos = (property.photos || []).filter((p) => p !== url);
    }

    await this.propertyRepository.save(property);
  }

  private toResponseFormat(property: Property): Record<string, unknown> {
    return {
      id: property.id,
      name: property.name,
      slug: property.slug,
      city: property.city,
      address: property.address,
      phone: property.phone,
      description: property.description,
      description_uz: property.descriptionUz,
      check_in_time: property.checkinTime,
      check_out_time: property.checkoutTime,
      currency: property.currency,
      timezone: property.timezone,
      locale: property.locale,
      cover_photo: property.coverPhoto,
      photos: property.photos,
      booking_enabled: property.bookingEnabled,
      settings: property.settings,
      created_at: property.createdAt,
      updated_at: property.updatedAt,
    };
  }
}
