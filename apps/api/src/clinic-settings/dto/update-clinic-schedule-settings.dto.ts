import { IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

const HH_MM_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class UpdateClinicScheduleSettingsDto {
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(180)
  consultationDurationMinutes?: number;

  @IsOptional()
  @Matches(HH_MM_PATTERN)
  openingTime?: string;

  @IsOptional()
  @Matches(HH_MM_PATTERN)
  closingTime?: string;
}
