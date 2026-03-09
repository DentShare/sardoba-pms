import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { SardobaException, ErrorCode } from '@sardoba/shared';
import { Referral } from '@/database/entities/referral.entity';
import { Guest } from '@/database/entities/guest.entity';
import { Property } from '@/database/entities/property.entity';
import { CreateReferralDto } from './dto/create-referral.dto';
import { randomBytes } from 'crypto';

export interface ReferralStats {
  total_referrals: number;
  applied_bonuses: number;
  total_bonus_value: number;
}

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  constructor(
    @InjectRepository(Referral)
    private readonly referralRepository: Repository<Referral>,
    @InjectRepository(Guest)
    private readonly guestRepository: Repository<Guest>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    private readonly configService: ConfigService,
  ) {}

  // ── generateCode ────────────────────────────────────────────────────────────

  /**
   * Generate a unique referral code for a guest.
   * Code format: REF-{propertyId}-{random6chars}
   * Link format: https://app.sardoba.uz/book/{slug}?ref={code}
   */
  async generateCode(
    propertyId: number,
    guestId: number,
  ): Promise<{ code: string; link: string }> {
    // Verify guest belongs to property
    const guest = await this.guestRepository.findOne({
      where: { id: guestId, propertyId },
    });

    if (!guest) {
      throw new SardobaException(
        ErrorCode.NOT_FOUND,
        { resource: 'guest', id: guestId },
        'Guest not found for this property',
      );
    }

    // Check if guest already has a referral code
    const existingReferral = await this.referralRepository.findOne({
      where: { propertyId, referrerGuestId: guestId },
    });

    if (existingReferral) {
      // Return existing code instead of creating a duplicate
      const link = await this.buildReferralLink(propertyId, existingReferral.referralCode);
      return { code: existingReferral.referralCode, link };
    }

    // Generate unique code
    const randomChars = randomBytes(3).toString('hex').toUpperCase();
    const code = `REF-${propertyId}-${randomChars}`;

    // Create a referral record with just the referrer (no referred guest yet)
    const referral = this.referralRepository.create({
      propertyId,
      referrerGuestId: guestId,
      referralCode: code,
      bonusType: 'discount',
      bonusValue: 0,
    });

    await this.referralRepository.save(referral);
    const link = await this.buildReferralLink(propertyId, code);

    this.logger.log(
      `Referral code generated: ${code} for guest ${guestId} at property ${propertyId}`,
    );

    return { code, link };
  }

  // ── findByCode ──────────────────────────────────────────────────────────────

  /**
   * Find a referral by its code.
   */
  async findByCode(code: string): Promise<Referral | null> {
    return this.referralRepository.findOne({
      where: { referralCode: code },
      relations: ['referrerGuest', 'referredGuest', 'referredBooking'],
    });
  }

  // ── getGuestReferrals ───────────────────────────────────────────────────────

  /**
   * List all referrals made by a specific guest.
   */
  async getGuestReferrals(
    propertyId: number,
    guestId: number,
  ): Promise<Record<string, unknown>[]> {
    const referrals = await this.referralRepository.find({
      where: { propertyId, referrerGuestId: guestId },
      relations: ['referredGuest'],
      order: { createdAt: 'DESC' },
    });

    return referrals.map((r) => this.toResponseFormat(r));
  }

  // ── getPropertyReferrals ────────────────────────────────────────────────────

  /**
   * List all referrals for a property.
   */
  async getPropertyReferrals(
    propertyId: number,
  ): Promise<{ data: Record<string, unknown>[] }> {
    const referrals = await this.referralRepository.find({
      where: { propertyId },
      relations: ['referrerGuest', 'referredGuest'],
      order: { createdAt: 'DESC' },
    });

    return {
      data: referrals.map((r) => this.toResponseFormat(r)),
    };
  }

  // ── createReferral ──────────────────────────────────────────────────────────

  /**
   * Create a new referral record when a referred guest books.
   */
  async createReferral(
    propertyId: number,
    dto: CreateReferralDto,
  ): Promise<Record<string, unknown>> {
    // Verify the referral code exists
    const existingCode = await this.referralRepository.findOne({
      where: { propertyId, referralCode: dto.referralCode },
    });

    if (!existingCode) {
      throw new SardobaException(
        ErrorCode.NOT_FOUND,
        { resource: 'referral_code', code: dto.referralCode },
        'Referral code not found for this property',
      );
    }

    // Verify referrer guest exists
    const referrerGuest = await this.guestRepository.findOne({
      where: { id: dto.referrerGuestId, propertyId },
    });

    if (!referrerGuest) {
      throw new SardobaException(
        ErrorCode.NOT_FOUND,
        { resource: 'guest', id: dto.referrerGuestId },
        'Referrer guest not found for this property',
      );
    }

    const referral = this.referralRepository.create({
      propertyId,
      referrerGuestId: dto.referrerGuestId,
      referredGuestId: dto.referredGuestId ?? null,
      referralCode: dto.referralCode,
      referredBookingId: dto.referredBookingId ?? null,
      bonusType: dto.bonusType ?? 'discount',
      bonusValue: dto.bonusValue ?? 0,
    });

    const saved = await this.referralRepository.save(referral);
    this.logger.log(
      `Referral created: code=${dto.referralCode}, referrer=${dto.referrerGuestId} for property ${propertyId}`,
    );

    return this.toResponseFormat(saved);
  }

  // ── applyBonus ──────────────────────────────────────────────────────────────

  /**
   * Mark a referral bonus as applied.
   */
  async applyBonus(
    propertyId: number,
    referralId: number,
  ): Promise<Record<string, unknown>> {
    const referral = await this.referralRepository.findOne({
      where: { id: referralId, propertyId },
    });

    if (!referral) {
      throw new SardobaException(
        ErrorCode.NOT_FOUND,
        { resource: 'referral', id: referralId },
        'Referral not found',
      );
    }

    if (referral.bonusApplied) {
      throw new SardobaException(
        ErrorCode.ALREADY_EXISTS,
        { referralId },
        'Bonus has already been applied for this referral',
      );
    }

    referral.bonusApplied = true;
    referral.bonusAppliedAt = new Date();

    const saved = await this.referralRepository.save(referral);
    this.logger.log(
      `Referral bonus applied: id=${referralId} for property ${propertyId}`,
    );

    return this.toResponseFormat(saved);
  }

  // ── getStats ────────────────────────────────────────────────────────────────

  /**
   * Aggregate referral statistics for a property.
   */
  async getStats(propertyId: number): Promise<ReferralStats> {
    const result = await this.referralRepository
      .createQueryBuilder('r')
      .select('COUNT(*)::int', 'total_referrals')
      .addSelect(
        'COUNT(*) FILTER (WHERE r.bonus_applied = true)::int',
        'applied_bonuses',
      )
      .addSelect(
        'COALESCE(SUM(r.bonus_value) FILTER (WHERE r.bonus_applied = true), 0)::bigint',
        'total_bonus_value',
      )
      .where('r.property_id = :propertyId', { propertyId })
      .getRawOne();

    return {
      total_referrals: Number(result?.total_referrals ?? 0),
      applied_bonuses: Number(result?.applied_bonuses ?? 0),
      total_bonus_value: Number(result?.total_bonus_value ?? 0),
    };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Build a referral link using the property slug and referral code.
   */
  private async buildReferralLink(
    propertyId: number,
    code: string,
  ): Promise<string> {
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'https://app.sardoba.uz',
    );

    const property = await this.propertyRepository.findOne({
      where: { id: propertyId },
      select: ['id', 'slug'],
    });

    const slug = property?.slug ?? String(propertyId);
    return `${frontendUrl}/book/${slug}?ref=${code}`;
  }

  private toResponseFormat(referral: Referral): Record<string, unknown> {
    return {
      id: referral.id,
      property_id: referral.propertyId,
      referrer_guest_id: referral.referrerGuestId,
      referred_guest_id: referral.referredGuestId,
      referral_code: referral.referralCode,
      referred_booking_id: referral.referredBookingId,
      bonus_type: referral.bonusType,
      bonus_value: Number(referral.bonusValue),
      bonus_applied: referral.bonusApplied,
      bonus_applied_at: referral.bonusAppliedAt,
      created_at: referral.createdAt,
      referrer_guest: referral.referrerGuest
        ? {
            id: referral.referrerGuest.id,
            first_name: referral.referrerGuest.firstName,
            last_name: referral.referrerGuest.lastName,
            phone: referral.referrerGuest.phone,
          }
        : undefined,
      referred_guest: referral.referredGuest
        ? {
            id: referral.referredGuest.id,
            first_name: referral.referredGuest.firstName,
            last_name: referral.referredGuest.lastName,
            phone: referral.referredGuest.phone,
          }
        : undefined,
    };
  }
}
