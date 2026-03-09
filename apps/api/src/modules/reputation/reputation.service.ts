import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SardobaException, ErrorCode } from '@sardoba/shared';
import { ReviewScore, type ReviewPlatform } from '@/database/entities/review-score.entity';
import { UpsertScoreDto } from './dto/upsert-score.dto';

export interface ReputationOverview {
  scores: {
    id: number;
    platform: string;
    score: number;
    review_count: number;
    fetched_at: string;
  }[];
  average_score: number;
}

@Injectable()
export class ReputationService {
  private readonly logger = new Logger(ReputationService.name);

  constructor(
    @InjectRepository(ReviewScore)
    private readonly reviewScoreRepository: Repository<ReviewScore>,
  ) {}

  // ── getOverview ─────────────────────────────────────────────────────────────

  /**
   * Returns all review scores for the property, grouped by platform,
   * with a weighted average across platforms.
   */
  async getOverview(propertyId: number): Promise<ReputationOverview> {
    const scores = await this.reviewScoreRepository.find({
      where: { propertyId },
      order: { platform: 'ASC' },
    });

    // Calculate weighted average: sum(score * reviewCount) / sum(reviewCount)
    let totalWeightedScore = 0;
    let totalReviews = 0;

    for (const s of scores) {
      const count = Number(s.reviewCount) || 0;
      totalWeightedScore += Number(s.score) * count;
      totalReviews += count;
    }

    const averageScore =
      totalReviews > 0
        ? Math.round((totalWeightedScore / totalReviews) * 10) / 10
        : 0;

    return {
      scores: scores.map((s) => ({
        id: s.id,
        platform: s.platform,
        score: Number(s.score),
        review_count: Number(s.reviewCount),
        fetched_at: s.fetchedAt.toISOString(),
      })),
      average_score: averageScore,
    };
  }

  // ── upsertScore ─────────────────────────────────────────────────────────────

  /**
   * Create or update a review score for a specific platform.
   * Uses find + save pattern for upsert by (propertyId, platform) unique pair.
   */
  async upsertScore(
    propertyId: number,
    dto: UpsertScoreDto,
  ): Promise<Record<string, unknown>> {
    let reviewScore = await this.reviewScoreRepository.findOne({
      where: {
        propertyId,
        platform: dto.platform as ReviewPlatform,
      },
    });

    if (reviewScore) {
      // Update existing
      reviewScore.score = dto.score;
      if (dto.reviewCount !== undefined) {
        reviewScore.reviewCount = dto.reviewCount;
      }
      reviewScore.fetchedAt = new Date();
    } else {
      // Create new
      reviewScore = this.reviewScoreRepository.create({
        propertyId,
        platform: dto.platform as ReviewPlatform,
        score: dto.score,
        reviewCount: dto.reviewCount ?? 0,
        fetchedAt: new Date(),
      });
    }

    const saved = await this.reviewScoreRepository.save(reviewScore);
    this.logger.log(
      `Review score upserted: ${dto.platform} = ${dto.score} for property ${propertyId}`,
    );

    return this.toResponseFormat(saved);
  }

  // ── removeScore ─────────────────────────────────────────────────────────────

  /**
   * Delete a review score entry by ID, scoped to property.
   */
  async removeScore(propertyId: number, id: number): Promise<void> {
    const score = await this.reviewScoreRepository.findOne({
      where: { id, propertyId },
    });

    if (!score) {
      throw new SardobaException(
        ErrorCode.NOT_FOUND,
        { resource: 'review_score', id },
        'Review score not found',
      );
    }

    await this.reviewScoreRepository.remove(score);
    this.logger.log(
      `Review score removed: ${score.platform} (${id}) for property ${propertyId}`,
    );
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private toResponseFormat(score: ReviewScore): Record<string, unknown> {
    return {
      id: score.id,
      property_id: score.propertyId,
      platform: score.platform,
      score: Number(score.score),
      review_count: Number(score.reviewCount),
      fetched_at: score.fetchedAt.toISOString(),
      created_at: score.createdAt,
      updated_at: score.updatedAt,
    };
  }
}
