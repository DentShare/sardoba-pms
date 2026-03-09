import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SardobaException, ErrorCode } from '@sardoba/shared';
import { Guest } from '@/database/entities/guest.entity';
import { Booking } from '@/database/entities/booking.entity';
import { CacheService } from '@/modules/cache/cache.service';
import { AiService } from './ai.service';

export interface GuestTipsResponse {
  guest_id: number;
  visit_count: number;
  total_spent: number;
  last_visit: string | null;
  tips: string[];
  birthday: string | null; // MM-DD
  days_until_birthday: number | null;
  preferred_room_type: string | null;
  tags: string[];
}

@Injectable()
export class GuestTipsService {
  private readonly logger = new Logger(GuestTipsService.name);

  constructor(
    private readonly aiService: AiService,
    @InjectRepository(Guest)
    private readonly guestRepo: Repository<Guest>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Get AI-generated tips for a guest based on their profile and booking history.
   * Falls back to rule-based tips if AI is unavailable.
   */
  async getTips(propertyId: number, guestId: number): Promise<GuestTipsResponse> {
    const cacheKey = `guest_tips:${guestId}`;

    // 1. Check cache first
    const cached = await this.cacheService.get<GuestTipsResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    // 2. Load guest data
    const guest = await this.guestRepo.findOne({
      where: { id: guestId, propertyId },
    });

    if (!guest) {
      throw new SardobaException(
        ErrorCode.GUEST_NOT_FOUND,
        { id: guestId, property_id: propertyId },
        'Guest not found',
      );
    }

    // 3. Load booking history (last 10)
    const bookings = await this.bookingRepo.find({
      where: { guestId, propertyId },
      relations: ['room'],
      order: { checkIn: 'DESC' },
      take: 10,
    });

    // 4. If AI not configured, return basic tips without AI
    if (!this.aiService.isConfigured) {
      const result = this.generateBasicTips(guest, bookings);
      await this.cacheService.set(cacheKey, result, 3600); // 1 hour TTL
      return result;
    }

    // 5. Build guest data summary for AI
    const guestData = {
      name: `${guest.firstName} ${guest.lastName}`,
      visitCount: guest.visitCount,
      totalSpent: Number(guest.totalRevenue),
      isVip: guest.isVip,
      tags: guest.tags,
      notes: guest.notes,
      nationality: guest.nationality,
      dateOfBirth: guest.dateOfBirth,
      isBlacklisted: guest.isBlacklisted,
      bookingHistory: bookings.map((b) => ({
        room: b.room?.name ?? null,
        roomType: b.room?.roomType ?? null,
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        nights: b.nights,
        adults: b.adults,
        children: b.children,
        amount: Number(b.totalAmount),
        source: b.source,
        notes: b.notes,
      })),
    };

    // 6. Call Claude API
    const systemPrompt = `Ты помощник администратора отеля. На основе данных о госте составь краткий список из 3–5 важных подсказок для персонала на русском языке.
Каждая подсказка — одна строка, начинается с emoji.
Только факты из данных, без выдуманных деталей.
Верни ТОЛЬКО JSON массив строк, без дополнительного текста.
Пример: ["🔄 Постоянный гость — 5-й визит", "⭐ VIP-гость, требует повышенного внимания"]`;

    try {
      const aiResponse = await this.aiService.sendMessage({
        system: systemPrompt,
        userMessage: JSON.stringify(guestData),
        maxTokens: 512,
      });

      // Parse JSON response, strip markdown code blocks if present
      let cleaned = aiResponse.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }

      const tips = JSON.parse(cleaned);

      const result: GuestTipsResponse = {
        guest_id: guestId,
        visit_count: guest.visitCount,
        total_spent: Number(guest.totalRevenue),
        last_visit: bookings[0]?.checkOut || null,
        tips: Array.isArray(tips) ? tips : [],
        birthday: guest.dateOfBirth ? guest.dateOfBirth.slice(5) : null,
        days_until_birthday: this.daysUntilBirthday(guest.dateOfBirth),
        preferred_room_type: this.getMostFrequentRoomType(bookings),
        tags: guest.tags ?? [],
      };

      // Cache for 1 hour
      await this.cacheService.set(cacheKey, result, 3600);

      return result;
    } catch (error) {
      // Fallback to basic tips if AI fails
      this.logger.warn(`AI tips failed for guest ${guestId}, using fallback: ${error}`);
      const result = this.generateBasicTips(guest, bookings);
      await this.cacheService.set(cacheKey, result, 3600);
      return result;
    }
  }

  /**
   * Generate rule-based tips without AI.
   * Used as fallback when AI is unavailable or fails.
   */
  private generateBasicTips(guest: Guest, bookings: Booking[]): GuestTipsResponse {
    const tips: string[] = [];

    if (guest.isBlacklisted) {
      tips.push('⚠️ Гость в чёрном списке!');
    }

    if (guest.isVip) {
      tips.push('⭐ VIP-гость — повышенное внимание');
    }

    if (guest.visitCount > 1) {
      tips.push(`🔄 Постоянный гость — ${guest.visitCount}-й визит`);
    }

    if (guest.dateOfBirth) {
      const days = this.daysUntilBirthday(guest.dateOfBirth);
      if (days !== null && days >= 0 && days <= 7) {
        if (days === 0) {
          tips.push('🎂 Сегодня день рождения!');
        } else {
          tips.push(`🎂 День рождения через ${days} дн.!`);
        }
      }
    }

    if (bookings.length > 0 && bookings[0].children > 0) {
      tips.push('👨‍👩‍👧 Приезжает с детьми');
    }

    if (guest.notes) {
      tips.push(`📝 Заметка: ${guest.notes.slice(0, 100)}`);
    }

    const preferredType = this.getMostFrequentRoomType(bookings);
    if (preferredType) {
      const typeNames: Record<string, string> = {
        single: 'одноместный',
        double: 'двухместный',
        family: 'семейный',
        suite: 'люкс',
        dorm: 'общий',
      };
      tips.push(`🏨 Предпочитает ${typeNames[preferredType] ?? preferredType} номер`);
    }

    if (Number(guest.totalRevenue) > 0) {
      const formatted = (Number(guest.totalRevenue) / 100).toLocaleString('ru-RU');
      tips.push(`💰 Общий доход: ${formatted} сум`);
    }

    return {
      guest_id: guest.id,
      visit_count: guest.visitCount,
      total_spent: Number(guest.totalRevenue),
      last_visit: bookings[0]?.checkOut || null,
      tips,
      birthday: guest.dateOfBirth ? guest.dateOfBirth.slice(5) : null,
      days_until_birthday: this.daysUntilBirthday(guest.dateOfBirth),
      preferred_room_type: this.getMostFrequentRoomType(bookings),
      tags: guest.tags ?? [],
    };
  }

  /**
   * Calculate days until the guest's next birthday.
   * Returns null if dateOfBirth is not set.
   */
  private daysUntilBirthday(dateOfBirth: string | null): number | null {
    if (!dateOfBirth) return null;

    try {
      const today = new Date();
      const [, month, day] = dateOfBirth.split('-').map(Number);

      // Next birthday this year
      const birthdayThisYear = new Date(today.getFullYear(), month - 1, day);

      // If birthday has passed this year, look at next year
      if (birthdayThisYear < today) {
        birthdayThisYear.setFullYear(today.getFullYear() + 1);
      }

      const diffMs = birthdayThisYear.getTime() - today.getTime();
      return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    } catch {
      return null;
    }
  }

  /**
   * Determine the most frequently booked room type from booking history.
   */
  private getMostFrequentRoomType(bookings: Booking[]): string | null {
    if (bookings.length === 0) return null;

    const counts: Record<string, number> = {};
    for (const booking of bookings) {
      const roomType = booking.room?.roomType;
      if (roomType) {
        counts[roomType] = (counts[roomType] || 0) + 1;
      }
    }

    const entries = Object.entries(counts);
    if (entries.length === 0) return null;

    entries.sort((a, b) => b[1] - a[1]);
    return entries[0][0];
  }
}
