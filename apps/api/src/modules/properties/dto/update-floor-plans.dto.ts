import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

const CELL_TYPES = [
  'empty', 'room', 'stairs', 'elevator', 'corridor',
  'reception', 'wall', 'restroom', 'storage', 'other',
] as const;

const COMPASS_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

class FloorPlanCellDto {
  @IsInt() @Min(0) @Max(49)
  row!: number;

  @IsInt() @Min(0) @Max(49)
  col!: number;

  @IsEnum(CELL_TYPES)
  type!: string;

  @IsOptional() @IsInt()
  room_id?: number;

  @IsOptional() @IsString()
  label?: string;

  @IsOptional() @IsInt() @Min(1) @Max(10)
  col_span?: number;

  @IsOptional() @IsInt() @Min(1) @Max(10)
  row_span?: number;
}

class FloorPlanDto {
  @IsInt()
  floor!: number;

  @IsString()
  name!: string;

  @IsInt() @Min(1) @Max(50)
  rows!: number;

  @IsInt() @Min(1) @Max(50)
  cols!: number;

  @IsEnum(COMPASS_DIRECTIONS)
  compass!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FloorPlanCellDto)
  @ArrayMaxSize(2500)
  cells!: FloorPlanCellDto[];

  @IsOptional() @IsString()
  updated_at?: string;
}

export class UpdateFloorPlansDto {
  @IsInt()
  version!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FloorPlanDto)
  @ArrayMaxSize(20)
  floors!: FloorPlanDto[];
}
