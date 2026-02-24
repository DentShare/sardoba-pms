import {
  IsInt,
  IsDateString,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ExtraSelectionDto } from './public-booking.dto';

export class CalculatePriceDto {
  @IsInt()
  room_id!: number;

  @IsDateString()
  check_in!: string;

  @IsDateString()
  check_out!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  adults?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtraSelectionDto)
  extras?: ExtraSelectionDto[];
}
