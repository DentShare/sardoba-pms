import { IsArray, IsString, ArrayMinSize, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddTagsDto {
  @ApiProperty({
    example: ['VIP', 'corporate', 'returning'],
    description: 'Tags to add to the guest',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags!: string[];
}
