import { api } from '@/lib/api';

export interface ReviewScore {
  id: number;
  propertyId: number;
  platform: string;
  score: number;
  reviewCount: number;
  fetchedAt: string;
}

export interface ReputationOverview {
  scores: ReviewScore[];
  averageScore: number;
  totalReviews: number;
}

export interface UpsertScoreDto {
  platform: string;
  score: number;
  review_count: number;
}

export async function getReputation(propertyId: number): Promise<ReputationOverview> {
  const { data } = await api.get<ReputationOverview>('/reputation', {
    params: { property_id: propertyId },
  });
  return data;
}

export async function upsertScore(dto: UpsertScoreDto): Promise<ReviewScore> {
  const { data } = await api.post<ReviewScore>('/reputation/scores', dto);
  return data;
}

export async function deleteScore(id: number): Promise<void> {
  await api.delete(`/reputation/scores/${id}`);
}
