import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { RequestWithAuthUser } from '../common/auth/request-auth-user.type';
import { Roles } from '../common/auth/roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import { UserRole } from '../common/auth/user-role.enum';
import { FinalizeMedicalRecordDto } from './dto/finalize-medical-record.dto';
import { SaveMedicalRecordDraftDto } from './dto/save-medical-record-draft.dto';
import { MedicalRecordsService } from './medical-records.service';

@Controller('appointments')
export class MedicalRecordsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  @Post(':appointmentId/medical-record/start')
  start(@Param('appointmentId') appointmentId: string) {
    return this.medicalRecordsService.start(appointmentId);
  }

  @Get(':appointmentId/medical-record')
  findByAppointment(@Param('appointmentId') appointmentId: string) {
    return this.medicalRecordsService.findByAppointment(appointmentId);
  }

  @Put(':appointmentId/medical-record/draft')
  saveDraft(
    @Param('appointmentId') appointmentId: string,
    @Body() dto: SaveMedicalRecordDraftDto,
  ) {
    return this.medicalRecordsService.saveDraft(appointmentId, dto);
  }

  @Put(':appointmentId/medical-record/finalize')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.VETERINARIAN)
  finalize(
    @Param('appointmentId') appointmentId: string,
    @Body() dto: FinalizeMedicalRecordDto,
    @Req() req: RequestWithAuthUser,
  ) {
    return this.medicalRecordsService.finalize(
      appointmentId,
      dto,
      req.authUser?.userId,
    );
  }
}
