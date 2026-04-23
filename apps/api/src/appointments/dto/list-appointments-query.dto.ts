import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class ListAppointmentsQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  veterinarianName?: string;
}
