import {
  IsBoolean,
  IsOptional,
  IsArray,
  IsString,
  ValidateNested,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * DTO for a single Telegram recipient entry.
 */
export class TelegramRecipientDto {
  @ApiPropertyOptional({ example: 'Администратор' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: '123456789' })
  @IsString()
  @MaxLength(50)
  chat_id!: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  is_active!: boolean;
}

/**
 * DTO for updating notification settings.
 */
export class UpdateNotificationSettingsDto {
  @ApiPropertyOptional({
    type: [TelegramRecipientDto],
    description: 'List of Telegram recipients',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TelegramRecipientDto)
  telegram_recipients?: TelegramRecipientDto[];

  @ApiPropertyOptional({ example: true, description: 'Notify on new bookings' })
  @IsOptional()
  @IsBoolean()
  event_new_booking?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Notify on cancellations' })
  @IsOptional()
  @IsBoolean()
  event_cancellation?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Send daily digest' })
  @IsOptional()
  @IsBoolean()
  event_daily_digest?: boolean;

  @ApiPropertyOptional({
    example: '08:00',
    description: 'Daily digest time in HH:MM format (Tashkent timezone)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'daily_digest_time must be in HH:MM format',
  })
  daily_digest_time?: string;

  @ApiPropertyOptional({ example: true, description: 'Notify on payments received' })
  @IsOptional()
  @IsBoolean()
  event_payment?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Notify on sync errors' })
  @IsOptional()
  @IsBoolean()
  event_sync_error?: boolean;
}
