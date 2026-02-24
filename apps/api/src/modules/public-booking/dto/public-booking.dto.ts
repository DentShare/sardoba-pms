import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsEmail,
  IsDateString,
  IsArray,
  Min,
  Matches,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ExtraSelectionDto {
  @IsInt()
  extra_id!: number;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class PublicBookingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  first_name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  last_name!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\+998\d{9}$/, {
    message: 'phone must be a valid Uzbekistan number in format +998XXXXXXXXX',
  })
  phone!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsInt()
  room_id!: number;

  @IsDateString()
  check_in!: string;

  @IsDateString()
  check_out!: string;

  @IsInt()
  @Min(1)
  adults!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  children?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtraSelectionDto)
  extras?: ExtraSelectionDto[];
}
