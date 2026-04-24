import { IsBoolean, IsOptional } from 'class-validator';

export class RunInactivityScanDto {
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
