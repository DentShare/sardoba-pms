import { IsString, IsInt, IsOptional, Min } from 'class-validator';

export class PublicValidatePromoDto {
  @IsString()
  code!: string;

  @IsInt()
  @Min(0)
  booking_amount!: number; // tiyin

  @IsOptional()
  @IsInt()
  @Min(1)
  nights?: number;

  @IsOptional()
  @IsInt()
  room_id?: number;
}
