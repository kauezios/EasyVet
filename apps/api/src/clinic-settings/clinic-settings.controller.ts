import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AuthenticatedGuard } from '../common/auth/authenticated.guard';
import { Roles } from '../common/auth/roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import { UserRole } from '../common/auth/user-role.enum';
import { UpdateClinicScheduleSettingsDto } from './dto/update-clinic-schedule-settings.dto';
import { ClinicSettingsService } from './clinic-settings.service';

@Controller('clinic-settings')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.VETERINARIAN, UserRole.RECEPTION)
export class ClinicSettingsController {
  constructor(private readonly clinicSettingsService: ClinicSettingsService) {}

  @Get('schedule')
  getSchedule() {
    return this.clinicSettingsService.getSchedule();
  }

  @Patch('schedule')
  updateSchedule(@Body() dto: UpdateClinicScheduleSettingsDto) {
    return this.clinicSettingsService.updateSchedule(dto);
  }
}
