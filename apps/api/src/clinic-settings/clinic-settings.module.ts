import { Module } from '@nestjs/common';
import { AuthenticatedGuard } from '../common/auth/authenticated.guard';
import { RolesGuard } from '../common/auth/roles.guard';
import { ClinicSettingsController } from './clinic-settings.controller';
import { ClinicSettingsService } from './clinic-settings.service';

@Module({
  controllers: [ClinicSettingsController],
  providers: [ClinicSettingsService, RolesGuard, AuthenticatedGuard],
})
export class ClinicSettingsModule {}
