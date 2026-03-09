import {
  IsString,
  IsBoolean,
  IsOptional,
  IsInt,
  IsNumber,
  IsObject,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRuleDto {
  @ApiProperty({ example: 'Высокий сезон' })
  @IsString()
  name!: string;

  @ApiProperty({ enum: ['occupancy_high', 'occupancy_low', 'days_before', 'day_of_week'] })
  @IsString()
  trigger_type!: string;

  @ApiProperty({ example: { threshold: 80, period_days: 7 } })
  @IsObject()
  trigger_config!: Record<string, number | number[]>;

  @ApiProperty({ enum: ['increase_percent', 'decrease_percent', 'set_fixed'] })
  @IsString()
  action_type!: string;

  @ApiProperty({ example: 20 })
  @IsNumber()
  action_value!: number;

  @ApiPropertyOptional({ default: 'all' })
  @IsOptional()
  @IsString()
  apply_to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  room_ids?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  min_price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  max_price?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  priority?: number;
}
