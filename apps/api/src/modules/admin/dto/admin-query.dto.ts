import { IsOptional, IsString, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  perPage?: number = 20;
}

export class AdminPropertiesQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  city?: string;
}

export class AdminBookingsQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  propertyId?: number;
}

export class AdminUsersQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class AdminLogsQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsString()
  service?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  propertyId?: number;

  @IsOptional()
  @IsString()
  search?: string;
}

export class UpdatePropertyStatusDto {
  @IsEnum(['active', 'suspended', 'inactive'])
  status!: string;
}

export class UpdateUserStatusDto {
  @IsEnum(['active', 'blocked'])
  status!: string;
}
