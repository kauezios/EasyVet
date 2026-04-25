import { IsOptional, Matches } from 'class-validator';

export class AppointmentsWeeklyTrendQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateTo?: string;

  @IsOptional()
  @Matches(/^\d{1,2}$/)
  weeks?: string;
}
