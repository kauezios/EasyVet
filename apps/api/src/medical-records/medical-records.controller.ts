import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { MedicalRecordsService } from './medical-records.service';
import { SaveMedicalRecordDraftDto } from './dto/save-medical-record-draft.dto';
import { FinalizeMedicalRecordDto } from './dto/finalize-medical-record.dto';

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
  finalize(
    @Param('appointmentId') appointmentId: string,
    @Body() dto: FinalizeMedicalRecordDto,
  ) {
    return this.medicalRecordsService.finalize(appointmentId, dto);
  }
}
