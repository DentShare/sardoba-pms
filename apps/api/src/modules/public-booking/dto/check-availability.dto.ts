import { IsDateString } from 'class-validator';

export class CheckAvailabilityDto {
  @IsDateString()
  check_in!: string;

  @IsDateString()
  check_out!: string;
}
