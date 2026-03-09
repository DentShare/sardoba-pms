import { ApiProperty } from '@nestjs/swagger';

/**
 * Response type for flexibility options (early check-in / late check-out).
 * Not a validation DTO -- used only for Swagger documentation.
 */
export class FlexibilityOptionsResponse {
  @ApiProperty({
    description: 'Whether early check-in is available (no conflicting booking on the room the previous day)',
  })
  early_checkin_available!: boolean;

  @ApiProperty({
    description: 'Whether late check-out is available (no conflicting booking on the room the next day)',
  })
  late_checkout_available!: boolean;

  @ApiProperty({
    description: 'If early check-in is unavailable, the conflicting booking ID',
    nullable: true,
  })
  early_checkin_conflict_booking_id!: number | null;

  @ApiProperty({
    description: 'If late check-out is unavailable, the conflicting booking ID',
    nullable: true,
  })
  late_checkout_conflict_booking_id!: number | null;

  @ApiProperty({
    description: 'Current early check-in time if already set',
    nullable: true,
    example: '10:00',
  })
  current_early_checkin_time!: string | null;

  @ApiProperty({
    description: 'Current early check-in price if already set (tiyin)',
    example: 0,
  })
  current_early_checkin_price!: number;

  @ApiProperty({
    description: 'Current late check-out time if already set',
    nullable: true,
    example: '18:00',
  })
  current_late_checkout_time!: string | null;

  @ApiProperty({
    description: 'Current late check-out price if already set (tiyin)',
    example: 0,
  })
  current_late_checkout_price!: number;
}
