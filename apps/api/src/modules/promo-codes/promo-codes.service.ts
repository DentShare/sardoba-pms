import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SardobaException, ErrorCode } from '@sardoba/shared';
import { PromoCode } from '@/database/entities/promo-code.entity';
import { Booking } from '@/database/entities/booking.entity';
import { CreatePromoCodeDto } from './dto/create-promo-code.dto';
import { UpdatePromoCodeDto } from './dto/update-promo-code.dto';
import { ValidatePromoCodeDto } from './dto/validate-promo-code.dto';

export interface PromoValidationResult {
  valid: boolean;
  discount: number;
  discountType: string;
  message?: string;
}

@Injectable()
export class PromoCodesService {
  private readonly logger = new Logger(PromoCodesService.name);

  constructor(
    @InjectRepository(PromoCode)
    private readonly promoCodeRepository: Repository<PromoCode>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
  ) {}

  // ── findAll ──────────────────────────────────────────────────────────────

  /**
   * List all promo codes for a property, ordered by creation date.
   */
  async findAll(propertyId: number) {
    const promoCodes = await this.promoCodeRepository.find({
      where: { propertyId },
      order: { createdAt: 'DESC' },
    });

    return {
      data: promoCodes.map((pc) => this.toResponseFormat(pc)),
    };
  }

  // ── findOne ──────────────────────────────────────────────────────────────

  /**
   * Get a single promo code by ID, scoped to property.
   */
  async findOne(propertyId: number, id: number) {
    const promoCode = await this.promoCodeRepository.findOne({
      where: { id, propertyId },
    });

    if (!promoCode) {
      throw new SardobaException(
        ErrorCode.NOT_FOUND,
        { resource: 'promo_code', id },
        'Promo code not found',
      );
    }

    return this.toResponseFormat(promoCode);
  }

  // ── create ───────────────────────────────────────────────────────────────

  /**
   * Create a new promo code for a property.
   * Code is normalized to uppercase and trimmed.
   */
  async create(propertyId: number, dto: CreatePromoCodeDto) {
    const normalizedCode = dto.code.trim().toUpperCase();

    // Check for duplicate code within the same property
    const existing = await this.promoCodeRepository.findOne({
      where: { propertyId, code: normalizedCode },
    });

    if (existing) {
      throw new SardobaException(
        ErrorCode.ALREADY_EXISTS,
        { code: normalizedCode },
        `Promo code "${normalizedCode}" already exists for this property`,
      );
    }

    const promoCode = this.promoCodeRepository.create({
      propertyId,
      code: normalizedCode,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      maxUses: dto.maxUses ?? null,
      minNights: dto.minNights ?? 1,
      minAmount: dto.minAmount ?? 0,
      appliesToRooms: dto.appliesToRooms ?? [],
      validFrom: dto.validFrom ?? null,
      validTo: dto.validTo ?? null,
      isActive: dto.isActive ?? true,
    });

    const saved = await this.promoCodeRepository.save(promoCode);
    this.logger.log(
      `Promo code created: ${saved.code} (${saved.id}) for property ${propertyId}`,
    );

    return this.toResponseFormat(saved);
  }

  // ── update ───────────────────────────────────────────────────────────────

  /**
   * Update an existing promo code.
   */
  async update(propertyId: number, id: number, dto: UpdatePromoCodeDto) {
    const promoCode = await this.promoCodeRepository.findOne({
      where: { id, propertyId },
    });

    if (!promoCode) {
      throw new SardobaException(
        ErrorCode.NOT_FOUND,
        { resource: 'promo_code', id },
        'Promo code not found',
      );
    }

    if (dto.code !== undefined) {
      const normalizedCode = dto.code.trim().toUpperCase();

      // Check for duplicate if code is being changed
      if (normalizedCode !== promoCode.code) {
        const existing = await this.promoCodeRepository.findOne({
          where: { propertyId, code: normalizedCode },
        });

        if (existing) {
          throw new SardobaException(
            ErrorCode.ALREADY_EXISTS,
            { code: normalizedCode },
            `Promo code "${normalizedCode}" already exists for this property`,
          );
        }
      }

      promoCode.code = normalizedCode;
    }

    if (dto.discountType !== undefined) promoCode.discountType = dto.discountType;
    if (dto.discountValue !== undefined) promoCode.discountValue = dto.discountValue;
    if (dto.maxUses !== undefined) promoCode.maxUses = dto.maxUses ?? null;
    if (dto.minNights !== undefined) promoCode.minNights = dto.minNights;
    if (dto.minAmount !== undefined) promoCode.minAmount = dto.minAmount;
    if (dto.appliesToRooms !== undefined) promoCode.appliesToRooms = dto.appliesToRooms;
    if (dto.validFrom !== undefined) promoCode.validFrom = dto.validFrom ?? null;
    if (dto.validTo !== undefined) promoCode.validTo = dto.validTo ?? null;
    if (dto.isActive !== undefined) promoCode.isActive = dto.isActive;

    const saved = await this.promoCodeRepository.save(promoCode);
    this.logger.log(`Promo code updated: ${saved.code} (${saved.id})`);

    return this.toResponseFormat(saved);
  }

  // ── remove ───────────────────────────────────────────────────────────────

  /**
   * Delete a promo code. Soft-deletes by setting is_active = false
   * to preserve booking references.
   */
  async remove(propertyId: number, id: number): Promise<void> {
    const promoCode = await this.promoCodeRepository.findOne({
      where: { id, propertyId },
    });

    if (!promoCode) {
      throw new SardobaException(
        ErrorCode.NOT_FOUND,
        { resource: 'promo_code', id },
        'Promo code not found',
      );
    }

    promoCode.isActive = false;
    await this.promoCodeRepository.save(promoCode);
    this.logger.log(`Promo code deactivated: ${promoCode.code} (${promoCode.id})`);
  }

  // ── validate ─────────────────────────────────────────────────────────────

  /**
   * Validate a promo code and calculate the discount amount.
   * Checks: existence, active status, date validity, max uses,
   * minimum nights, minimum amount, room applicability.
   */
  async validate(
    propertyId: number,
    dto: ValidatePromoCodeDto,
  ): Promise<PromoValidationResult> {
    const normalizedCode = dto.code.trim().toUpperCase();

    const promoCode = await this.promoCodeRepository.findOne({
      where: { propertyId, code: normalizedCode },
    });

    // Code does not exist
    if (!promoCode) {
      return {
        valid: false,
        discount: 0,
        discountType: 'percent',
        message: 'Promo code not found',
      };
    }

    // Code is not active
    if (!promoCode.isActive) {
      return {
        valid: false,
        discount: 0,
        discountType: promoCode.discountType,
        message: 'Promo code is not active',
      };
    }

    // Check valid dates
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    if (promoCode.validFrom && today < promoCode.validFrom) {
      return {
        valid: false,
        discount: 0,
        discountType: promoCode.discountType,
        message: 'Promo code is not yet valid',
      };
    }

    if (promoCode.validTo && today > promoCode.validTo) {
      return {
        valid: false,
        discount: 0,
        discountType: promoCode.discountType,
        message: 'Promo code has expired',
      };
    }

    // Check max uses
    if (promoCode.maxUses !== null && promoCode.usedCount >= promoCode.maxUses) {
      return {
        valid: false,
        discount: 0,
        discountType: promoCode.discountType,
        message: 'Promo code has reached maximum number of uses',
      };
    }

    // Check minimum nights
    if (dto.nights !== undefined && dto.nights < promoCode.minNights) {
      return {
        valid: false,
        discount: 0,
        discountType: promoCode.discountType,
        message: `Minimum ${promoCode.minNights} nights required for this promo code`,
      };
    }

    // Check minimum amount
    if (dto.bookingAmount < Number(promoCode.minAmount)) {
      return {
        valid: false,
        discount: 0,
        discountType: promoCode.discountType,
        message: 'Booking amount does not meet the minimum requirement',
      };
    }

    // Check room applicability
    if (
      dto.roomId !== undefined &&
      promoCode.appliesToRooms.length > 0 &&
      !promoCode.appliesToRooms.includes(dto.roomId)
    ) {
      return {
        valid: false,
        discount: 0,
        discountType: promoCode.discountType,
        message: 'Promo code does not apply to the selected room',
      };
    }

    // Calculate discount
    let discount: number;
    if (promoCode.discountType === 'percent') {
      discount = Math.round(dto.bookingAmount * Number(promoCode.discountValue) / 100);
    } else {
      discount = Number(promoCode.discountValue);
    }

    // Discount should not exceed booking amount
    if (discount > dto.bookingAmount) {
      discount = dto.bookingAmount;
    }

    return {
      valid: true,
      discount,
      discountType: promoCode.discountType,
    };
  }

  // ── incrementUsage ───────────────────────────────────────────────────────

  /**
   * Increment the used_count by 1 when a promo code is applied to a booking.
   */
  async incrementUsage(promoCodeId: number): Promise<void> {
    await this.promoCodeRepository.increment({ id: promoCodeId }, 'usedCount', 1);
    this.logger.log(`Promo code usage incremented: id=${promoCodeId}`);
  }

  // ── getStats ─────────────────────────────────────────────────────────────

  /**
   * Get usage statistics for a promo code.
   * Returns used count and total discount amount from bookings.
   */
  async getStats(
    propertyId: number,
    id: number,
  ): Promise<{ used_count: number; total_discount: number }> {
    const promoCode = await this.promoCodeRepository.findOne({
      where: { id, propertyId },
    });

    if (!promoCode) {
      throw new SardobaException(
        ErrorCode.NOT_FOUND,
        { resource: 'promo_code', id },
        'Promo code not found',
      );
    }

    // Aggregate total discount from bookings using this promo code
    const result = await this.bookingRepository
      .createQueryBuilder('b')
      .select('COALESCE(SUM(b.discount_amount), 0)', 'total_discount')
      .where('b.promo_code_id = :promoCodeId', { promoCodeId: id })
      .getRawOne();

    return {
      used_count: promoCode.usedCount,
      total_discount: Number(result?.total_discount ?? 0),
    };
  }

  // ── findByCode ───────────────────────────────────────────────────────────

  /**
   * Find a promo code by its code string, scoped to property.
   * Used internally by public booking service.
   */
  async findByCode(propertyId: number, code: string): Promise<PromoCode | null> {
    const normalizedCode = code.trim().toUpperCase();
    return this.promoCodeRepository.findOne({
      where: { propertyId, code: normalizedCode },
    });
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private toResponseFormat(promoCode: PromoCode): Record<string, unknown> {
    return {
      id: promoCode.id,
      property_id: promoCode.propertyId,
      code: promoCode.code,
      discount_type: promoCode.discountType,
      discount_value: Number(promoCode.discountValue),
      max_uses: promoCode.maxUses,
      used_count: promoCode.usedCount,
      min_nights: promoCode.minNights,
      min_amount: Number(promoCode.minAmount),
      applies_to_rooms: promoCode.appliesToRooms,
      valid_from: promoCode.validFrom,
      valid_to: promoCode.validTo,
      is_active: promoCode.isActive,
      created_at: promoCode.createdAt,
      updated_at: promoCode.updatedAt,
    };
  }
}
