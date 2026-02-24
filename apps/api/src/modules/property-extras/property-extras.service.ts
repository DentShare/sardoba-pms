import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SardobaException, ErrorCode } from '@sardoba/shared';
import { PropertyExtra } from '@/database/entities/property-extra.entity';
import { CreateExtraDto } from './dto/create-extra.dto';
import { UpdateExtraDto } from './dto/update-extra.dto';

@Injectable()
export class PropertyExtrasService {
  private readonly logger = new Logger(PropertyExtrasService.name);

  constructor(
    @InjectRepository(PropertyExtra)
    private readonly extraRepository: Repository<PropertyExtra>,
  ) {}

  // ── findAll ──────────────────────────────────────────────────────────────

  /**
   * List all extras for a property, ordered by sort_order.
   */
  async findAll(propertyId: number) {
    const extras = await this.extraRepository.find({
      where: { propertyId },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });

    return {
      data: extras.map((extra) => this.toResponseFormat(extra)),
    };
  }

  // ── findOne ──────────────────────────────────────────────────────────────

  /**
   * Get a single extra by ID, scoped to property.
   */
  async findOne(id: number, propertyId: number) {
    const extra = await this.extraRepository.findOne({
      where: { id, propertyId },
    });

    if (!extra) {
      throw new SardobaException(
        ErrorCode.NOT_FOUND,
        { resource: 'property_extra', id },
        'Extra service not found',
      );
    }

    return this.toResponseFormat(extra);
  }

  // ── create ───────────────────────────────────────────────────────────────

  /**
   * Create a new extra service for a property.
   */
  async create(propertyId: number, dto: CreateExtraDto) {
    const extra = this.extraRepository.create({
      propertyId,
      name: dto.name,
      nameUz: dto.name_uz ?? null,
      description: dto.description ?? null,
      price: dto.price,
      priceType: dto.price_type ?? 'per_booking',
      icon: dto.icon ?? null,
      isActive: dto.is_active ?? true,
      sortOrder: dto.sort_order ?? 0,
    });

    const saved = await this.extraRepository.save(extra);
    this.logger.log(`Extra created: ${saved.name} (${saved.id}) for property ${propertyId}`);

    return this.toResponseFormat(saved);
  }

  // ── update ───────────────────────────────────────────────────────────────

  /**
   * Update an existing extra service.
   */
  async update(id: number, propertyId: number, dto: UpdateExtraDto) {
    const extra = await this.extraRepository.findOne({
      where: { id, propertyId },
    });

    if (!extra) {
      throw new SardobaException(
        ErrorCode.NOT_FOUND,
        { resource: 'property_extra', id },
        'Extra service not found',
      );
    }

    if (dto.name !== undefined) extra.name = dto.name;
    if (dto.name_uz !== undefined) extra.nameUz = dto.name_uz ?? null;
    if (dto.description !== undefined) extra.description = dto.description ?? null;
    if (dto.price !== undefined) extra.price = dto.price;
    if (dto.price_type !== undefined) extra.priceType = dto.price_type;
    if (dto.icon !== undefined) extra.icon = dto.icon ?? null;
    if (dto.is_active !== undefined) extra.isActive = dto.is_active;
    if (dto.sort_order !== undefined) extra.sortOrder = dto.sort_order;

    const saved = await this.extraRepository.save(extra);
    this.logger.log(`Extra updated: ${saved.name} (${saved.id})`);

    return this.toResponseFormat(saved);
  }

  // ── remove ───────────────────────────────────────────────────────────────

  /**
   * Soft-delete an extra by setting is_active = false.
   * Does not physically remove to preserve booking_extras references.
   */
  async remove(id: number, propertyId: number): Promise<void> {
    const extra = await this.extraRepository.findOne({
      where: { id, propertyId },
    });

    if (!extra) {
      throw new SardobaException(
        ErrorCode.NOT_FOUND,
        { resource: 'property_extra', id },
        'Extra service not found',
      );
    }

    extra.isActive = false;
    await this.extraRepository.save(extra);
    this.logger.log(`Extra deactivated: ${extra.name} (${extra.id})`);
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private toResponseFormat(extra: PropertyExtra): Record<string, unknown> {
    return {
      id: extra.id,
      property_id: extra.propertyId,
      name: extra.name,
      name_uz: extra.nameUz,
      description: extra.description,
      price: Number(extra.price),
      price_type: extra.priceType,
      icon: extra.icon,
      is_active: extra.isActive,
      sort_order: extra.sortOrder,
      created_at: extra.createdAt,
      updated_at: extra.updatedAt,
    };
  }
}
